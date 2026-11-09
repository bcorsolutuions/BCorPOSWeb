"use client";

import { useEffect, useState } from "react";
import { posService } from "@/lib/api/services/pos-service";
import { getPendingOfflineSales, markSynced, pendingCount } from "@/lib/offline/offline-queue";

/** Sequential, one-at-a-time replay — see offline-queue.ts's header comment on why this isn't a batch call. */
export function useOfflineSync() {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function syncPending() {
      for (const item of getPendingOfflineSales()) {
        if (cancelled) return;
        try {
          await posService.create(item.compId, item.siteId, item.userName, item.dto);
          markSynced(item.clientKey);
        } catch {
          // Stop on first failure — still offline, or the server rejected it;
          // either way, retry from the top next time we're online.
          break;
        }
      }
      if (!cancelled) setPending(pendingCount());
    }

    setPending(pendingCount());
    syncPending();
    window.addEventListener("online", syncPending);
    return () => {
      cancelled = true;
      window.removeEventListener("online", syncPending);
    };
  }, []);

  return pending;
}
