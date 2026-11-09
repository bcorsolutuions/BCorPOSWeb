import type { ConsumeLedgerLine } from "@/lib/api/services/inventory-ledger-service";
import type { PosDto } from "@/types/pos";
import type { ResolvedComboComponent } from "@/types/combo";

/**
 * Builds the InventoryLedger "consume" lines for every combo-tagged detail
 * row on a just-settled sale — one line per SELECTED real component (an
 * opted-out optional component or an unpicked substitute-group alternative
 * is skipped). Explodes from the persisted ComboComponentsJson snapshot
 * (never a live re-query of ComboMaster.Details), so a later edit to the
 * combo's master definition never changes what an already-completed sale is
 * understood to have consumed. Shared by both settle flows (restaurant
 * table-order and retail) — see kind-crafting-hamming.md's Combo Items plan.
 */
export function buildComboConsumeLines(pos: PosDto): ConsumeLedgerLine[] {
  const lines: ConsumeLedgerLine[] = [];
  for (const det of pos.details) {
    if (!det.comboCode || !det.comboComponentsJson) continue;
    let components: ResolvedComboComponent[];
    try {
      components = JSON.parse(det.comboComponentsJson) as ResolvedComboComponent[];
    } catch {
      continue;
    }
    const comboQty = Math.abs(det.quantity);
    for (const c of components) {
      if (!c.selected || c.componentType === "Service") continue;
      const qty = c.qty * comboQty;
      if (qty <= 0) continue;
      lines.push({
        itemCode: c.code,
        quantity: qty,
        componentType: c.componentType,
        unitCode: c.unitCode ?? undefined,
      });
    }
  }
  return lines;
}
