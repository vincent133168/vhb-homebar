import { getAdminSessionFromRequest } from "../../../admin-auth";
import { CocktailRow, presentCocktail } from "../../../../db/cocktail-presenter";
import { ensureCatalog, getBindings } from "../../../../db/runtime";

function safeList(value: string | undefined) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  if (!await getAdminSessionFromRequest(request)) return Response.json({ error: "无权访问" }, { status: 403 });
  await ensureCatalog();
  const rows = await getBindings().DB.prepare("SELECT * FROM cocktails ORDER BY category, name").all<CocktailRow>();
  return Response.json({ cocktails: rows.results.map(presentCocktail) });
}

export async function PATCH(request: Request) {
  if (!await getAdminSessionFromRequest(request)) return Response.json({ error: "无权访问" }, { status: 403 });
  const payload = await request.json() as { id?: string; price?: number };
  const price = Math.round(Number(payload.price));
  if (!payload.id || !Number.isFinite(price) || price < 0 || price > 9999) return Response.json({ error: "请输入有效金额" }, { status: 400 });
  await ensureCatalog();
  await getBindings().DB.prepare("UPDATE cocktails SET price = ? WHERE id = ?").bind(price,payload.id).run();
  return Response.json({ ok:true, price });
}

export async function DELETE(request: Request) {
  if (!await getAdminSessionFromRequest(request)) return Response.json({ error: "无权访问" }, { status: 403 });
  await ensureCatalog();
  const payload = await request.json() as { id?: string };
  const id = String(payload.id || "").trim();
  if (!id) return Response.json({ error: "请选择要删除的配方" }, { status: 400 });

  const { DB, UPLOADS } = getBindings();
  const cocktail = await DB.prepare("SELECT id,name,category,image_key FROM cocktails WHERE id = ?").bind(id).first<{ id:string;name:string;category:string;image_key:string|null }>();
  if (!cocktail) return Response.json({ error: "配方不存在或已被删除" }, { status: 404 });

  const [deletedSetting, menuSetting, featuredSetting] = await Promise.all([
    DB.prepare("SELECT value FROM settings WHERE key = 'deleted_cocktail_ids'").first<{ value:string }>(),
    DB.prepare("SELECT value FROM settings WHERE key = 'today_menu_ids'").first<{ value:string }>(),
    DB.prepare("SELECT value FROM settings WHERE key = 'today_featured_ids'").first<{ value:string }>(),
  ]);
  const now = Date.now();
  const menuIds = safeList(menuSetting?.value).filter((menuId) => menuId !== id);
  const featuredIds = safeList(featuredSetting?.value).filter((featuredId) => featuredId !== id);
  const statements = [
    DB.prepare("DELETE FROM cocktails WHERE id = ?").bind(id),
    DB.prepare(`INSERT INTO settings (key,value,updated_at) VALUES ('today_menu_ids',?,?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).bind(JSON.stringify(menuIds), now),
    DB.prepare(`INSERT INTO settings (key,value,updated_at) VALUES ('today_featured_ids',?,?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).bind(JSON.stringify(featuredIds), now),
  ];
  if (cocktail.category === "classic" || cocktail.category === "topbar") {
    const deletedIds = [...new Set([...safeList(deletedSetting?.value), id])];
    statements.push(DB.prepare(`INSERT INTO settings (key,value,updated_at) VALUES ('deleted_cocktail_ids',?,?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).bind(JSON.stringify(deletedIds), now));
  }
  await DB.batch(statements);
  if (cocktail.image_key) await UPLOADS.delete(cocktail.image_key).catch(() => undefined);
  return Response.json({ ok:true, id, name:cocktail.name });
}
