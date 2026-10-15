import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { storeMedia } from "@/lib/media-store";

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
  const folder = String(form.get("folder") || "plans");
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return NextResponse.json({ error: "Aucun fichier" }, { status: 400 });

  const uploaded: { key: string; url: string; name: string }[] = [];
  for (const file of files) {
    const ext = ALLOWED.get(file.type);
    if (!ext) return NextResponse.json({ error: `Type non autorisé : ${file.type}` }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: `${file.name} dépasse 95 Mo` }, { status: 400 });
    const { key, url } = await storeMedia({ body: file.stream(), size: file.size, contentType: file.type, ext, visibility, folder, label: file.name });
    uploaded.push({ key, name: file.name, url });
  }
  return NextResponse.json({ files: uploaded });
}
