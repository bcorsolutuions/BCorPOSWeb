// Salon "order now, pay later": an open order is an ordinary held bill (PosHdr.Status = "Held") whose Remarks start with a
// state marker. No schema change — Remarks is an existing free-text column that the till never shows. The marker is
// removed again when the bill is finally paid (see sale/page.tsx), so completed bills carry only the real remarks.

export type SalonOrderState = "OPEN" | "DONE";

const MARKER = /^\[SVC:(OPEN|DONE)\]\s*/;

/** State of a recalled held bill, or null for an ordinary bill / one saved with plain Hold. */
export function getSalonOrderState(remarks?: string | null): SalonOrderState | null {
  const m = (remarks ?? "").match(MARKER);
  return m ? (m[1] as SalonOrderState) : null;
}

/** The user's own remarks without the marker. */
export function stripSalonMarker(remarks?: string | null): string | null {
  const rest = (remarks ?? "").replace(MARKER, "").trim();
  return rest ? rest : null;
}

/** Remarks with the marker set to `state` (replacing any previous one), keeping the user's own text. */
export function setSalonOrderState(remarks: string | null | undefined, state: SalonOrderState): string {
  const rest = stripSalonMarker(remarks);
  return `[SVC:${state}]${rest ? ` ${rest}` : ""}`;
}
