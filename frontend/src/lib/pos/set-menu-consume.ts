import type { ConsumeLedgerLine } from "@/lib/api/services/inventory-ledger-service";
import type { PosDto } from "@/types/pos";
import type { ResolvedSetMenuComponent } from "@/types/set-menu";

/**
 * Builds the InventoryLedger "consume" lines for every Set Menu-tagged
 * detail row on a just-settled sale — one line per SELECTED course choice.
 * Explodes from the persisted SetMenuComponentsJson snapshot (never a live
 * re-query of SetMenuMaster's groups/items), same rationale as
 * lib/pos/combo-consume.ts's buildComboConsumeLines. Selected components
 * are always plain MenuMaster codes (componentType "Menu" — a Set Menu has
 * no Inventory/Service component types the way Combo does), so
 * ConsumeRecipeAsync's default "Menu" path explodes any recipe-flagged
 * choice into its ingredients unchanged — no backend work needed for this.
 */
export function buildSetMenuConsumeLines(pos: PosDto): ConsumeLedgerLine[] {
  const lines: ConsumeLedgerLine[] = [];
  for (const det of pos.details) {
    if (!det.setMenuCode || !det.setMenuComponentsJson) continue;
    let components: ResolvedSetMenuComponent[];
    try {
      components = JSON.parse(det.setMenuComponentsJson) as ResolvedSetMenuComponent[];
    } catch {
      continue;
    }
    const setMenuQty = Math.abs(det.quantity);
    for (const c of components) {
      if (!c.selected) continue;
      const qty = c.qty * setMenuQty;
      if (qty <= 0) continue;
      lines.push({
        itemCode: c.code,
        quantity: qty,
        unitCode: c.unitCode ?? undefined,
      });
    }
  }
  return lines;
}
