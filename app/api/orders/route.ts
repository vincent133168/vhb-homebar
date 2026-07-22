import { ensureCatalog, getBindings } from "../../../db/runtime";
import { customerContextFromRequest } from "../../customer";

type OrderRow = { id: string; customer_id:string|null; table_name: string; items: string; total: number; status: string; created_at: number };

function present(row: OrderRow) {
  return { id: row.id, code: row.id.slice(0, 6).toUpperCase(), tableName: row.table_name, items: JSON.parse(row.items), total: row.total, status: row.status, createdAt: row.created_at };
}

export async function GET(request: Request) {
  try {
    await ensureCatalog();
    const id = new URL(request.url).searchParams.get("id");
    if (id) {
      const row = await getBindings().DB.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first<OrderRow>();
      if (!row) return Response.json({ error: "没有找到这笔点单" }, { status: 404 });
      return Response.json({ order: present(row) });
    }
    const customer = await customerContextFromRequest(request);
    const placeholders = customer.visibleIds.map(() => "?").join(",");
    const rows = await getBindings().DB.prepare(`SELECT * FROM orders WHERE customer_id IN (${placeholders}) ORDER BY created_at DESC LIMIT 30`).bind(...customer.visibleIds).all<OrderRow>();
    const headers = customer.setCookie ? { "Set-Cookie":customer.setCookie } : undefined;
    return Response.json({ orders:rows.results.map(present) }, { headers });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "查询失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureCatalog();
    const payload = await request.json() as { tableName?: string; items?: Array<{ id: string }> };
    const requested = Array.isArray(payload.items) ? payload.items.slice(0, 30) : [];
    if (!requested.length) return Response.json({ error: "点单不能为空" }, { status: 400 });
    const uniqueIds = [...new Set(requested.map((item) => String(item.id || "")).filter(Boolean))];
    const placeholders = uniqueIds.map(() => "?").join(",");
    const rows = await getBindings().DB.prepare(`SELECT id,name,price FROM cocktails WHERE id IN (${placeholders})`).bind(...uniqueIds).all<{ id:string;name:string;price:number }>();
    const byId = new Map(rows.results.map((row) => [row.id, row]));
    const items = requested.map((item) => byId.get(String(item.id))).filter((item): item is { id:string;name:string;price:number } => Boolean(item));
    if (items.length !== requested.length) return Response.json({ error: "酒单已更新，请刷新后再点单" }, { status: 409 });
    const total = items.reduce((sum, item) => sum + item.price, 0);
    const customer = await customerContextFromRequest(request);
    const order = { id: crypto.randomUUID(), code: "", tableName: payload.tableName || "深夜客厅", items, total, status: "new", createdAt: Date.now() };
    order.code = order.id.slice(0, 6).toUpperCase();
    await getBindings().DB.prepare("INSERT INTO orders (id,customer_id,table_name,items,total,status,created_at) VALUES (?,?,?,?,?,?,?)")
      .bind(order.id, customer.primaryId, order.tableName, JSON.stringify(items), total, order.status, order.createdAt).run();
    const headers = customer.setCookie ? { "Set-Cookie":customer.setCookie } : undefined;
    return Response.json({ order }, { status: 201, headers });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "点单失败" }, { status: 500 });
  }
}
