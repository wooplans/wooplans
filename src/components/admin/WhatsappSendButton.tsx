"use client";

import { useRouter } from "next/navigation";

/** Bouton vert des relances : ouvre WhatsApp (nouvel onglet) puis rafraîchit la file pour faire disparaître la carte. */
export function WhatsappSendButton({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => setTimeout(() => router.refresh(), 1500)}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-3 py-2.5 font-semibold text-white hover:bg-[#1ebe5a]"
    >
      {children}
    </a>
  );
}
