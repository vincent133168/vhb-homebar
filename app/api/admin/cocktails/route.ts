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
  type UpdatePayload = {
    id?: string; price?: number; name?: string; englishName?: string; bar?: string; city?: string;
    sourceUrl?: string; story?: string; taste?: string; strength?: string; minutes?: number;
    ingredients?: string[]; measures?: string[]; steps?: string[];
  };
  let payload:UpdatePayload;
  let imageFile:File|null=null;
  if ((request.headers.get("content-type")||"").includes("multipart/form-data")) {
    const form=await request.formData();
    const parseList=(name:string)=>{try{const value=JSON.parse(String(form.get(name)||"[]"));return Array.isArray(value)?value.map(String):[];}catch{return [];}};
    payload={
      id:String(form.get("id")||""),price:Number(form.get("price")),name:String(form.get("name")||""),
      englishName:String(form.get("englishName")||""),bar:String(form.get("bar")||""),city:String(form.get("city")||""),
      sourceUrl:String(form.get("sourceUrl")||""),story:String(form.get("story")||""),taste:String(form.get("taste")||""),
      strength:String(form.get("strength")||""),minutes:Number(form.get("minutes")),ingredients:parseList("ingredients"),
      measures:parseList("measures"),steps:parseList("steps"),
    };
    const candidate=form.get("image");
    if(candidate instanceof File&&candidate.size>0) imageFile=candidate;
  } else {
    payload=await request.json() as UpdatePayload;
  }
  const price = Math.round(Number(payload.price));
  if (!payload.id || !Number.isFinite(price) || price < 0 || price > 9999) return Response.json({ error: "请输入有效金额" }, { status: 400 });
  await ensureCatalog();
  const { DB,UPLOADS } = getBindings();

  if (payload.name === undefined) {
    await DB.prepare("UPDATE cocktails SET price = ? WHERE id = ?").bind(price,payload.id).run();
    return Response.json({ ok:true, price });
  }

  const cleanText = (value: unknown, fallback = "") => String(value ?? fallback).trim();
  const cleanList = (value: unknown) => Array.isArray(value) ? value.map((item) => cleanText(item)).filter(Boolean) : [];
  const name = cleanText(payload.name);
  const englishName = cleanText(payload.englishName);
  const bar = cleanText(payload.bar, "VHB 原创");
  const city = cleanText(payload.city, "深圳");
  const sourceUrl = cleanText(payload.sourceUrl) || null;
  const story = cleanText(payload.story);
  const taste = cleanText(payload.taste, "待探索");
  const strength = cleanText(payload.strength, "中等");
  const minutes = Math.round(Number(payload.minutes));
  const ingredients = cleanList(payload.ingredients);
  const measures = cleanList(payload.measures);
  const steps = cleanList(payload.steps);

  if (!name) return Response.json({ error: "请输入中文酒名" }, { status: 400 });
  if (!ingredients.length) return Response.json({ error: "请至少保留一种材料" }, { status: 400 });
  if (measures.length !== ingredients.length) return Response.json({ error: "每种材料都需要填写对应用量" }, { status: 400 });
  if (!steps.length) return Response.json({ error: "请至少填写一个制作步骤" }, { status: 400 });
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 120) return Response.json({ error: "制作时间需为 1–120 分钟" }, { status: 400 });
  if ([name,englishName,bar,city,taste,strength].some((value) => value.length > 120) || story.length > 1200) {
    return Response.json({ error: "部分文字过长，请精简后保存" }, { status: 400 });
  }
  if ([...ingredients,...measures,...steps].some((value) => value.length > 500)) {
    return Response.json({ error: "单项配方内容过长，请精简后保存" }, { status: 400 });
  }

  const current=await DB.prepare("SELECT id,image_key FROM cocktails WHERE id = ?").bind(payload.id).first<{id:string;image_key:string|null}>();
  if (!current) return Response.json({ error: "配方不存在或已被删除" }, { status: 404 });
  let imageKey=current.image_key;
  let uploadedKey:string|null=null;
  if(imageFile){
    if(imageFile.size>6*1024*1024) return Response.json({error:"图片不能超过 6MB"},{status:400});
    if(!imageFile.type.startsWith("image/")) return Response.json({error:"请上传图片文件"},{status:400});
    const extension=imageFile.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g,"")||"jpg";
    uploadedKey=`cocktail-${payload.id}-${Date.now()}.${extension}`;
    await UPLOADS.put(uploadedKey,imageFile.stream(),{httpMetadata:{contentType:imageFile.type}});
    imageKey=uploadedKey;
  }

  try{
    await DB.prepare(`UPDATE cocktails SET
      name = ?, english_name = ?, bar = ?, city = ?, source_url = ?, story = ?,
      ingredients = ?, recipe = ?, measure_count = ?, taste = ?, strength = ?, minutes = ?, price = ?, image_key = ?
      WHERE id = ?`).bind(
        name, englishName, bar, city, sourceUrl, story,
        JSON.stringify(ingredients), JSON.stringify([...measures,...steps]), measures.length, taste, strength, minutes, price, imageKey, payload.id,
      ).run();
  }catch(error){
    if(uploadedKey) await UPLOADS.delete(uploadedKey).catch(()=>undefined);
    throw error;
  }
  if(uploadedKey&&current.image_key&&current.image_key!==uploadedKey) await UPLOADS.delete(current.image_key).catch(()=>undefined);
  const updated = await DB.prepare("SELECT * FROM cocktails WHERE id = ?").bind(payload.id).first<CocktailRow>();
  if (!updated) return Response.json({ error: "配方不存在或已被删除" }, { status: 404 });
  return Response.json({ ok:true, cocktail:presentCocktail(updated) });
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
