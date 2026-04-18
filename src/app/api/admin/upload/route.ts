import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
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

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

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

      const ext = path.extname(file.name) || ".jpg";
      const uniqueId = crypto.randomBytes(12).toString("hex");
      const filename = `${Date.now()}-${uniqueId}${ext}`;
      const filepath = path.join(uploadDir, filename);

      const bytes = await file.arrayBuffer();
      await writeFile(filepath, Buffer.from(bytes));

      results.push({
        url: `/uploads/${filename}`,
        filename,
        originalName: file.name,
      });
    }

    return NextResponse.json({ files: results }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 });
  }
}
