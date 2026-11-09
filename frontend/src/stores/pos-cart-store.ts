import { newUuid } from "@/lib/utils";
import { create } from "zustand";
import { calcBillTotals } from "@/lib/pos/calc";
import { posDtoToCartLines } from "@/lib/pos/mappers";
import type { ItemSearchResult } from "@/types/pos-lookups";
import type { ServiceDto, StaffDto } from "@/types/salon";
import type { PosBillTotals, PosCartLine, PosDto, PosPayment } from "@/types/pos";
import type { PromotionEvaluationResult } from "@/types/promotion-engine";
import type { ComboMasterDto, ResolvedComboComponent } from "@/types/combo";

function newLineId(): string {
  return newUuid();
}

interface PosCartState {
  lines: PosCartLine[];
  payments: PosPayment[];
  customerCode: string | null;
  customerName: string | null;
  salesManCode: string | null;
  billDiscountAmount: number;
  isReturn: boolean;
  /** Ref No of the original bill when isReturn — saved as the return's SORefNo. */
  returnRefNo: string | null;
  /** Set when a held bill was recalled — saving again UPDATEs that doc instead of creating a new one. */
  activeDocNo: number | null;
  remarks: string | null;

  // Bill-level Promotion Engine result (e.g. Happy Hour, "spend X get Y
  // off") — separate scope from any per-line promotionCode/discount above.
  // See hooks/use-promotion-evaluation.ts.
  billPromotionCode: string | null;
  billPromotionName: string | null;
  billPromotionDiscountAmount: number;

  // Standalone coupon (CouponMaster) — a genuinely separate mechanism from
  // billPromotion* above (that one is the Promotion Engine's own result).
  // Exactly one coupon per bill. See hooks/use-coupon-apply.ts.
  couponCode: string | null;
  couponName: string | null;
  couponDiscountAmount: number;

  addItem: (item: ItemSearchResult, quantity?: number) => void;
  addServiceLine: (service: ServiceDto, staff: StaffDto | null, quantity?: number) => void;
  /** Combo Items — bills as ONE line at combo.sellingPrice + selected AdditionalPrice components. resolvedComponents is the picker's "as sold" breakdown (post substitution/opt-out), snapshotted onto the line for lib/pos/mappers.ts to serialize. */
  addComboLine: (combo: ComboMasterDto, resolvedComponents: ResolvedComboComponent[], quantity?: number) => void;
  /** Sells a Gift Voucher — a new, untaxed line at the cashier-entered denomination. Never merges (each voucher sale is its own instrument, like a weighed item). RecipientName/Mobile aren't collected here (v1 keeps this a plain fast-sale line) — they can be added afterward on the issued voucher via the Gift Voucher Master admin screen. See PosController.cs's IssueGiftVouchersIfNeededAsync for how the voucher is actually created server-side. */
  addGiftVoucherSaleLine: (amount: number) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  removeLine: (lineId: string) => void;
  /** Supermarket checkout: the cart line whose quantity the number box edits (tap a row to select it). */
  selectedLineId: string | null;
  selectLine: (lineId: string | null) => void;
  setLineDiscount: (lineId: string, discountAmt: number) => void;
  overrideLinePrice: (lineId: string, newPrice: number, approvedBy: string) => void;
  setCustomer: (code: string | null, name: string | null) => void;
  /** Salesman is looked up by code only — the name comes from the Salesman master, not stored on the document. */
  setSalesman: (code: string | null) => void;
  setBillDiscount: (amount: number) => void;
  setRemarks: (remarks: string | null) => void;
  addPayment: (payment: PosPayment) => void;
  removePayment: (index: number) => void;
  clearPayments: () => void;
  startReturn: (pos: PosDto) => void;
  loadHeldBill: (pos: PosDto) => void;
  /** Stamps a fresh Promotion Engine evaluation onto the cart — per-line promo fields/prices, the bill-level promo, and any auto-inserted "free item" bonus lines (added/removed/re-quantified to match the result). See hooks/use-promotion-evaluation.ts. */
  applyPromotionResults: (result: PromotionEvaluationResult) => void;
  /** Stamps a successful coupon validation onto the cart. See hooks/use-coupon-apply.ts. */
  applyCoupon: (result: { code: string; name: string | null; discountAmount: number }) => void;
  removeCoupon: () => void;
  clear: () => void;
  totals: () => PosBillTotals;
  paidTotal: () => number;
  balanceDue: () => number;
}

