import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { randomObjectKey, uploadR2Object } from "@/lib/r2";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const runtime = "edge";

export async function POST(request: Request) {
  const session = await requireRole(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    if (files.length > 20) {
      return NextResponse.json({ error: "Maximum 20 fichiers par envoi" }, { status: 400 });
    }

    const results: { url: string; filename: string; originalName: string }[] = [];

    for (const file of files) {
      if (!(file instanceof File)) continue;

      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: `Type non autorisé : ${file.name}` },
          { status: 400 },
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Fichier trop volumineux : ${file.name} (max 10 Mo)` },
          { status: 400 },
        );
      }

      const bytes = await file.arrayBuffer();
      const ext = file.name.includes(".") ? `.${file.name.split(".").pop()}` : ".jpg";
      const filename = randomObjectKey(ext);
      await uploadR2Object({
        key: filename,
        contentType: file.type,
        body: new Uint8Array(bytes),
      });

      results.push({
        url: `/api/uploads/${encodeURIComponent(filename)}`,
        filename,
        originalName: file.name,
      });
    }

    return NextResponse.json({ files: results }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de l'upload",
      },
      { status: 500 },
    );
  }
}
