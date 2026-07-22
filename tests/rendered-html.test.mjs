import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("VHB storefront only exposes the published ordering menu", async () => {
  const [page, layout, presenter, styles, menuRoute, orderRoute, customer] = await Promise.all([read("../app/page.tsx"), read("../app/layout.tsx"), read("../db/cocktail-presenter.ts"), read("../app/globals.css"), read("../app/api/menu/route.ts"), read("../app/api/orders/route.ts"), read("../app/customer.ts")]);
  assert.match(layout, /VHB｜今晚点什么/);
  assert.match(layout, /\/vhb-logo\.png/);
  assert.match(page, /fetch\("\/api\/menu"/);
  assert.match(page, /今晚酒单/);
  assert.match(page, /确认点单/);
  assert.match(page, /我的订单/);
  assert.match(page, /主理人今晚推荐/);
  assert.match(page, /搜索酒名、风味或材料/);
  assert.match(page, /只看收藏/);
  assert.match(page, /帮我选一杯/);
  assert.match(page, /再次点单/);
  assert.doesNotMatch(page, /上传今日材料|匹配可调酒单|配方数据库/);
  assert.match(presenter, /`\/cocktails\/\$\{row\.id\}\.jpg`/);
  assert.doesNotMatch(presenter, /images\.unsplash\.com/);
  assert.match(layout, /viewportFit:\s*"cover"/);
  assert.match(styles, /iPad Pro 2020/);
  assert.match(styles, /pointer:coarse/);
  assert.match(styles, /orientation:portrait/);
  assert.match(styles, /orientation:landscape/);
  assert.match(styles, /safe-area-inset/);
  assert.match(menuRoute, /today_featured_ids/);
  assert.match(orderRoute, /customer_id/);
  assert.match(orderRoute, /ORDER BY created_at DESC LIMIT 30/);
  assert.match(customer, /vhb_customer/);
  assert.match(customer, /session\?\.role === "user"/);
});

test("admin login and publish workflow are wired without ChatGPT auth", async () => {
  const [login, dashboard, auth, todayRoute, runtime, cocktailRoute, adminCocktailRoute] = await Promise.all([
    read("../app/login/page.tsx"),
    read("../app/admin/AdminDashboard.tsx"),
    read("../app/auth.ts"),
    read("../app/api/admin/today-menu/route.ts"),
    read("../db/runtime.ts"),
    read("../app/api/cocktails/route.ts"),
    read("../app/api/admin/cocktails/route.ts"),
  ]);
  assert.match(login, /\/api\/auth\/admin\/login/);
  assert.match(login, /微信一键登录/);
  assert.match(dashboard, /上传今日材料/);
  assert.match(dashboard, /同步.*至顾客端/);
  assert.match(auth, /vhb_session/);
  assert.match(todayRoute, /today_menu_ids/);
  assert.match(todayRoute, /custom_ingredients/);
  assert.match(todayRoute, /add-ingredient/);
  assert.match(todayRoute, /delete-ingredient/);
  assert.match(todayRoute, /customOrder/);
  assert.match(todayRoute, /Number\(b\.custom\) - Number\(a\.custom\)/);
  assert.match(todayRoute, /ingredientAliasGroups/);
  assert.match(todayRoute, /normalizeIngredient/);
  assert.match(todayRoute, /today_featured_ids/);
  assert.match(todayRoute, /payload\.action === "feature"/);
  assert.doesNotMatch(todayRoute, /matchedCount > 0/);
  assert.doesNotMatch(todayRoute, /rankedMatches\(rows, ingredients\)\.slice/);
  assert.doesNotMatch(todayRoute, /selectedIds \|\| \[\]\)\.map\(String\)\)\]\.slice\(0,\s*30\)/);
  assert.match(dashboard, /自定义材料/);
  assert.match(dashboard, /删除候选材料/);
  assert.match(dashboard, /新材料会置顶保存/);
  assert.match(dashboard, /已检查全部/);
  assert.match(dashboard, /还缺1项/);
  assert.match(dashboard, /缺2项以上/);
  assert.match(dashboard, /RECIPE DETAIL/);
  assert.match(dashboard, /制作方式/);
  assert.match(dashboard, /删除该配方/);
  assert.doesNotMatch(dashboard, /slice\(0,\s*16\)|slice\(0,\s*12\)/);
  assert.doesNotMatch(todayRoute, /ingredientOptions[\s\S]*?slice\(0,\s*48\)/);
  assert.match(runtime, /all_prices_zero_v1/);
  assert.match(runtime, /deleted_cocktail_ids/);
  assert.match(runtime, /orders_customer_id_idx/);
  assert.match(adminCocktailRoute, /export async function DELETE/);
  assert.match(adminCocktailRoute, /DELETE FROM cocktails/);
  assert.match(adminCocktailRoute, /today_menu_ids/);
  assert.match(adminCocktailRoute, /UPLOADS\.delete/);
  assert.match(adminCocktailRoute, /presentCocktail/);
  assert.match(cocktailRoute, /price:\s*0/);
  assert.doesNotMatch(`${login}${dashboard}${auth}${todayRoute}`, /signin-with-chatgpt|ChatGPT/);
});
