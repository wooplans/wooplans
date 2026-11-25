import { getCurrentAdmin } from "@/lib/auth";
import { markRelanceClicked } from "@/lib/chantier-relances";

export const dynamic = "force-dynamic";

/** Clic sur une carte de l'onglet « Plans complets » : la carte passe en grisé en bas de la pile pendant 2 heures. */
export async function POST(request: Request) {
  if (!(await getCurrentAdmin())) return Response.json({ ok: false }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return Response.json({ ok: false }, { status: 400 });
  await markRelanceClicked(id);
  return Response.json({ ok: true });
}
