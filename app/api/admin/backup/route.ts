import { getAdminSessionFromRequest } from "../../../admin-auth";
import { ensureCatalog, getBindings } from "../../../../db/runtime";

type BackupImage = {
  key: string;
  size: number;
  uploadedAt: string | null;
  contentType: string | null;
  customMetadata: Record<string, string>;
  base64: string;
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

async function readUploadedImages() {
  const { UPLOADS } = getBindings();
  const images: BackupImage[] = [];
  let cursor: string | undefined;

  do {
    const page = await UPLOADS.list({ cursor });
    for (const entry of page.objects) {
      const object = await UPLOADS.get(entry.key);
      if (!object) continue;
      const bytes = new Uint8Array(await object.arrayBuffer());
      images.push({
        key: entry.key,
        size: entry.size,
        uploadedAt: entry.uploaded?.toISOString() || null,
        contentType: object.httpMetadata?.contentType || null,
        customMetadata: object.customMetadata || {},
        base64: bytesToBase64(bytes),
      });
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  return images;
}

export async function GET(request: Request) {
  if (!await getAdminSessionFromRequest(request)) {
    return Response.json({ error: "无权访问" }, { status: 403 });
  }

  try {
    await ensureCatalog();
    const { DB } = getBindings();
    const [cocktails, orders, settings, users, uploadedImages] = await Promise.all([
      DB.prepare("SELECT * FROM cocktails ORDER BY created_at, id").all<Record<string, unknown>>(),
      DB.prepare("SELECT * FROM orders ORDER BY created_at, id").all<Record<string, unknown>>(),
      DB.prepare("SELECT * FROM settings ORDER BY key").all<Record<string, unknown>>(),
      DB.prepare("SELECT * FROM users ORDER BY created_at, id").all<Record<string, unknown>>(),
      readUploadedImages(),
    ]);
    const exportedAt = new Date();
    const backup = {
      format: "vhb-sites-migration-backup",
      version: 1,
      exportedAt: exportedAt.toISOString(),
      source: { name: "Vincent's Homebar", database: "D1", uploads: "R2" },
      counts: {
        cocktails: cocktails.results.length,
        orders: orders.results.length,
        settings: settings.results.length,
        users: users.results.length,
        uploadedImages: uploadedImages.length,
      },
      tables: {
        cocktails: cocktails.results,
        orders: orders.results,
        settings: settings.results,
        users: users.results,
      },
      uploadedImages,
    };
    const date = exportedAt.toISOString().slice(0, 10);

    return new Response(JSON.stringify(backup), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="VHB-migration-backup-${date}.json"`,
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "备份生成失败" }, { status: 500 });
  }
}
