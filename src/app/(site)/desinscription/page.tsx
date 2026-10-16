import type { Metadata } from "next";
import { normalizeEmail } from "@/lib/members";
import { OPTOUT_LABELS, verifyUnsubscribe } from "@/lib/unsubscribe";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Désinscription", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ e?: string; s?: string; t?: string; ok?: string }> };

/** Confirmation par un bouton : les antivirus des messageries ouvrent les liens, ils ne cliquent pas. */
export default async function UnsubscribePage({ searchParams }: Props) {
  const { e, s, t, ok } = await searchParams;
  if (ok) {
    const label = s === "members" || s === "prospects" ? OPTOUT_LABELS[s] : "ces emails";
    return (
      <div className="container-page max-w-lg py-16 text-center">
        <h1 className="text-2xl font-bold">C&apos;est fait</h1>
        <p className="mt-3 text-foreground/70">Vous ne recevrez plus {label}.</p>
      </div>
    );
  }
  const email = normalizeEmail(e || "");
  const scope = await verifyUnsubscribe(email, s || "", t || "");
  if (!scope) {
    return (
      <div className="container-page max-w-lg py-16 text-center">
        <h1 className="text-2xl font-bold">Lien invalide</h1>
        <p className="mt-3 text-foreground/70">Ce lien de désinscription est incomplet. Écrivez-nous et nous vous retirerons de la liste.</p>
      </div>
    );
  }
  return (
    <div className="container-page max-w-lg py-16 text-center">
      <h1 className="text-2xl font-bold">Se désinscrire</h1>
      <p className="mt-3 text-foreground/70">
        Ne plus recevoir {OPTOUT_LABELS[scope]} à l&apos;adresse <strong>{email}</strong> ?
      </p>
      <form action="/api/desinscription" method="post" className="mt-6">
        <input type="hidden" name="e" value={email} />
        <input type="hidden" name="s" value={scope} />
        <input type="hidden" name="t" value={t} />
        <input type="hidden" name="from_page" value="1" />
        <button className="btn-primary">Confirmer la désinscription</button>
      </form>
      <p className="mt-4 text-sm text-muted">Les emails liés à votre accès (code, connexion) restent envoyés.</p>
    </div>
  );
}
