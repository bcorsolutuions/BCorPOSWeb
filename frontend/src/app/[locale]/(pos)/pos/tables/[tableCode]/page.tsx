"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArrowLeftRight, Combine, Split } from "lucide-react";
import { restaurantLookupService } from "@/lib/api/services/restaurant-lookup-service";
import { useMenuCatalog } from "@/hooks/use-menu-catalog";
import { restaurantOperationsService } from "@/lib/api/services/restaurant-operations-service";
import { kotService } from "@/lib/api/services/kot-service";
import { posService } from "@/lib/api/services/pos-service";
import { inventoryLedgerService } from "@/lib/api/services/inventory-ledger-service";
import { deliveryOrderService } from "@/lib/api/services/delivery-order-service";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { useCurrencyStore } from "@/stores/currency-store";
import { useRouter } from "@/i18n/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MenuGrid } from "@/components/restaurant/menu-grid";
import { OrderCart } from "@/components/restaurant/order-cart";
import { OpenTableDialog } from "@/components/restaurant/open-table-dialog";
import { AddOrderItemDialog } from "@/components/restaurant/add-order-item-dialog";
import { SelectComboOptionsDialog } from "@/components/pos/select-combo-options-dialog";
import { SelectSetMenuOptionsDialog } from "@/components/pos/select-set-menu-options-dialog";
import { OpenItemEntryDialog } from "@/components/pos/open-item-entry-dialog";
import { DeliveryDetailsDialog, type DeliveryDetails } from "@/components/restaurant/delivery-details-dialog";
import { PaymentDialog } from "@/components/pos/payment-dialog";
import { ReceiptDialog } from "@/components/pos/receipt-dialog";
import { SplitBillDialog } from "@/components/restaurant/split-bill-dialog";
import { TransferTableDialog } from "@/components/restaurant/transfer-table-dialog";
import { MergeTablesDialog } from "@/components/restaurant/merge-tables-dialog";
import { SplitTableDialog } from "@/components/restaurant/split-table-dialog";
import {
  buildComboDraftLines,
  buildHeldBillUpdateDto,
  buildSetMenuDraftLines,
  buildSettleBillDto,
  draftLineTotals,
  heldBillToPayments,
  kotDetailToDraftLine,
  kotMappers,
  newDraftId,
  type DraftOrderLine,
  type SplitTableMove,
} from "@/lib/restaurant/kot-mappers";
import { buildComboConsumeLines } from "@/lib/pos/combo-consume";
import { buildSetMenuConsumeLines } from "@/lib/pos/set-menu-consume";
import { comboLookupService } from "@/lib/api/services/combo-lookup-service";
import { setMenuLookupService } from "@/lib/api/services/set-menu-lookup-service";
import { isSetMenuAvailableNow } from "@/lib/restaurant/set-menu-availability";
import { openItemSettingsService } from "@/lib/api/services/open-item-settings-service";
import { usePermission } from "@/hooks/use-permission";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { kotDtoToUpdateInput } from "@/types/restaurant";
import type { KotDto, MenuItemDto } from "@/types/restaurant";
import type { CreatePosDto, PosDto, PosPayment } from "@/types/pos";
import type { ComboDetailDto, ComboMasterDto } from "@/types/combo";
import type { SetMenuGroupItemDto, SetMenuMasterDto } from "@/types/set-menu";
import { formatMoney } from "@/lib/utils";
import { apiErrorMessage } from "@/lib/api-error";
import { PosSetupDialog } from "@/components/pos/pos-setup-dialog";

const FLOOR_STATUS_KEY = "restaurant-floor-status";

