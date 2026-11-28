import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getCurrentMember } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Log in to your Premium space", robots: { index: false, follow: true } };

/** Connexion des membres anglophones ; un membre déjà connecté va à son espace (anglais ou français). */
export default async function LoginEnPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  const member = await getCurrentMember();
  if (member) redirect(member.lang === "en" ? "/en/premium" : "/espace-premium");
  return (
    <div lang="en" className="container-page max-w-md py-14">
      <p className="eyebrow">Premium space</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Log in</h1>
      <p className="mt-3 text-foreground/70">Log in with the email of your purchase and the access code you received by email.</p>
      <div className="mt-8">
        <LoginForm defaultEmail={email} next="/en/premium" lang="en" />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        Not a member yet?{" "}
        <Link href="/en/premium-catalogue" data-cta="login_page_en" className="font-semibold text-primary hover:underline">Get the Premium Catalogue</Link>
      </p>
    </div>
  );
}
