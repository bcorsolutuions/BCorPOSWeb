import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Till configuration: which SiteID (branch) and TerminalID this physical
 * device is, and which Shift the current cashier opened. BCorDFWebApi has
 * no concept of "the logged-in user's branch" (see AuthUser in
 * types/auth.ts) — SiteID/TerminalID are a property of the till, not the
 * user, so this is set once per device (POS Setup screen) and persists
 * across logins, independent of the auth session.
 *
 * A branch always belongs to one company, so the saved branch/shift also remember WHICH company they were chosen for (compId).
 * When a different company signs in on the same PC, SiteSetupGate drops them (even if both companies have a branch "S001").
 */
interface PosSessionState {
  /** The company the saved siteId / shiftNo belong to; null for a session saved before this was recorded. */
  compId: string | null;
  siteId: string | null;
  terminalId: string | null;
  shiftNo: number | null;
  isConfigured: boolean;
  configure: (siteId: string, terminalId: string, shiftNo: number) => void;
  // Sets only the branch — for screens that need a site but no terminal/
  // shift (Restaurant Tables, KDS, Reservations, Deliveries). Leaves
  // terminalId/shiftNo/isConfigured untouched; POS Billing's full Till
  // Setup (configure()) still runs independently when the till itself
  // hasn't been set up.
  setSiteId: (siteId: string) => void;
  // Clears only the branch, re-triggering SiteSetupGate — for switching
  // branches on Restaurant Tables/KDS/Reservations/Deliveries without
  // disturbing an unrelated POS Billing till setup on the same device.
  clearSiteId: () => void;
  clearShift: () => void;
  reset: () => void;
}

const signedInCompId = () => useAuthStore.getState().user?.compId ?? null;

export const usePosSessionStore = create<PosSessionState>()(
  persist(
    (set) => ({
      compId: null,
      siteId: null,
      terminalId: null,
      shiftNo: null,
      isConfigured: false,
      configure: (siteId, terminalId, shiftNo) =>
        set({ compId: signedInCompId(), siteId, terminalId, shiftNo, isConfigured: true }),
      setSiteId: (siteId) => set({ compId: signedInCompId(), siteId }),
      clearSiteId: () => set({ compId: null, siteId: null }),
      clearShift: () => set({ shiftNo: null }),
      // terminalId is deliberately kept: it names this physical PC, not the session, so switching branch or opening
      // a new shift must not make the cashier type it again (Till Setup shows it as "remembered").
      reset: () => set({ compId: null, siteId: null, shiftNo: null, isConfigured: false }),
    }),
    { name: "bcor-pos-session" },
  ),
);
