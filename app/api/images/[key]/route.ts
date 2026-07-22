import { getBindings } from "../../../../db/runtime";

export async function GET(_: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  const object = await getBindings().UPLOADS.get(decodeURIComponent(key));
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
}
