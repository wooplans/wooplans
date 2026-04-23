"use client";

import { useEffect, useState } from "react";

const PREMIUM_TEST_STORAGE_KEY = "wooplans-premium-test-unlocked";
const PREMIUM_TEST_EVENT = "wooplans-premium-test-changed";

type PremiumTestToggleProps = {
  initialUnlocked?: boolean;
};

export function PremiumTestToggle({ initialUnlocked = false }: PremiumTestToggleProps) {
  const [isUnlocked, setIsUnlocked] = useState(initialUnlocked);

  useEffect(() => {
    const savedState = window.localStorage.getItem(PREMIUM_TEST_STORAGE_KEY);

    if (savedState === null) {
      window.localStorage.setItem(PREMIUM_TEST_STORAGE_KEY, String(initialUnlocked));
      setIsUnlocked(initialUnlocked);
      return;
    }

    setIsUnlocked(savedState === "true");
  }, [initialUnlocked]);

  function togglePremiumTest() {
    const nextState = !isUnlocked;

    setIsUnlocked(nextState);
    window.localStorage.setItem(PREMIUM_TEST_STORAGE_KEY, String(nextState));
    window.dispatchEvent(new Event(PREMIUM_TEST_EVENT));
  }

  return (
    <button
      type="button"
      onClick={togglePremiumTest}
      className="inline-flex items-center justify-center rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-primary transition-colors hover:border-primary hover:bg-primary hover:text-white"
    >
      {isUnlocked ? "Bloquer" : "Tout debloquer"}
    </button>
  );
}
