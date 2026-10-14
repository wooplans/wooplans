import { NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getCurrentAdmin } from "@/lib/auth";
import { randomId } from "@/lib/crypto";
import { getEnv } from "@/lib/env";

const ALLOWED = new Map([
  ["image/webp", "webp"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/avif", "avif"],
  ["application/pdf", "pdf"],
]);
const MAX_BYTES = 95 * 1024 * 1024;

/** Téléversement admin vers R2. visibility=private pour les distributions cotées et le PDF. */
export async function POST(request: Request) {
  if (!(await getCurrentAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const form = await request.formData();
  const visibility = form.get("visibility") === "private" ? "private" : "public";
  const folder = String(form.get("folder") || "plans").replace(/[^a-z0-9-]/gi, "").slice(0, 60) || "plans";
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return NextResponse.json({ error: "Aucun fichier" }, { status: 400 });

  const uploaded: { key: string; url: string; name: string }[] = [];
  for (const file of files) {
    const ext = ALLOWED.get(file.type);
    if (!ext) return NextResponse.json({ error: `Type non autorisé : ${file.type}` }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: `${file.name} dépasse 95 Mo` }, { status: 400 });
    const key = `${visibility}/${folder}/${Date.now()}-${randomId(6)}.${ext}`;
    await getEnv().MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
    await getDb().insert(schema.media).values({ key, visibility, contentType: file.type, size: file.size, label: file.name });
    uploaded.push({ key, name: file.name, url: visibility === "public" ? `/media/${key}` : key });
  }
  return NextResponse.json({ files: uploaded });
}