export default function TableOrderPage() {
  const params = useParams<{ tableCode: string }>();
  const tableCode = decodeURIComponent(params.tableCode);
  const t = useTranslations("order");
  const tr = useTranslations("restaurant");
  const tc = useTranslations("common");
  const tSetMenu = useTranslations("setMenu");
  const tOpenItem = useTranslations("openItem");
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currencyCode);

  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const userName = useAuthStore((s) => s.user?.userName ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");
  const terminalId = usePosSessionStore((s) => s.terminalId ?? "");
  const shiftNo = usePosSessionStore((s) => s.shiftNo);
  // Billing needs a terminal + open shift (Till Setup). Taking/sending orders doesn't,
  // so the setup dialog is raised only when the cashier goes to bill.
  const [setupOpen, setSetupOpen] = useState(false);
  const withShift = (action: () => void) => {
    if (!terminalId || !shiftNo) setSetupOpen(true);
    else action();
  };

  const { data: floorStatus = [], isLoading: floorStatusLoading } = useQuery({
    queryKey: [FLOOR_STATUS_KEY, compId, siteId],
    queryFn: () => restaurantOperationsService.getFloorStatus(compId, siteId),
    enabled: !!compId && !!siteId,
  });
  const entry = floorStatus.find((e) => e.table.code === tableCode);
  const table = entry?.table;
  const kotDocNo = entry?.openKotDocNo ?? null;
  const heldBillDocNo = entry?.heldBillDocNo ?? null;

  // A table can end up marked OCCUPIED with no open KOT (e.g. seed/demo
  // data, or a network drop between "open table" and "create KOT") — that
  // used to dead-end here: the page loaded with nothing to attach items to,
  // and "Send to Kitchen" failed with a generic error. Route it through the
  // same OpenTableDialog an AVAILABLE table uses instead, so the table
  // self-heals by starting a fresh order. A table holding an unsettled bill
  // (heldBillDocNo set) is a different, legitimate no-KOT state — recall the
  // held bill instead of clobbering it with a fresh order. Must also check
  // currentStatus === "OCCUPIED": right after a normal settle, the KOT just
  // closed (kotDocNo -> null) and there's no held bill either, but the table
  // itself already flipped back to AVAILABLE — without this check that
  // moment was misread as "occupied with no KOT" and popped Open Table right
  // on top of the receipt.
  const needsRecovery =
    !floorStatusLoading && !!table && table.currentStatus === "OCCUPIED" && kotDocNo == null && heldBillDocNo == null;
  const isHeldOnly = heldBillDocNo != null && kotDocNo == null;
  // OpenTableDialog's onOpenChange(false) fires identically on success and
  // on Cancel/Escape — this flag, set only from onSuccess, tells the two
  // apart so a successful recovery doesn't get treated as a dismissal and
  // bounced back to the floor map.
  const recoverySucceededRef = useRef(false);

  const { data: kot } = useQuery({
    queryKey: ["kot", compId, siteId, kotDocNo],
    queryFn: () => kotService.get(compId, siteId, kotDocNo as number),
    enabled: !!compId && !!siteId && kotDocNo != null,
  });

  const { data: heldPos } = useQuery({
    queryKey: ["pos", compId, siteId, heldBillDocNo],
    queryFn: () => posService.get(compId, siteId, heldBillDocNo as number),
    enabled: !!compId && !!siteId && heldBillDocNo != null,
  });

  const { categories, subCategories, items } = useMenuCatalog(compId, siteId);
  const { data: modifierGroups = [] } = useQuery({
    queryKey: ["modifier-groups", compId],
    queryFn: () => restaurantLookupService.getModifierGroups(compId),
    enabled: !!compId,
  });
  const { data: modifiers = [] } = useQuery({
    queryKey: ["modifiers", compId],
    queryFn: () => restaurantLookupService.getModifiers(compId),
    enabled: !!compId,
  });
  const { data: orderTypes = [] } = useQuery({
    queryKey: ["restaurant-order-types", compId],
    queryFn: () => restaurantLookupService.getOrderTypes(compId),
    enabled: !!compId,
  });
  const { data: combos = [] } = useQuery({
    queryKey: ["pos-combo-search", compId, siteId],
    queryFn: () => comboLookupService.search(compId, siteId),
    enabled: !!compId && !!siteId,
  });
  const { data: setMenus = [] } = useQuery({
    queryKey: ["pos-set-menu-search", compId, siteId],
    queryFn: () => setMenuLookupService.search(compId, siteId),
    enabled: !!compId && !!siteId,
  });
  const { can } = usePermission();
  const { data: openItemSettings } = useQuery({
    queryKey: ["open-item-settings", compId, siteId],
    queryFn: () => openItemSettingsService.getBySite(compId, siteId),
    enabled: !!compId && !!siteId,
  });

  // Delivery/Online-Delivery order types are flagged RequiresAddress/
  // RequiresDriver on OrderTypeMaster — when the table's KOT is one of
  // those, settling first captures customer/address details (not persisted
  // on the KOT itself) and auto-creates the tracked DeliveryOrder right
  // after the bill is created.
  const currentOrderType = orderTypes.find((o) => o.code === kot?.orderTypeCode);
  const needsDeliveryDetails = !!(currentOrderType?.requiresAddress || currentOrderType?.requiresDriver);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [pendingItem, setPendingItem] = useState<MenuItemDto | null>(null);
  const [pickingCombo, setPickingCombo] = useState<ComboMasterDto | null>(null);
  const [pickingSetMenu, setPickingSetMenu] = useState<SetMenuMasterDto | null>(null);
  const [openItemDialogOpen, setOpenItemDialogOpen] = useState(false);
  const [draftLines, setDraftLines] = useState<DraftOrderLine[]>([]);
  const [deliveryDetailsOpen, setDeliveryDetailsOpen] = useState(false);
  const [pendingDeliveryDetails, setPendingDeliveryDetails] = useState<DeliveryDetails | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [recallOpen, setRecallOpen] = useState(false);
  const [splitBillOpen, setSplitBillOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [splitTableOpen, setSplitTableOpen] = useState(false);
  const [receiptPos, setReceiptPos] = useState<PosDto | null>(null);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);

  // Seed local draft lines from the KOT once per KOT identity — not on
  // every background refetch, or in-progress local edits (items just added
  // but not yet "Sent to Kitchen") would get clobbered by a poll.
  useEffect(() => {
    if (kot) setDraftLines(kot.details.filter((d) => !d.cancelled).map(kotDetailToDraftLine));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kot?.id]);

  function handleAddLine(line: Omit<DraftOrderLine, "draftId">) {
    setDraftLines((prev) => [...prev, { ...line, draftId: newDraftId() }]);
  }

  function handleRemoveLine(draftId: string) {
    setDraftLines((prev) => prev.filter((l) => l.draftId !== draftId));
  }

  // A combo-flagged menu tile (MenuMaster.IsComboItem, linked back to its
  // ComboMaster row via ComboMaster.MenuCode) opens the shared picker
  // instead of the normal single-item AddOrderItemDialog flow.
  function handleSelectItem(item: MenuItemDto) {
    if (item.isComboItem) {
      const combo = combos.find((c) => c.menuCode === item.code);
      if (combo) {
        setPickingCombo(combo);
        return;
      }
    }
    if (item.isSetMenuItem) {
      const setMenu = setMenus.find((s) => s.menuCode === item.code);
      if (setMenu) {
        // §5: the tile stays tappable even outside its serving window — the
        // block happens here, on tap, with a message, not by hiding it.
        if (!isSetMenuAvailableNow(setMenu)) {
          toast({ title: tSetMenu("unavailable"), variant: "destructive" });
          return;
        }
        setPickingSetMenu(setMenu);
        return;
      }
    }
    setPendingItem(item);
  }

  function resolveComboComponentName(d: ComboDetailDto): string {
    if (d.componentType === "Menu") return items.find((i) => i.code === d.menuCode)?.menuName ?? d.menuCode ?? "";
    if (d.componentType === "Inventory") return d.inventoryCode ?? "";
    return d.serviceCode ?? "";
  }

  function resolveComboComponentKitchenCode(d: ComboDetailDto): string | null | undefined {
    return d.componentType === "Menu" ? items.find((i) => i.code === d.menuCode)?.kitchenCode : null;
  }

  function resolveSetMenuComponentName(i: SetMenuGroupItemDto): string {
    return items.find((it) => it.code === i.menuCode)?.menuName ?? i.menuCode;
  }

  function resolveSetMenuComponentKitchenCode(i: SetMenuGroupItemDto): string | null | undefined {
    return items.find((it) => it.code === i.menuCode)?.kitchenCode;
  }

  function handleSettleClick() {
    setCartSheetOpen(false);
    withShift(() => (needsDeliveryDetails ? setDeliveryDetailsOpen(true) : setPaymentOpen(true)));
  }

  // Persists draftLines into the KOT, optionally closing it in the same
  // call — shared by "Send to Kitchen" (never closes), Settle/Hold (always
  // close, in one round trip), and Split Bill (syncs once with the KOT left
  // open so cancelling out of the dialog is a no-op, then closes once the
  // staff commits to paying).
  async function syncKot(close: boolean): Promise<KotDto> {
    if (!kot) throw new Error("No open order for this table.");
    const dto = kotDtoToUpdateInput(kot);
    dto.details = draftLines.map(kotMappers.draftToUpdateDetail);
    if (close) dto.kotStatus = "CLOSED";
    return kotService.update(compId, siteId, userName, kot.docNo, dto);
  }

  const sendMutation = useMutation({
    mutationFn: () => syncKot(false),
    onSuccess: (updated) => {
      toast({ title: t("orderSent") });
      queryClient.setQueryData(["kot", compId, siteId, kotDocNo], updated);
      queryClient.invalidateQueries({ queryKey: [FLOOR_STATUS_KEY] });
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  // The bill is built from the closed KOT, so the KOT has to close first. If the bill then
  // can't be saved (shift day-closed, validation, network), put the KOT back — otherwise the
  // table is left OCCUPIED with no order and no bill.
  async function createBillOrReopenKot(closedKot: KotDto, posDto: ReturnType<typeof buildSettleBillDto>) {
    try {
      return await posService.create(compId, siteId, userName, posDto);
    } catch (err) {
      try {
        const reopen = kotDtoToUpdateInput(closedKot);
        reopen.kotStatus = kot?.kotStatus ?? "OPEN";
        await kotService.update(compId, siteId, userName, closedKot.docNo, reopen);
        queryClient.invalidateQueries({ queryKey: ["kot", compId, siteId, kotDocNo] });
        queryClient.invalidateQueries({ queryKey: [FLOOR_STATUS_KEY] });
      } catch {
        // Couldn't reopen — the table's Clear Table / recovery path still frees it.
      }
      throw err;
    }
  }

  // The bill is already saved by now; a refused close just means the table still has another
  // open order or held bill on it, which is the correct state to leave it in.
  async function closeTableBestEffort() {
    try {
      await restaurantOperationsService.closeTable(compId, siteId, tableCode, userName);
    } catch {
      // see above
    }
  }

  const settleMutation = useMutation({
    mutationFn: async (payments: PosPayment[]) => {
      // Persist any not-yet-sent edits before settling so the bill matches what's on screen.
      const closedKot = await syncKot(true);
      const posDto = buildSettleBillDto({ kot: closedKot, payments, terminalId, shiftNo });
      const pos = await createBillOrReopenKot(closedKot, posDto);
      await closeTableBestEffort();
      return pos;
    },
    onSuccess: (pos) => {
      toast({ title: t("billSettled") });
      setPaymentOpen(false);
      setReceiptPos(pos);
      queryClient.invalidateQueries({ queryKey: [FLOOR_STATUS_KEY] });

      // Best-effort: post recipe-ingredient consumption for this bill's
      // lines. Non-recipe lines are silently skipped server-side. Not
      // awaited/blocking — a ledger-post failure shouldn't undo an already
      // -settled bill. Combo/Set-Menu-tagged draft lines (the priced carrier
      // and its zero-rated kitchen siblings) are excluded here and consumed
      // instead via buildComboConsumeLines/buildSetMenuConsumeLines, which
      // read the settled PosDet's ComboComponentsJson/SetMenuComponentsJson
      // snapshot — sending them through both paths would double-post the
      // same physical stock movement.
      const ordinaryLines = draftLines.filter((l) => !l.comboInstanceId && !l.setMenuInstanceId);
      const comboLines = buildComboConsumeLines(pos);
      const setMenuLines = buildSetMenuConsumeLines(pos);
      const consumeLines = [
        ...ordinaryLines.map((l) => ({ itemCode: l.menuCode, quantity: l.qty })),
        ...comboLines,
        ...setMenuLines,
      ];
      if (consumeLines.length > 0) {
        inventoryLedgerService
          .consumeRecipe(compId, siteId, {
            refDocNo: pos.refNo ?? String(pos.docNo),
            docNo: pos.docNo,
            lines: consumeLines,
          })
          .catch(() => {});
      }

      // Auto-create the tracked delivery order right when a Delivery/Online-
      // Delivery bill settles — best-effort, same reasoning as above.
      if (pendingDeliveryDetails) {
        deliveryOrderService
          .create(compId, siteId, userName, {
            docDt: new Date().toISOString(),
            posRefNo: pos.refNo ?? String(pos.docNo),
            customerName: pendingDeliveryDetails.customerName,
            customerPhone: pendingDeliveryDetails.customerPhone,
            address: pendingDeliveryDetails.address,
          })
          .catch(() => {});
        setPendingDeliveryDetails(null);
      }
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  // Parks the current KOT as a "Held" bill on the table (partial or no
  // payment yet) instead of completing the sale — the table stays occupied
  // (RestaurantOperationsController.CloseTable refuses to free a table with
  // a held bill) and floor-status starts reporting heldBillDocNo, which is
  // what drives the recall screen below.
  const holdMutation = useMutation({
    mutationFn: async (payments: PosPayment[]) => {
      const closedKot = await syncKot(true);
      const posDto = buildSettleBillDto({ kot: closedKot, payments, terminalId, shiftNo, status: "Held" });
      return createBillOrReopenKot(closedKot, posDto);
    },
    onSuccess: () => {
      toast({ title: t("billOnHold") });
      setPaymentOpen(false);
      queryClient.invalidateQueries({ queryKey: [FLOOR_STATUS_KEY] });
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  // Completes a previously held bill: replaces its tenders with whatever's
  // in the recall dialog and flips it to Completed, then frees the table.
  const recallCompleteMutation = useMutation({
    mutationFn: async (payments: PosPayment[]) => {
      if (!heldPos) throw new Error("No held bill for this table.");
      const updateDto = buildHeldBillUpdateDto(heldPos, payments, "Completed");
      const pos = await posService.update(compId, siteId, userName, heldPos.docNo, updateDto);
      await closeTableBestEffort();
      return pos;
    },
    onSuccess: (pos) => {
      toast({ title: t("billSettled") });
      setRecallOpen(false);
      setReceiptPos(pos);
      queryClient.invalidateQueries({ queryKey: [FLOOR_STATUS_KEY] });

      // Best-effort: post recipe-ingredient consumption now that the held
      // bill is actually completing — holdMutation never posts this (the
      // order wasn't final yet), so this is the first and only point a
      // recalled-and-completed bill's stock gets decremented. Same
      // ordinary/combo/set-menu split and double-post reasoning as
      // settleMutation.
      const ordinaryLines = pos.details
        .filter((d) => !d.comboCode && !d.setMenuCode)
        .map((d) => ({ itemCode: d.itemCode, quantity: d.quantity }));
      const comboLines = buildComboConsumeLines(pos);
      const setMenuLines = buildSetMenuConsumeLines(pos);
      const consumeLines = [...ordinaryLines, ...comboLines, ...setMenuLines];
      if (consumeLines.length > 0) {
        inventoryLedgerService
          .consumeRecipe(compId, siteId, {
            refDocNo: pos.refNo ?? String(pos.docNo),
            docNo: pos.docNo,
            lines: consumeLines,
          })
          .catch(() => {});
      }
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  // Saves additional tenders against a held bill without completing it —
  // e.g. the guest paid part of the balance and will settle the rest later.
  const recallHoldMutation = useMutation({
    mutationFn: async (payments: PosPayment[]) => {
      if (!heldPos) throw new Error("No held bill for this table.");
      const updateDto = buildHeldBillUpdateDto(heldPos, payments, "Held");
      return posService.update(compId, siteId, userName, heldPos.docNo, updateDto);
    },
    onSuccess: () => {
      toast({ title: t("billOnHold") });
      setRecallOpen(false);
      queryClient.invalidateQueries({ queryKey: ["pos", compId, siteId, heldBillDocNo] });
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  // Splits the table's (already-closed, by the time this fires) KOT into
  // several fully-paid bills in one call. The backend only frees the table
  // once every split is "Completed" — always true here, since SplitBillDialog
  // collects full payment for every split before calling this.
  const splitBillMutation = useMutation({
    mutationFn: (splits: CreatePosDto[]) => restaurantOperationsService.splitBill(compId, siteId, tableCode, splits, userName),
    onSuccess: (results) => {
      toast({ title: t("splitComplete") });
      queryClient.invalidateQueries({ queryKey: [FLOOR_STATUS_KEY] });

      // draftLines only ever gets re-derived from kot.details when kot?.id
      // changes — once the KOT is closed, kot goes undefined and that never
      // fires, so the pre-split items (and the Settle/Split buttons they
      // gate) would otherwise keep showing as if there were still an open
      // order here.
      const splitDraftLines = draftLines;
      setDraftLines([]);

      // Best-effort: post recipe-ingredient consumption once for the whole
      // original order, same reasoning as settleMutation's onSuccess —
      // inventory decrement doesn't care how the check was split. Combo/Set
      // Menu lines are excluded here (Split Bill doesn't carry either
      // feature's fixed price/component snapshot through per-guest splits —
      // see buildEvenSplitDtos/buildByItemSplitDtos) rather than risk a
      // duplicate/incorrect movement; a split combo/set menu's stock isn't
      // consumed by this call.
      const ordinarySplitLines = splitDraftLines.filter((l) => !l.comboInstanceId && !l.setMenuInstanceId);
      if (ordinarySplitLines.length > 0) {
        inventoryLedgerService
          .consumeRecipe(compId, siteId, {
            refDocNo: results[0]?.refNo ?? String(results[0]?.docNo ?? ""),
            docNo: results[0]?.docNo ?? 0,
            lines: ordinarySplitLines.map((l) => ({ itemCode: l.menuCode, quantity: l.qty })),
          })
          .catch(() => {});
      }
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  // Moves this table's open KOT/held bill onto another free table — the
  // source table always ends up AVAILABLE, so there's nothing left here to
  // show; route back to the floor map same as after a settle.
  const transferMutation = useMutation({
    mutationFn: (toTableCode: string) => restaurantOperationsService.transferTable(compId, siteId, tableCode, toTableCode, userName),
    onSuccess: () => {
      toast({ title: tr("transferred") });
      setTransferOpen(false);
      queryClient.invalidateQueries({ queryKey: [FLOOR_STATUS_KEY] });
      router.push("/pos/tables");
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  // Folds one or more other occupied tables onto this one — this table stays
  // occupied (it's the merge target), so just refresh in place.
  const mergeMutation = useMutation({
    mutationFn: (sourceTableCodes: string[]) =>
      restaurantOperationsService.mergeTables(compId, siteId, sourceTableCodes, tableCode, userName),
    onSuccess: () => {
      toast({ title: tr("merged") });
      setMergeOpen(false);
      queryClient.invalidateQueries({ queryKey: [FLOOR_STATUS_KEY] });
      queryClient.invalidateQueries({ queryKey: ["kot", compId, siteId, kotDocNo] });
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  // Moves a chosen quantity of this table's saved order lines onto another
  // table — this table keeps whatever wasn't picked, so refresh both the
  // floor map (destination's status may have changed) and this table's own
  // KOT (its remaining lines/amounts changed server-side).
  const splitTableMutation = useMutation({
    mutationFn: (input: { toTableCode: string; guestCount: number | null; moves: SplitTableMove[] }) =>
      restaurantOperationsService.splitTable(compId, siteId, tableCode, {
        toTableCode: input.toTableCode,
        guestCount: input.guestCount,
        lines: input.moves,
        userName,
      }),
    onSuccess: () => {
      toast({ title: tr("splitTableComplete") });
      setSplitTableOpen(false);
      queryClient.invalidateQueries({ queryKey: [FLOOR_STATUS_KEY] });
      queryClient.invalidateQueries({ queryKey: ["kot", compId, siteId, kotDocNo] });
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  const netTotal = draftLines.reduce((sum, l) => sum + draftLineTotals(l).netAmount, 0);

  return (
    <div className="grid h-full grid-cols-1 gap-4 p-4 pb-24 lg:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)] lg:pb-4">
      <div className="flex min-h-0 min-w-0 flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" onClick={() => router.push("/pos/tables")}>
              ← {tc("back")}
            </Button>
            <h1 className="text-lg font-semibold">
              {table?.tableName ?? tableCode}
              {kot?.guestCount != null && (
                <span className="ms-2 text-sm font-normal text-muted-foreground">
                  ({kot.guestCount} {tr("seats")})
                </span>
              )}
            </h1>
          </div>
          {!needsRecovery && table?.currentStatus === "OCCUPIED" && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setTransferOpen(true)}>
                <ArrowLeftRight className="me-1 h-4 w-4" />
                {tr("transferTable")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMergeOpen(true)}>
                <Combine className="me-1 h-4 w-4" />
                {tr("mergeTables")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!kot || !kot.details.some((d) => !d.cancelled)}
                onClick={() => setSplitTableOpen(true)}
              >
                <Split className="me-1 h-4 w-4" />
                {tr("splitTable")}
              </Button>
            </div>
          )}
        </div>
        {isHeldOnly ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 rounded-lg border p-8 text-center">
            <Archive className="h-10 w-10 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold">{t("billOnHold")}</h2>
              <p className="text-sm text-muted-foreground">{t("recallBillDesc")}</p>
            </div>
            {heldPos && (
              <p className="text-sm">
                {t("paidSoFar")}:{" "}
                <span className="font-semibold tabular-nums">{formatMoney(heldPos.paidAmount, currency, locale)}</span>
                {" / "}
                <span className="font-semibold tabular-nums">{formatMoney(heldPos.netTotal, currency, locale)}</span>
              </p>
            )}
            <Button size="lg" disabled={!heldPos} onClick={() => withShift(() => setRecallOpen(true))}>
              {t("recallBill")}
            </Button>
          </div>
        ) : (
          <>
            {openItemSettings?.enableOpenItem && can(PERMISSIONS.OPEN_ITEM_ADD) && (
              <Button variant="outline" size="sm" className="self-start" onClick={() => setOpenItemDialogOpen(true)}>
                {tOpenItem("openItemButton")}
              </Button>
            )}
            <MenuGrid
              categories={categories}
            subCategories={subCategories}
              items={items}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              onSelectItem={handleSelectItem}
            />
          </>
        )}
      </div>

      {/* Desktop/wide-tablet inline cart panel (>= lg) */}
      {!isHeldOnly && (
        <div className="hidden min-h-0 flex-col gap-3 rounded-lg border bg-card p-3 lg:flex">
          <h2 className="text-sm font-semibold">{t("currentOrder")}</h2>
          <div className="flex-1 overflow-hidden">
            <OrderCart lines={draftLines} onRemove={handleRemoveLine} />
          </div>
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              disabled={draftLines.length === 0 || sendMutation.isPending}
              onClick={() => sendMutation.mutate()}
            >
              {t("sendToKitchen")}
            </Button>
            <Button
              className="w-full"
              disabled={draftLines.length === 0 || settleMutation.isPending}
              onClick={handleSettleClick}
            >
              {t("settleBill")}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              disabled={draftLines.length === 0}
              onClick={() => withShift(() => setSplitBillOpen(true))}
            >
              {t("splitBill")}
            </Button>
          </div>
        </div>
      )}

      {/* Phone/tablet sticky cart bar (< lg) — always visible so a waiter
          sees the running total/item count without scrolling past the
          whole menu; tapping it opens the full cart in a bottom sheet. */}
      {!isHeldOnly && (
        <button
          type="button"
          onClick={() => setCartSheetOpen(true)}
          className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t bg-card p-3 text-start shadow-lg lg:hidden"
        >
          <span className="text-sm font-medium">
            {draftLines.length} {t("items")} · <span className="tabular-nums">{formatMoney(netTotal, currency, locale)}</span>
          </span>
          <span className="text-sm font-semibold text-primary">{t("viewOrder")}</span>
        </button>
      )}

      <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
        <SheetContent side="bottom" className="flex max-h-[85vh] flex-col gap-3 lg:hidden">
          <SheetHeader>
            <SheetTitle>{t("currentOrder")}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <OrderCart lines={draftLines} onRemove={handleRemoveLine} />
          </div>
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              disabled={draftLines.length === 0 || sendMutation.isPending}
              onClick={() => sendMutation.mutate()}
            >
              {t("sendToKitchen")}
            </Button>
            <Button
              className="w-full"
              disabled={draftLines.length === 0 || settleMutation.isPending}
              onClick={handleSettleClick}
            >
              {t("settleBill")}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              disabled={draftLines.length === 0}
              onClick={() => {
                setCartSheetOpen(false);
                withShift(() => setSplitBillOpen(true));
              }}
            >
              {t("splitBill")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <OpenTableDialog
        recovery
        table={needsRecovery ? (table ?? null) : null}
        onSuccess={() => {
          recoverySucceededRef.current = true;
        }}
        onOpenChange={(open) => {
          if (open) return;
          if (recoverySucceededRef.current) {
            recoverySucceededRef.current = false;
            return;
          }
          router.push("/pos/tables");
        }}
      />

      <AddOrderItemDialog
        item={pendingItem}
        modifierGroups={modifierGroups}
        modifiers={modifiers}
        onOpenChange={(open) => !open && setPendingItem(null)}
        onAdd={handleAddLine}
      />

      <OpenItemEntryDialog open={openItemDialogOpen} onOpenChange={setOpenItemDialogOpen} onAdd={handleAddLine} />

      <SelectComboOptionsDialog
        combo={pickingCombo}
        resolveName={resolveComboComponentName}
        resolveKitchenCode={resolveComboComponentKitchenCode}
        onOpenChange={(open) => !open && setPickingCombo(null)}
        onConfirm={(resolvedComponents, quantity) => {
          if (!pickingCombo) return;
          const newLines = buildComboDraftLines(pickingCombo, resolvedComponents, quantity);
          setDraftLines((prev) => [...prev, ...newLines.map((l) => ({ ...l, draftId: newDraftId() }))]);
        }}
      />

      <SelectSetMenuOptionsDialog
        setMenu={pickingSetMenu}
        resolveName={resolveSetMenuComponentName}
        resolveKitchenCode={resolveSetMenuComponentKitchenCode}
        onOpenChange={(open) => !open && setPickingSetMenu(null)}
        onConfirm={(resolvedComponents, quantity) => {
          if (!pickingSetMenu) return;
          const newLines = buildSetMenuDraftLines(pickingSetMenu, resolvedComponents, quantity);
          setDraftLines((prev) => [...prev, ...newLines.map((l) => ({ ...l, draftId: newDraftId() }))]);
        }}
      />

      <DeliveryDetailsDialog
        open={deliveryDetailsOpen}
        onOpenChange={setDeliveryDetailsOpen}
        onConfirm={(details) => {
          setPendingDeliveryDetails(details);
          setDeliveryDetailsOpen(false);
          setPaymentOpen(true);
        }}
      />

      <PosSetupDialog open={setupOpen} onConfigured={() => setSetupOpen(false)} />

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        netTotal={netTotal}
        hasCustomer={!!kot?.customerCode}
        loading={settleMutation.isPending}
        onComplete={(payments) => settleMutation.mutate(payments)}
        onHold={(payments) => holdMutation.mutate(payments)}
        holdLoading={holdMutation.isPending}
      />

      <PaymentDialog
        open={recallOpen}
        onOpenChange={setRecallOpen}
        netTotal={heldPos?.netTotal ?? 0}
        hasCustomer={!!heldPos?.custCode}
        loading={recallCompleteMutation.isPending}
        onComplete={(payments) => recallCompleteMutation.mutate(payments)}
        onHold={(payments) => recallHoldMutation.mutate(payments)}
        holdLoading={recallHoldMutation.isPending}
        initialPayments={heldPos ? heldBillToPayments(heldPos) : []}
      />

      <SplitBillDialog
        open={splitBillOpen}
        onOpenChange={setSplitBillOpen}
        terminalId={terminalId}
        shiftNo={shiftNo}
        onSyncKot={syncKot}
        onSubmitSplits={(splits) => splitBillMutation.mutateAsync(splits)}
        submitting={splitBillMutation.isPending}
        onDone={() => router.push("/pos/tables")}
      />

      <ReceiptDialog open={!!receiptPos} onOpenChange={(open) => !open && router.push("/pos/tables")} pos={receiptPos} />

      <TransferTableDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        fromTableCode={tableCode}
        entries={floorStatus}
        onConfirm={(toTableCode) => transferMutation.mutate(toTableCode)}
        submitting={transferMutation.isPending}
      />

      <MergeTablesDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        targetTableCode={tableCode}
        entries={floorStatus}
        onConfirm={(sourceTableCodes) => mergeMutation.mutate(sourceTableCodes)}
        submitting={mergeMutation.isPending}
      />

      <SplitTableDialog
        open={splitTableOpen}
        onOpenChange={setSplitTableOpen}
        fromTableCode={tableCode}
        lines={(kot?.details ?? []).filter((d) => !d.cancelled).map(kotDetailToDraftLine)}
        entries={floorStatus}
        onConfirm={(input) => splitTableMutation.mutate(input)}
        submitting={splitTableMutation.isPending}
      />
    </div>
  );
}
