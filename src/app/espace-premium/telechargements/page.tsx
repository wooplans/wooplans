import { requireMember } from "@/lib/auth";
import { privateFileUrl } from "@/lib/premium";
import { getSetting } from "@/lib/settings";

type CatalogueFile = { key: string; label: string; updatedAt?: string };

export default async function DownloadsPage() {
  await requireMember();
  const files = await getSetting<CatalogueFile[]>("catalogue_files", []);
  return (
    <div className="container-page max-w-2xl py-8">
      <h1 className="text-2xl font-bold tracking-tight">Mes téléchargements</h1>
      <p className="mt-1 text-foreground/70">La dernière version du catalogue PDF, mise à jour avec les nouveaux modèles.</p>
      <div className="mt-8 grid gap-3">
        {files.length === 0 ? (
          <p className="card p-6 text-muted">Le PDF vous a été envoyé par email lors de votre achat. La version téléchargeable arrive ici très bientôt.</p>
        ) : (
          files.map((file) => (
            <a key={file.key} href={privateFileUrl(file.key, true)} className="card flex items-center justify-between gap-4 p-5 hover:border-primary">
              <span>
                <span className="block font-semibold">{file.label}</span>
                {file.updatedAt ? <span className="text-sm text-muted">Mis à jour le {new Date(file.updatedAt).toLocaleDateString("fr-FR")}</span> : null}
              </span>
              <span className="btn-primary px-4 py-2">Télécharger</span>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
