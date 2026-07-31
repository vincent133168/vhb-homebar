import { env } from "cloudflare:workers";
import { catalogSeeds } from "./catalog";

export type Bindings = {
  DB: D1Database;
  UPLOADS: R2Bucket;
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
  AUTH_SECRET?: string;
  WECHAT_APP_ID?: string;
  WECHAT_APP_SECRET?: string;
  WECHAT_REDIRECT_URI?: string;
};

export function getBindings() {
  return env as unknown as Bindings;
}

export async function ensureTables() {
  const { DB } = getBindings();
  await DB.batch([
    DB.prepare(`CREATE TABLE IF NOT EXISTS cocktails (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      english_name TEXT NOT NULL DEFAULT '',
      bar TEXT NOT NULL DEFAULT 'HOME/BAR 原创',
      city TEXT NOT NULL DEFAULT '深圳',
      category TEXT NOT NULL DEFAULT 'homebar',
      rank INTEGER,
      source_url TEXT,
      story TEXT NOT NULL DEFAULT '由深夜客厅的朋友上传。',
      ingredients TEXT NOT NULL,
      recipe TEXT NOT NULL,
      measure_count INTEGER,
      taste TEXT NOT NULL DEFAULT '待探索',
      strength TEXT NOT NULL DEFAULT '中等',
      minutes INTEGER NOT NULL DEFAULT 4,
      image_key TEXT,
      price INTEGER NOT NULL DEFAULT 58,
      created_at INTEGER NOT NULL
    )`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      table_name TEXT NOT NULL,
      items TEXT NOT NULL,
      total INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at INTEGER NOT NULL
    )`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      provider_id TEXT NOT NULL UNIQUE,
      nickname TEXT NOT NULL DEFAULT 'VHB 朋友',
      avatar_url TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`),
    DB.prepare("CREATE INDEX IF NOT EXISTS cocktails_created_at_idx ON cocktails (created_at DESC)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS users_provider_idx ON users (provider, provider_id)"),
  ]);
  const info = await DB.prepare("PRAGMA table_info(cocktails)").all<{ name: string }>();
  const columns = new Set(info.results.map((column) => column.name));
  if (!columns.has("category")) await DB.prepare("ALTER TABLE cocktails ADD COLUMN category TEXT NOT NULL DEFAULT 'homebar'").run();
  if (!columns.has("rank")) await DB.prepare("ALTER TABLE cocktails ADD COLUMN rank INTEGER").run();
  if (!columns.has("source_url")) await DB.prepare("ALTER TABLE cocktails ADD COLUMN source_url TEXT").run();
  if (!columns.has("measure_count")) await DB.prepare("ALTER TABLE cocktails ADD COLUMN measure_count INTEGER").run();
  const orderInfo = await DB.prepare("PRAGMA table_info(orders)").all<{ name: string }>();
  if (!orderInfo.results.some((column) => column.name === "customer_id")) await DB.prepare("ALTER TABLE orders ADD COLUMN customer_id TEXT").run();
  await DB.prepare("CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON orders (customer_id, created_at DESC)").run();
}

export async function ensureCatalog() {
  await ensureTables();
  const { DB } = getBindings();
  const deletedSetting = await DB.prepare("SELECT value FROM settings WHERE key = 'deleted_cocktail_ids'").first<{ value: string }>();
  let deletedIds = new Set<string>();
  try {
    const parsed = JSON.parse(deletedSetting?.value || "[]");
    if (Array.isArray(parsed)) deletedIds = new Set(parsed.map(String));
  } catch {
    deletedIds = new Set();
  }
  const activeCatalogSeeds = catalogSeeds.filter((item) => !deletedIds.has(item.id));
  const existing = await DB.prepare("SELECT COUNT(*) AS count FROM cocktails WHERE category IN ('classic','topbar')").first<{ count: number }>();
  if (Number(existing?.count || 0) < activeCatalogSeeds.length) {
    const statements = activeCatalogSeeds.map((item) => DB.prepare(`INSERT OR IGNORE INTO cocktails
    (id,name,english_name,bar,city,category,rank,source_url,story,ingredients,recipe,taste,strength,minutes,image_key,price,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      item.id, item.name, item.englishName, item.bar, item.city, item.category, item.rank ?? null,
      item.sourceUrl, item.story, JSON.stringify(item.ingredients), JSON.stringify(item.recipe), item.taste,
      item.strength, item.minutes, null, item.price, item.createdAt,
    ));
    for (let index = 0; index < statements.length; index += 50) await DB.batch(statements.slice(index, index + 50));
  }

  const defaultIngredients = ["金酒", "威士忌", "朗姆", "伏特加", "柠檬", "青柠", "橙子", "蜂蜜", "糖浆", "苏打水", "姜汁汽水"];
  const defaults = catalogSeeds
    .map((item) => ({ item, matched: item.ingredients.filter((ingredient) => defaultIngredients.includes(ingredient)).length }))
    .filter(({ item, matched }) => matched === item.ingredients.length)
    .slice(0, 12)
    .map(({ item }) => item.id);
  const fallback = defaults.length >= 6 ? defaults : catalogSeeds.slice(0, 10).map((item) => item.id);
  const now = Date.now();
  await DB.batch([
    DB.prepare("INSERT OR IGNORE INTO settings (key,value,updated_at) VALUES ('today_ingredients',?,?)").bind(JSON.stringify(defaultIngredients), now),
    DB.prepare("INSERT OR IGNORE INTO settings (key,value,updated_at) VALUES ('today_menu_ids',?,?)").bind(JSON.stringify(fallback), now),
    DB.prepare("INSERT OR IGNORE INTO settings (key,value,updated_at) VALUES ('today_featured_ids',?,?)").bind(JSON.stringify(fallback.slice(0, 3)), now),
    DB.prepare("INSERT OR IGNORE INTO settings (key,value,updated_at) VALUES ('today_menu_published_at',?,?)").bind(String(now), now),
  ]);

  const zeroPriceMigration = await DB.prepare("SELECT value FROM settings WHERE key = 'all_prices_zero_v1'").first<{ value: string }>();
  if (!zeroPriceMigration) {
    await DB.batch([
      DB.prepare("UPDATE cocktails SET price = 0"),
      DB.prepare("INSERT INTO settings (key,value,updated_at) VALUES ('all_prices_zero_v1','done',?)").bind(now),
    ]);
  }

  const detailedRecipeMigration = await DB.prepare("SELECT value FROM settings WHERE key = 'detailed_recipes_v1'").first<{ value: string }>();
  if (!detailedRecipeMigration) {
    const recipeUpdates = activeCatalogSeeds.map((item) => DB.prepare("UPDATE cocktails SET recipe = ?, minutes = ? WHERE id = ?")
      .bind(JSON.stringify(item.recipe), item.minutes, item.id));
    for (let index = 0; index < recipeUpdates.length; index += 50) await DB.batch(recipeUpdates.slice(index, index + 50));
    await DB.prepare("INSERT INTO settings (key,value,updated_at) VALUES ('detailed_recipes_v1','done',?)").bind(now).run();
  }
}
