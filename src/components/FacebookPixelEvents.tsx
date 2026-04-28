"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function FacebookPixelEvents() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      window.fbq?.("track", "PageView");
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [pathname, searchParams]);

  return null;
}
