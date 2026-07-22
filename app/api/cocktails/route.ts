import { ensureCatalog, getBindings } from "../../../db/runtime";
import { CocktailRow, presentCocktail } from "../../../db/cocktail-presenter";
import { getAdminSessionFromRequest } from "../../admin-auth";

export async function GET() {
  try {
    await ensureCatalog();
    const { DB } = getBindings();
    const result = await DB.prepare("SELECT * FROM cocktails ORDER BY created_at DESC LIMIT 200").all<CocktailRow>();
    return Response.json({ cocktails: result.results.map(presentCocktail) });
  } catch {
    return Response.json({ cocktails: [] });
  }
}

export async function POST(request: Request) {
  try {
    if (!await getAdminSessionFromRequest(request)) return Response.json({ error: "无权访问" }, { status: 403 });
    await ensureCatalog();
    const form = await request.formData();
    const name = String(form.get("name") || "").trim();
    const ingredientText = String(form.get("ingredients") || "").trim();
    const recipeText = String(form.get("recipe") || "").trim();
    if (!name || !ingredientText || !recipeText) return Response.json({ error: "名称、材料和配方不能为空" }, { status: 400 });

    const id = crypto.randomUUID();
    const file = form.get("image");
    let imageKey: string | null = null;
    const { DB, UPLOADS } = getBindings();
    if (file instanceof File && file.size > 0) {
      if (file.size > 6 * 1024 * 1024) return Response.json({ error: "图片不能超过 6MB" }, { status: 400 });
      if (!file.type.startsWith("image/")) return Response.json({ error: "请上传图片文件" }, { status: 400 });
      const extension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
      imageKey = `cocktail-${id}.${extension}`;
      await UPLOADS.put(imageKey, file.stream(), { httpMetadata: { contentType: file.type } });
    }

    const ingredients = ingredientText.split(/[、,，\n]/).map((item) => item.trim()).filter(Boolean);
    const recipe = recipeText.split(/\n/).map((item) => item.trim()).filter(Boolean);
    const row = {
      id, name,
      englishName: String(form.get("englishName") || ""),
      bar: String(form.get("bar") || "HOME/BAR 原创"),
      city: String(form.get("city") || "深圳"),
      story: "由深夜客厅的朋友上传，等你来讲这杯酒背后的故事。",
      ingredients, recipe,
      taste: String(form.get("taste") || "待探索"), strength: "中等", minutes: 4,
      image: imageKey ? `/api/images/${encodeURIComponent(imageKey)}` : "/cocktails/classic-negroni.jpg",
      price: 0, custom: true,
    };
    await DB.prepare(`INSERT INTO cocktails (id,name,english_name,bar,city,category,rank,source_url,story,ingredients,recipe,taste,strength,minutes,image_key,price,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,row.name,row.englishName,row.bar,row.city,"homebar",null,null,row.story,JSON.stringify(ingredients),JSON.stringify(recipe),row.taste,row.strength,row.minutes,imageKey,row.price,Date.now()).run();
    return Response.json({ cocktail: row }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "上传失败" }, { status: 500 });
  }
}
