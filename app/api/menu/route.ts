import { CocktailRow, presentCocktail } from "../../../db/cocktail-presenter";
import { ensureCatalog, getBindings } from "../../../db/runtime";

export async function GET() {
  try {
    await ensureCatalog();
    const { DB } = getBindings();
    const settings = await DB.prepare("SELECT key,value,updated_at FROM settings WHERE key IN ('today_menu_ids','today_featured_ids')").all<{ key:string;value:string;updated_at:number }>();
    const byKey = Object.fromEntries(settings.results.map((item) => [item.key,item]));
    const setting = byKey.today_menu_ids;
    const ids = JSON.parse(setting?.value || "[]") as string[];
    const featuredIds = (JSON.parse(byKey.today_featured_ids?.value || "[]") as string[]).filter((id) => ids.includes(id));
    if (!ids.length) return Response.json({ cocktails: [], featuredIds:[], publishedAt: setting?.updated_at || 0 });
    const placeholders = ids.map(() => "?").join(",");
    const rows = await DB.prepare(`SELECT * FROM cocktails WHERE id IN (${placeholders})`).bind(...ids).all<CocktailRow>();
    const byId = new Map(rows.results.map((row) => [row.id, row]));
    return Response.json({ cocktails: ids.map((id) => byId.get(id)).filter((row): row is CocktailRow => Boolean(row)).map(presentCocktail), featuredIds, publishedAt: setting?.updated_at || 0 });
  } catch {
    return Response.json({ cocktails: [], featuredIds:[], publishedAt: 0 });
  }
}
