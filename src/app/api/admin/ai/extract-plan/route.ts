import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const EXTRACTION_PROMPT = `Tu es un expert en architecture et en analyse de plans de maisons. Analyse ce document PDF qui contient un plan de maison et extrais les informations suivantes.

Retourne UNIQUEMENT un objet JSON valide (sans markdown, sans commentaires) avec cette structure exacte :
{
  "name": "Nom du plan (ex: Villa Amira, Duplex Prestige)",
  "category": "villa" ou "duplex",
  "description": "Description professionnelle et vendeuse du plan en 2-3 phrases en français",
  "surface": nombre entier en m²,
  "bedrooms": nombre entier de chambres,
  "bathrooms": nombre entier de salles de bain,
  "floors": nombre entier de niveaux,
  "rooms": [{ "name": "Nom de la pièce en français", "area": surface en m² (nombre) }],
  "estimatedCost": coût estimé en FCFA (nombre entier) ou 0 si non mentionné
}

Règles :
- Les noms de pièces doivent être en français (Séjour, Chambre, Cuisine, Salle de bain, Terrasse, etc.)
- Si une information n'est pas trouvée, mets la valeur par défaut (0 pour les nombres, "villa" pour category, chaîne vide pour name/description)
- Le champ rooms doit lister CHAQUE pièce individuelle avec sa surface. Si le plan montre "Chambre 1: 12m²" et "Chambre 2: 14m²", mets deux entrées séparées.
- Inclus les pièces comme Séjour, Cuisine, Chambres, Salles de bain, Terrasse, Couloir, Escalier, Garage, etc.
- La description doit être professionnelle, mettre en valeur les atouts du plan`;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Clé API Anthropic non configurée" },
      { status: 500 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 },
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Le fichier doit être un PDF" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Fichier trop volumineux (max 20 Mo)" },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text",
    );

    if (!textBlock) {
      return NextResponse.json(
        { error: "Aucune réponse textuelle de l'IA" },
        { status: 500 },
      );
    }

    let jsonStr = textBlock.text.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    const extracted = JSON.parse(jsonStr);

    const result = {
      name: extracted.name || "",
      category: extracted.category === "duplex" ? "duplex" : "villa",
      description: extracted.description || "",
      surface: Number(extracted.surface) || 0,
      bedrooms: Number(extracted.bedrooms) || 0,
      bathrooms: Number(extracted.bathrooms) || 0,
      floors: Number(extracted.floors) || 1,
      rooms: Array.isArray(extracted.rooms)
        ? extracted.rooms
            .filter(
              (r: Record<string, unknown>) =>
                r && typeof r === "object" && r.name,
            )
            .map((r: Record<string, unknown>) => ({
              name: String(r.name),
              area: Math.round(Number(r.area)) || 0,
            }))
        : [],
      estimatedCost: Number(extracted.estimatedCost) || 0,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("AI extraction error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Erreur lors de l'extraction IA",
      },
      { status: 500 },
    );
  }
}
