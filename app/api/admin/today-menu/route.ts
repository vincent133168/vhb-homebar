import { getAdminSessionFromRequest } from "../../../admin-auth";
import { CocktailRow, presentCocktail } from "../../../../db/cocktail-presenter";
import { ensureCatalog, getBindings } from "../../../../db/runtime";

type SettingRow = { key: string; value: string; updated_at: number };

const ingredientAliasGroups = [
  ["柠檬", "柠檬汁", "鲜柠檬汁", "黄柠檬", "黄柠檬汁"],
  ["青柠", "青柠汁", "鲜青柠汁", "莱姆", "莱姆汁"],
  ["糖浆", "简单糖浆", "单糖浆", "蔗糖糖浆"],
  ["苏打水", "气泡水", "梳打水"],
  ["蜂蜜", "蜂蜜糖浆"],
  ["淡奶油", "鲜奶油", "奶油"],
  ["椰浆", "椰奶"],
  ["橙味利口酒", "橙皮酒", "白橙皮酒", "君度", "柑橘利口酒"],
  ["苦精", "安格斯图拉苦精"],
  ["金酒", "琴酒"],
  ["朗姆", "朗姆酒"],
] as const;

const ingredientAliases = new Map<string, string>();
ingredientAliasGroups.forEach(([canonical, ...aliases]) => {
  [canonical, ...aliases].forEach((name) => ingredientAliases.set(name.toLowerCase(), canonical));
});

function normalizeIngredient(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "");
  return ingredientAliases.get(normalized) || normalized;
}

function safeList(value: string | undefined) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function rankedMatches(rows: CocktailRow[], ingredients: string[]) {
  const available = new Set(ingredients.map(normalizeIngredient));
  return rows.map((row) => {
    const cocktail = presentCocktail(row);
    const missing = cocktail.ingredients.filter((item) => !available.has(normalizeIngredient(item)));
    const matchedCount = cocktail.ingredients.length - missing.length;
    return { ...cocktail, missing, matchedCount, score: cocktail.ingredients.length ? matchedCount / cocktail.ingredients.length : 0, ready: missing.length === 0 };
  }).sort((a, b) => Number(b.ready) - Number(a.ready) || a.missing.length - b.missing.length || b.score - a.score || a.name.localeCompare(b.name, "zh-CN"));
}

async function readState() {
  const { DB } = getBindings();
  const [cocktailResult, settingResult] = await Promise.all([
    DB.prepare("SELECT * FROM cocktails ORDER BY category, name").all<CocktailRow>(),
    DB.prepare("SELECT key,value,updated_at FROM settings WHERE key IN ('today_ingredients','custom_ingredients','today_menu_ids','today_featured_ids','today_menu_published_at')").all<SettingRow>(),
  ]);
  const settings = Object.fromEntries(settingResult.results.map((row) => [row.key, row]));
  const ingredients = safeList(settings.today_ingredients?.value);
  const customIngredients = safeList(settings.custom_ingredients?.value);
  const customOrder = new Map(customIngredients.map((name, index) => [name, index]));
  const publishedIds = safeList(settings.today_menu_ids?.value);
  const featuredIds = safeList(settings.today_featured_ids?.value).filter((id) => publishedIds.includes(id));
  const rows = cocktailResult.results;
  const byId = new Map(rows.map((row) => [row.id, row]));
  const published = publishedIds.map((id) => byId.get(id)).filter((row): row is CocktailRow => Boolean(row)).map(presentCocktail);
  const frequency = new Map<string, number>();
  rows.forEach((row) => safeList(row.ingredients).forEach((item) => frequency.set(item, (frequency.get(item) || 0) + 1)));
  customIngredients.forEach((item) => {
    if (!frequency.has(item)) frequency.set(item, 0);
  });
  ingredients.forEach((item) => {
    if (!frequency.has(item)) frequency.set(item, 0);
  });
  const ingredientOptions = [...frequency.entries()]
    .map(([name, count]) => ({ name, count, custom: customOrder.has(name) || count === 0 }))
    .sort((a, b) => Number(b.custom) - Number(a.custom)
      || (a.custom && b.custom ? (customOrder.get(b.name) ?? -1) - (customOrder.get(a.name) ?? -1) : 0)
      || b.count - a.count
      || a.name.localeCompare(b.name, "zh-CN"));
  return {
    ingredients,
    publishedIds,
    featuredIds,
    published,
    matches: ingredients.length ? rankedMatches(rows, ingredients) : [],
    ingredientOptions,
    publishedAt: Number(settings.today_menu_published_at?.value || 0),
  };
}

export async function GET(request: Request) {
  if (!await getAdminSessionFromRequest(request)) return Response.json({ error: "无权访问" }, { status: 403 });
  await ensureCatalog();
  return Response.json(await readState());
}

