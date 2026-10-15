import type { Metadata } from "next";
import { UploadLinkForm } from "@/components/UploadLinkForm";

export const metadata: Metadata = { title: "Envoi de fichiers", robots: { index: false, follow: false } };

/** Page du lien d'envoi : le jeton est dans le fragment (#…), jamais transmis au serveur ni aux statistiques. */
export default function UploadLinkPage() {
  return (
    <main className="container-page py-10">
      <UploadLinkForm />
    </main>
  );
}
