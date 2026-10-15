/** Construit une réponse HTTP depuis R2, avec prise en charge des requêtes partielles (vidéo, PDF). */
export async function serveR2Object(
  bucket: R2Bucket,
  key: string,
  request: Request,
  options: { cacheControl: string; contentType?: string; download?: string },
) {
  const rangeHeader = request.headers.get("range");
  const range = rangeHeader ? parseRange(rangeHeader) : null;
  if (rangeHeader && !range) {
    return new Response("Plage invalide", { status: 416, headers: { "Accept-Ranges": "bytes" } });
  }

  const object = await bucket.get(key, range ? { range } : undefined);
  if (!object) return new Response("Introuvable", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  if (options.contentType) headers.set("Content-Type", options.contentType);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", options.cacheControl);
  headers.set("ETag", object.httpEtag);
  headers.set("X-Content-Type-Options", "nosniff");
  if (options.download) {
    headers.set("Content-Disposition", `attachment; filename="${options.download.replace(/"/g, "")}"`);
  }

  let status = 200;
  if (range && object.range) {
    const r = object.range as { offset?: number; length?: number; suffix?: number };
    const start = r.suffix !== undefined ? Math.max(0, object.size - r.suffix) : (r.offset ?? 0);
    const length = r.length ?? object.size - start;
    const end = Math.min(start + length, object.size) - 1;
    headers.set("Content-Range", `bytes ${start}-${end}/${object.size}`);
    headers.set("Content-Length", String(end - start + 1));
    status = 206;
  } else {
    headers.set("Content-Length", String(object.size));
  }
  return new Response(request.method === "HEAD" ? null : object.body, { status, headers });
}

function parseRange(value: string): R2Range | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match || (!match[1] && !match[2])) return null;
  if (!match[1]) return { suffix: Number(match[2]) };
  const offset = Number(match[1]);
  if (!Number.isSafeInteger(offset) || offset < 0) return null;
  if (!match[2]) return { offset };
  const end = Number(match[2]);
  if (!Number.isSafeInteger(end) || end < offset) return null;
  return { offset, length: end - offset + 1 };
}

export function safeKey(parts: string[]) {
  const key = parts.map((p) => decodeURIComponent(p)).join("/");
  if (!key || key.includes("..") || key.startsWith("/") || key.length > 512) return null;
  return key;
}
