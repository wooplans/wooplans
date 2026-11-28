"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { pixelPurchase } from "@/lib/pixel";

type Status = { status: "unknown" | "started" | "paid" | "failed" | "abandoned"; email: string | null; code: string | null };

/** Page de remerciement anglaise : attend la confirmation Chariow, affiche le code d'accès. */
export function PurchaseStatusEn({ intentId, pixelId, value }: { intentId?: string; pixelId?: string; value: number }) {
  const [data, setData] = useState<Status | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async (n: number) => {
      const qs = intentId ? `?i=${encodeURIComponent(intentId)}` : "";
      const res = await fetch(`/api/achat/statut${qs}`, { cache: "no-store" }).catch(() => null);
      const json = (await res?.json().catch(() => null)) as Status | null;
      if (cancelled) return;
      if (json) setData(json);
      setAttempts(n);
      if (json?.status === "paid") {
        const key = `wp_purchase_${intentId ?? "x"}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          pixelPurchase(pixelId, key, { value, currency: "XAF", content_name: "Premium Catalogue EN" });
        }
        return;
      }
      if (n < 40 && json?.status !== "failed") timer = setTimeout(() => poll(n + 1), n < 10 ? 3000 : 6000);
    };
    void poll(1);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [intentId, pixelId, value]);

  if (data?.status === "paid") {
    return (
      <div className="card p-6 text-center md:p-10">
        <p className="text-4xl" aria-hidden>🎉</p>
        <h1 className="mt-3 text-2xl font-bold md:text-3xl">Payment confirmed, welcome!</h1>
        <p className="mt-3 text-foreground/75">
          Your access is also sent by email{data.email && !data.email.includes("+wa") ? ` to ${data.email}` : ""}. Here is your personal access code:
        </p>
        {data.code ? (
          <div className="mx-auto mt-6 max-w-xs rounded-2xl border-2 border-dashed border-primary bg-primary/5 p-5">
            <p className="font-mono text-3xl font-extrabold tracking-[0.2em] text-primary">{data.code}</p>
            <button
              type="button"
              className="mt-3 text-sm font-semibold text-primary hover:underline"
              onClick={() => {
                void navigator.clipboard?.writeText(data.code!);
                setCopied(true);
              }}
            >
              {copied ? "Code copied ✓" : "Copy the code"}
            </button>
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted">Your code has just been sent by email.</p>
        )}
        <p className="mt-4 text-sm text-muted">Write it down: you will need it to log in from any phone.</p>
        <Link href={`/en/login${data.email ? `?email=${encodeURIComponent(data.email)}` : ""}`} className="btn-cta mt-8 px-8 py-4 text-base">
          Open my Premium space
        </Link>
      </div>
    );
  }

  if (data?.status === "failed") {
    return (
      <div className="card p-8 text-center">
        <h1 className="text-2xl font-bold">The payment did not go through</h1>
        <p className="mt-3 text-foreground/75">Nothing was charged. You can try again whenever you like.</p>
        <Link href="/en/premium-catalogue" className="btn-cta mt-6">Try again</Link>
      </div>
    );
  }

  const waiting = attempts < 40;
  return (
    <div className="card p-8 text-center">
      {waiting ? <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" /> : null}
      <h1 className="mt-5 text-2xl font-bold">{waiting ? "Confirming your payment…" : "Confirmation in progress"}</h1>
      <p className="mt-3 text-foreground/75">
        {waiting
          ? "This usually takes less than a minute. Please keep this page open."
          : "The confirmation is taking longer than expected. As soon as it arrives, you will receive your access code by email."}
      </p>
      {!waiting ? (
        <p className="mt-4 text-sm text-muted">
          Already have your code? <Link href="/en/login" className="font-semibold text-primary">Log in</Link>
        </p>
      ) : null}
    </div>
  );
}