const initialState = {
  lines: [] as PosCartLine[],
  selectedLineId: null as string | null,
  payments: [] as PosPayment[],
  customerCode: null as string | null,
  customerName: null as string | null,
  salesManCode: null as string | null,
  billDiscountAmount: 0,
  isReturn: false,
  returnRefNo: null as string | null,
  activeDocNo: null as number | null,
  remarks: null as string | null,
  billPromotionCode: null as string | null,
  billPromotionName: null as string | null,
  billPromotionDiscountAmount: 0,
  couponCode: null as string | null,
  couponName: null as string | null,
  couponDiscountAmount: 0,
};

export const usePosCartStore = create<PosCartState>((set, get) => ({
  ...initialState,

  addItem: (item, quantity = 1) =>
    set((state) => {
      // Weighed items never merge — each scanned sticker is its own parcel
      // with its own weight (quantity here IS the weight in kg), so summing
      // two scans into one line would be meaningless. Always a new line.
      const existing = item.isWeighted
        ? undefined
        : state.lines.find((l) => l.itemCode === item.code);
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.lineId === existing.lineId ? { ...l, quantity: l.quantity + quantity } : l,
          ),
        };
      }
      const newLine: PosCartLine = {
        lineId: newLineId(),
        itemCode: item.code,
        name: item.name,
        barcode: item.barCode,
        unitCode: item.unitCode,
        categoryCode: item.categoryCode,
        brandCode: item.brandCode,
        imagePath: item.imagePath,
        unitPrice: item.price ?? 0,
        quantity,
        discountPerc: 0,
        discountAmt: 0,
        taxCode: item.taxCode,
        taxPercentage: item.taxRate ?? 0,
        costAmount: 0,
        isWeighted: item.isWeighted,
      };
      return { lines: [...state.lines, newLine] };
    }),

  addServiceLine: (service, staff, quantity = 1) =>
    set((state) => {
      // Merge only when the same service AND the same staff are picked again
      // — the same service performed by two different staff members must
      // stay two separate lines (each carries its own commission).
      const existing = state.lines.find(
        (l) => l.lineType === "Service" && l.serviceCode === service.code && l.staffCode === (staff?.code ?? null),
      );
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.lineId === existing.lineId ? { ...l, quantity: l.quantity + quantity } : l,
          ),
        };
      }
      const newLine: PosCartLine = {
        lineId: newLineId(),
        lineType: "Service",
        itemCode: service.code,
        name: service.serviceName,
        unitPrice: service.rate,
        quantity,
        discountPerc: 0,
        discountAmt: 0,
        taxCode: service.taxCode ?? undefined,
        taxPercentage: service.taxPercentage ?? 0,
        costAmount: 0,
        serviceCode: service.code,
        staffCode: staff?.code ?? null,
        staffName: staff?.staffName ?? null,
        commissionPercent: staff?.commissionPercent ?? null,
      };
      return { lines: [...state.lines, newLine] };
    }),

  addGiftVoucherSaleLine: (amount) =>
    set((state) => {
      const newLine: PosCartLine = {
        lineId: newLineId(),
        lineType: "GiftVoucherSale",
        itemCode: "GIFTVOUCHER",
        name: "Gift Voucher",
        unitPrice: amount,
        quantity: 1,
        discountPerc: 0,
        discountAmt: 0,
        taxPercentage: 0,
        costAmount: 0,
        isGiftVoucherSale: true,
      };
      return { lines: [...state.lines, newLine] };
    }),

  // Pipeline step 3 (see PosController.cs's class-level doc comment) —
  // resolved here, necessarily BEFORE step 2 (line promotion) ever runs:
  // the promotion evaluation needs this line's final unitPrice already in
  // hand to compute a %/amount discount against. The numbered pipeline is
  // a conceptual layering (each step operates on the previous step's
  // output), not a literal "3 always executes after 2" call order.
  addComboLine: (combo, resolvedComponents, quantity = 1) =>
    set((state) => {
      const selectionKey = JSON.stringify(
        resolvedComponents
          .filter((c) => c.selected)
          .map((c) => ({ t: c.componentType, c: c.code }))
          .sort((a, b) => (a.c < b.c ? -1 : a.c > b.c ? 1 : 0)),
      );
      // Two combos of the same code only merge when they resolved to the
      // exact same selection — different substitutions/opt-outs are
      // meaningfully different lines, not a quantity bump on one line.
      const existing = state.lines.find(
        (l) =>
          l.lineType === "Combo" &&
          l.comboCode === combo.code &&
          JSON.stringify(
            (l.comboComponents ?? [])
              .filter((c) => c.selected)
              .map((c) => ({ t: c.componentType, c: c.code }))
              .sort((a, b) => (a.c < b.c ? -1 : a.c > b.c ? 1 : 0)),
          ) === selectionKey,
      );
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.lineId === existing.lineId ? { ...l, quantity: l.quantity + quantity } : l,
          ),
        };
      }

      const additionalPrice = resolvedComponents
        .filter((c) => c.selected)
        .reduce((sum, c) => sum + (c.additionalPrice || 0), 0);

      const newLine: PosCartLine = {
        lineId: newLineId(),
        lineType: "Combo",
        itemCode: combo.code,
        name: combo.comboName,
        unitPrice: combo.sellingPrice + additionalPrice,
        quantity,
        discountPerc: 0,
        discountAmt: 0,
        taxCode: combo.taxCode,
        taxPercentage: combo.taxPercent ?? 0,
        costAmount: 0,
        comboCode: combo.code,
        comboComponents: resolvedComponents,
      };
      return { lines: [...state.lines, newLine] };
    }),

  updateQuantity: (lineId, quantity) =>
    set((state) => ({
      lines:
        quantity <= 0
          ? state.lines.filter((l) => l.lineId !== lineId)
          : state.lines.map((l) => (l.lineId === lineId ? { ...l, quantity } : l)),
    })),

  removeLine: (lineId) =>
    set((state) => ({
      lines: state.lines.filter((l) => l.lineId !== lineId),
      selectedLineId: state.selectedLineId === lineId ? null : state.selectedLineId,
    })),

  selectLine: (lineId) => set({ selectedLineId: lineId }),

  setLineDiscount: (lineId, discountAmt) =>
    set((state) => ({
      lines: state.lines.map((l) => (l.lineId === lineId ? { ...l, discountAmt } : l)),
    })),

  overrideLinePrice: (lineId, newPrice, approvedBy) =>
    set((state) => ({
      lines: state.lines.map((l) =>
        l.lineId === lineId
          ? { ...l, originalUnitPrice: l.originalUnitPrice ?? l.unitPrice, unitPrice: newPrice, priceOverrideBy: approvedBy }
          : l,
      ),
    })),

  setCustomer: (customerCode, customerName) => set({ customerCode, customerName }),
  setSalesman: (salesManCode) => set({ salesManCode }),
  setBillDiscount: (billDiscountAmount) => set({ billDiscountAmount }),
  setRemarks: (remarks) => set({ remarks }),

  addPayment: (payment) => set((state) => ({ payments: [...state.payments, payment] })),
  removePayment: (index) => set((state) => ({ payments: state.payments.filter((_, i) => i !== index) })),
  clearPayments: () => set({ payments: [] }),

  /** Loads a previously completed sale as a Return bill: same lines, quantities kept positive here — sign flip happens at save time (see lib/pos/mappers.ts's `isReturn`). */
  startReturn: (pos) =>
    set({
      ...initialState,
      isReturn: true,
      returnRefNo: pos.refNo ?? null,
      customerCode: pos.custCode,
      customerName: pos.custName,
      lines: posDtoToCartLines(pos).map((l) => ({ ...l, refDocNo: pos.docNo, refRowId: null })),
    }),

  loadHeldBill: (pos) =>
    set({
      ...initialState,
      activeDocNo: pos.docNo,
      customerCode: pos.custCode,
      customerName: pos.custName,
      salesManCode: pos.salesManCode,
      remarks: pos.remarks,
      lines: posDtoToCartLines(pos),
      // promotionName isn't persisted (PosHdr only stores the code) — shows
      // as the code until use-promotion-evaluation.ts re-evaluates.
      billPromotionCode: pos.promotionCode ?? null,
      billPromotionName: pos.promotionCode ?? null,
      billPromotionDiscountAmount: pos.promotionDiscountAmount ?? 0,
      // couponName isn't persisted (PosHdr only stores the code) — shows as
      // the code until the cashier re-Applies or removes it.
      couponCode: pos.couponCode ?? null,
      couponName: pos.couponCode ?? null,
      couponDiscountAmount: pos.couponDiscountAmount ?? 0,
    }),

  applyPromotionResults: (result) =>
    set((state) => {
      let lines = state.lines.map((l) => {
        const lineResult = result.lineResults.find((r) => r.lineId === l.lineId && !r.isFreeItemLine);
        if (!lineResult) {
          // A fresh evaluation reports the full current state — no result
          // for this line means whatever it had before no longer applies.
          if (l.promotionCode || l.promotionDiscountAmount) {
            return { ...l, promotionCode: null, promotionName: null, promotionDiscountAmount: 0 };
          }
          return l;
        }
        return {
          ...l,
          unitPrice: lineResult.resolvedUnitPrice ?? l.unitPrice,
          promotionCode: lineResult.promotionCode ?? null,
          promotionName: lineResult.promotionName ?? null,
          promotionDiscountAmount: lineResult.promotionDiscountAmount,
        };
      });

      // Auto-inserted "free item" bonus lines (FREE_ITEM/BUY_X_GET_Y with a
      // FreeItemCode) — the engine only reports numbers, this store owns
      // actually adding/re-quantifying/removing the cart line.
      const freeResults = result.lineResults.filter((r) => r.isFreeItemLine && r.freeItemCode);
      lines = lines.filter((l) => !l.isPromotionFreeLine || freeResults.some((r) => r.freeItemCode === l.itemCode));

      for (const freeResult of freeResults) {
        const freeQty = freeResult.freeItemQuantity ?? 1;
        const existingFreeLine = lines.find((l) => l.isPromotionFreeLine && l.itemCode === freeResult.freeItemCode);
        if (existingFreeLine) {
          lines = lines.map((l) =>
            l === existingFreeLine
              ? {
                  ...l,
                  quantity: freeQty,
                  promotionCode: freeResult.promotionCode ?? null,
                  promotionName: freeResult.promotionName ?? null,
                  promotionDiscountAmount: freeResult.promotionDiscountAmount,
                }
              : l,
          );
        } else {
          lines = [
            ...lines,
            {
              lineId: newLineId(),
              itemCode: freeResult.freeItemCode!,
              name: freeResult.promotionName ? `${freeResult.promotionName} (Free)` : "Free Item",
              unitPrice: freeQty > 0 ? freeResult.promotionDiscountAmount / freeQty : 0,
              quantity: freeQty,
              discountPerc: 0,
              discountAmt: 0,
              taxPercentage: 0,
              costAmount: 0,
              promotionCode: freeResult.promotionCode ?? null,
              promotionName: freeResult.promotionName ?? null,
              promotionDiscountAmount: freeResult.promotionDiscountAmount,
              isPromotionFreeLine: true,
            },
          ];
        }
      }

      return {
        lines,
        billPromotionCode: result.billResult?.promotionCode ?? null,
        billPromotionName: result.billResult?.promotionName ?? null,
        billPromotionDiscountAmount: result.billResult?.promotionDiscountAmount ?? 0,
      };
    }),

  applyCoupon: (result) =>
    set({
      couponCode: result.code,
      couponName: result.name,
      couponDiscountAmount: result.discountAmount,
    }),

  removeCoupon: () => set({ couponCode: null, couponName: null, couponDiscountAmount: 0 }),

  clear: () => set({ ...initialState }),

  totals: () =>
    calcBillTotals(get().lines, get().billDiscountAmount, get().billPromotionDiscountAmount, get().couponDiscountAmount),
  paidTotal: () => get().payments.reduce((sum, p) => sum + p.amount, 0),
  balanceDue: () => Math.max(0, get().totals().netTotal - get().paidTotal()),
}));
