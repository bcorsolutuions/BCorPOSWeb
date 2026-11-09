import { newUuid } from "@/lib/utils";
import type { CreatePosDto } from "@/types/pos";

const STORAGE_KEY = "bcor-pos-offline-queue";

export interface OfflineQueuedPos {
  clientKey: string;
  compId: string;
  siteId: string;
  userName: string;
  dto: CreatePosDto;
  queuedAt: string;
  synced: boolean;
}

/**
 * NOTE — known limitation: BCorDFWebApi's PosController.Create has no
 * idempotency-key support (each call unconditionally allocates a new
 * DocNo via IDocumentNumberService). This queue prevents the *client*
 * from double-submitting (sequential replay, marked synced only on a
 * confirmed response — see hooks/use-offline-sync.ts), but a genuine
 * network partial-failure (request reached the server, response was
 * lost) can still produce a duplicate document server-side. Closing that
 * gap needs a backend change (an idempotency key column + check on
 * PosHdr), which is out of scope here — day-close reconciliation is the
 * practical backstop until then.
 */
function readQueue(): OfflineQueuedPos[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeQueue(queue: OfflineQueuedPos[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

function newClientKey(): string {
  return newUuid();
}

export function enqueueOfflineSale(compId: string, siteId: string, userName: string, dto: CreatePosDto): string {
  const clientKey = newClientKey();
  const queue = readQueue();
  queue.push({ clientKey, compId, siteId, userName, dto, queuedAt: new Date().toISOString(), synced: false });
  writeQueue(queue);
  return clientKey;
}

export function getPendingOfflineSales(): OfflineQueuedPos[] {
  return readQueue().filter((s) => !s.synced);
}

export function markSynced(clientKey: string) {
  writeQueue(readQueue().map((s) => (s.clientKey === clientKey ? { ...s, synced: true } : s)));
}

export function pendingCount(): number {
  return getPendingOfflineSales().length;
}
