// Client-side cache of the last successful /api/License/validate response,
// backing the offline-grace behavior described in the License Management
// plan: a network blip shouldn't instantly block a tenant whose license is
// actually fine, but a cache older than the license's own OfflineGraceDays
// stops being trusted. Same localStorage-cache spirit as offline-queue.ts.
const STORAGE_KEY = "bcor-license-cache";

export interface CachedLicenseStatus {
  compId: string;
  isValid: boolean;
  licenseStatus: string | null;
  validTo: string | null;
  daysRemaining: number | null;
  offlineGraceDays: number;
  message: string | null;
  checkedAt: string; // ISO timestamp of the last successful online check
}

export function getCachedLicenseStatus(compId: string): CachedLicenseStatus | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedLicenseStatus;
    return parsed.compId === compId ? parsed : null;
  } catch {
    return null;
  }
}

export function cacheLicenseStatus(status: CachedLicenseStatus) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
}

export function isCacheWithinGrace(cache: CachedLicenseStatus): boolean {
  const ageDays = (Date.now() - new Date(cache.checkedAt).getTime()) / (1000 * 60 * 60 * 24);
  return ageDays <= cache.offlineGraceDays;
}
