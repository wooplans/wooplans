"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const PREMIUM_TEST_STORAGE_KEY = "wooplans-premium-test-unlocked";
const PREMIUM_TEST_EVENT = "wooplans-premium-test-changed";

type PremiumTeaserProps = {
  type: "floorplan" | "cost";
  title: string;
  subtitle: string;
  realContent?: React.ReactNode;
  previewContent?: React.ReactNode;
  backgroundImage?: string;
  initialUnlocked?: boolean;
};

export function PremiumTeaser({
  type,
  title,
  subtitle,
  realContent,
  previewContent,
  backgroundImage,
  initialUnlocked = false,
}: PremiumTeaserProps) {
  const [isUnlocked, setIsUnlocked] = useState(initialUnlocked);

  useEffect(() => {
    const syncUnlockState = () => {
      const savedState = window.localStorage.getItem(PREMIUM_TEST_STORAGE_KEY);
      setIsUnlocked(savedState === null ? initialUnlocked : savedState === "true");
    };

    syncUnlockState();
    window.addEventListener(PREMIUM_TEST_EVENT, syncUnlockState);
    window.addEventListener("storage", syncUnlockState);

    return () => {
      window.removeEventListener(PREMIUM_TEST_EVENT, syncUnlockState);
      window.removeEventListener("storage", syncUnlockState);
    };
  }, [initialUnlocked]);

  if (isUnlocked && realContent) {
    return <div className="relative">{realContent}</div>;
  }

  return (
    <div className="group relative overflow-hidden border border-outline/10 bg-surface rounded-2xl">
      <div className="blur-[3px] opacity-90 select-none pointer-events-none">
        {previewContent ? (
          previewContent
        ) : backgroundImage ? (
          <Image
            src={backgroundImage}
            alt={title}
            width={1200}
            height={800}
            sizes="(min-width: 768px) 896px, 100vw"
            quality={45}
            className="w-full h-auto object-cover"
          />
        ) : (
          <>
            {type === "floorplan" ? (
              <div className="bg-background p-8 min-h-[280px] flex items-center justify-center">
                <div className="w-full max-w-lg space-y-4">
                  <div className="h-3 bg-foreground/10 w-3/4" />
                  <div className="grid grid-cols-3 gap-3">
                    <div className="h-20 bg-foreground/8" />
                    <div className="h-20 bg-foreground/8" />
                    <div className="h-20 bg-foreground/8" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-16 bg-foreground/6" />
                    <div className="h-16 bg-foreground/6" />
                  </div>
                  <div className="h-2 bg-foreground/8 w-1/2" />
                  <div className="grid grid-cols-4 gap-3 mt-2">
                    <div className="h-10 bg-foreground/5" />
                    <div className="h-10 bg-foreground/5" />
                    <div className="h-10 bg-foreground/5" />
                    <div className="h-10 bg-foreground/5" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-background p-8 min-h-[260px]">
                <div className="space-y-3">
                  <div className="h-3 bg-foreground/10 w-1/3" />
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex gap-4">
                      <div className="h-3 bg-foreground/7 flex-1" />
                      <div className="h-3 bg-foreground/7 w-24" />
                    </div>
                  ))}
                  <div className="border-t border-foreground/10 pt-3 flex gap-4">
                    <div className="h-4 bg-primary/15 flex-1" />
                    <div className="h-4 bg-primary/15 w-28" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20 flex flex-col items-center justify-end pb-8 px-6">
        <div className="text-center">
          <h3 className="text-base font-semibold text-foreground mb-1">
            {title}
          </h3>
          <p className="text-xs text-foreground/50 mb-4 max-w-xs mx-auto">
            {subtitle}
          </p>
          {!isUnlocked ? (
            <Link
              href="/abonnement"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white text-sm font-semibold rounded-full border border-accent hover:bg-accent/90 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Débloquer avec Premium
            </Link>
          ) : (
            <div className="inline-flex items-center gap-2 px-5 py-2.5 border border-accent/40 bg-accent/10 text-accent text-sm font-semibold rounded-full">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Accès Premium
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
