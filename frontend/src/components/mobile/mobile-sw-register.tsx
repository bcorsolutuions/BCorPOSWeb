"use client";

import { useEffect } from "react";

/** Registers /mobile-sw.js scoped to /mobile only — never touches the desktop POS's own requests. */
export function MobileServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/mobile-sw.js", { scope: "/mobile" }).catch(() => {});
  }, []);
  return null;
}