export async function PUT(request: Request) {
  if (!await getAdminSessionFromRequest(request)) return Response.json({ error: "无权访问" }, { status: 403 });
  await ensureCatalog();
  const payload = await request.json() as { action?: string; ingredient?: string; ingredients?: string[]; selectedIds?: string[] };
  const { DB } = getBindings();
  const now = Date.now();

  if (payload.action === "add-ingredient") {
    const ingredient = String(payload.ingredient || "").trim().slice(0, 60);
    if (!ingredient) return Response.json({ error: "请输入材料名称" }, { status: 400 });
    const [todayRow, customRow] = await Promise.all([
      DB.prepare("SELECT value FROM settings WHERE key = 'today_ingredients'").first<{ value: string }>(),
      DB.prepare("SELECT value FROM settings WHERE key = 'custom_ingredients'").first<{ value: string }>(),
    ]);
    const todayIngredients = [...new Set([...safeList(todayRow?.value), ingredient])].slice(0, 300);
    const customIngredients = [...safeList(customRow?.value).filter((item) => item !== ingredient), ingredient].slice(-1000);
    await DB.batch([
      DB.prepare(`INSERT INTO settings (key,value,updated_at) VALUES ('today_ingredients',?,?)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).bind(JSON.stringify(todayIngredients), now),
      DB.prepare(`INSERT INTO settings (key,value,updated_at) VALUES ('custom_ingredients',?,?)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).bind(JSON.stringify(customIngredients), now),
    ]);
    return Response.json(await readState());
  }

  if (payload.action === "delete-ingredient") {
    const ingredient = String(payload.ingredient || "").trim();
    if (!ingredient) return Response.json({ error: "请选择要删除的材料" }, { status: 400 });
    const [todayRow, customRow] = await Promise.all([
      DB.prepare("SELECT value FROM settings WHERE key = 'today_ingredients'").first<{ value: string }>(),
      DB.prepare("SELECT value FROM settings WHERE key = 'custom_ingredients'").first<{ value: string }>(),
    ]);
    const customIngredients = safeList(customRow?.value);
    if (!customIngredients.includes(ingredient)) return Response.json({ error: "配方库材料不能在这里删除" }, { status: 400 });
    const todayIngredients = safeList(todayRow?.value).filter((item) => item !== ingredient);
    const remainingCustomIngredients = customIngredients.filter((item) => item !== ingredient);
    await DB.batch([
      DB.prepare(`INSERT INTO settings (key,value,updated_at) VALUES ('today_ingredients',?,?)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).bind(JSON.stringify(todayIngredients), now),
      DB.prepare(`INSERT INTO settings (key,value,updated_at) VALUES ('custom_ingredients',?,?)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).bind(JSON.stringify(remainingCustomIngredients), now),
    ]);
    return Response.json(await readState());
  }

  if (payload.action === "match") {
    const ingredients = [...new Set((payload.ingredients || []).map((item) => String(item).trim()).filter(Boolean))].slice(0, 300);
    if (!ingredients.length) return Response.json({ error: "请至少选择一种今日材料" }, { status: 400 });
    await DB.prepare(`INSERT INTO settings (key,value,updated_at) VALUES ('today_ingredients',?,?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).bind(JSON.stringify(ingredients), now).run();
    return Response.json(await readState());
  }

  if (payload.action === "feature") {
    const requested = [...new Set((payload.selectedIds || []).map(String))].slice(0, 5);
    const menuSetting = await DB.prepare("SELECT value FROM settings WHERE key = 'today_menu_ids'").first<{ value:string }>();
    const publishedSet = new Set(safeList(menuSetting?.value));
    const featured = requested.filter((id) => publishedSet.has(id));
    await DB.prepare(`INSERT INTO settings (key,value,updated_at) VALUES ('today_featured_ids',?,?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).bind(JSON.stringify(featured), now).run();
    return Response.json(await readState());
  }

  if (payload.action === "publish") {
    const ids = [...new Set((payload.selectedIds || []).map(String))];
    if (!ids.length) return Response.json({ error: "请至少选择一款酒再发布" }, { status: 400 });
    const valid = await DB.prepare("SELECT id FROM cocktails").all<{ id: string }>();
    const validSet = new Set(valid.results.map((row) => row.id));
    const selected = ids.filter((id) => validSet.has(id));
    if (!selected.length) return Response.json({ error: "选择的酒单不存在" }, { status: 400 });
    const featuredSetting = await DB.prepare("SELECT value FROM settings WHERE key = 'today_featured_ids'").first<{ value:string }>();
    const preservedFeatured = safeList(featuredSetting?.value).filter((id) => selected.includes(id)).slice(0, 5);
    const featured = preservedFeatured.length ? preservedFeatured : selected.slice(0, 3);
    await DB.batch([
      DB.prepare(`INSERT INTO settings (key,value,updated_at) VALUES ('today_menu_ids',?,?)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).bind(JSON.stringify(selected), now),
      DB.prepare(`INSERT INTO settings (key,value,updated_at) VALUES ('today_menu_published_at',?,?)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).bind(String(now), now),
      DB.prepare(`INSERT INTO settings (key,value,updated_at) VALUES ('today_featured_ids',?,?)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).bind(JSON.stringify(featured), now),
    ]);
    return Response.json(await readState());
  }

  return Response.json({ error: "未知操作" }, { status: 400 });
}
