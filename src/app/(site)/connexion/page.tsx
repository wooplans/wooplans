import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getCurrentMember } from "@/lib/auth";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Connexion à l'espace Premium",
  robots: { index: false, follow: true },
  alternates: { canonical: "/connexion" },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  if (await getCurrentMember()) redirect("/espace-premium");
  const { email } = await searchParams;
  return (
    <div className="container-page max-w-md py-14">
      <p className="eyebrow">Espace Premium</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Connexion</h1>
      <p className="mt-3 text-foreground/70">Connectez-vous avec l&apos;email de votre achat et le code d&apos;accès reçu par email.</p>
      <div className="mt-8">
        <LoginForm defaultEmail={email} />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        Pas encore membre ?{" "}
        <Link href={SITE.catalogueUrl} data-cta="login_page" className="font-semibold text-primary hover:underline">
          {SITE.catalogueCta}
        </Link>
      </p>
    </div>
  );
}
