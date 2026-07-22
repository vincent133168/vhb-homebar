import { getAdminSessionFromRequest } from "../../../admin-auth";
import { ensureCatalog, getBindings } from "../../../../db/runtime";

export async function GET(request: Request) {
  if (!await getAdminSessionFromRequest(request)) return Response.json({ error: "无权访问" }, { status: 403 });
  await ensureCatalog();
  const rows = await getBindings().DB.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 200").all();
  return Response.json({ orders: rows.results.map((row: Record<string, unknown>) => ({
    id: row.id, code: String(row.id).slice(0,6).toUpperCase(), tableName: row.table_name,
    items: JSON.parse(String(row.items)), total: row.total, status: row.status, createdAt: row.created_at,
  })) });
}

export async function PATCH(request: Request) {
  if (!await getAdminSessionFromRequest(request)) return Response.json({ error: "无权访问" }, { status: 403 });
  const payload = await request.json() as { id?: string; status?: string };
  const allowed = ["new","making","ready","completed","cancelled"];
  if (!payload.id || !payload.status || !allowed.includes(payload.status)) return Response.json({ error: "参数错误" }, { status: 400 });
  await ensureCatalog();
  await getBindings().DB.prepare("UPDATE orders SET status = ? WHERE id = ?").bind(payload.status,payload.id).run();
  return Response.json({ ok:true });
}
