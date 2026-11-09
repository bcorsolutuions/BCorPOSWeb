"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { restaurantLookupService } from "@/lib/api/services/restaurant-lookup-service";
import { useMenuCatalog } from "@/hooks/use-menu-catalog";
import { restaurantOperationsService } from "@/lib/api/services/restaurant-operations-service";
import { kotService } from "@/lib/api/services/kot-service";
import { posService } from "@/lib/api/services/pos-service";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { useRouter } from "@/i18n/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MenuGrid } from "@/components/restaurant/menu-grid";
import { OrderCart } from "@/components/restaurant/order-cart";
import { AddOrderItemDialog } from "@/components/restaurant/add-order-item-dialog";
import { SelectComboOptionsDialog } from "@/components/pos/select-combo-options-dialog";
import { SelectSetMenuOptionsDialog } from "@/components/pos/select-set-menu-options-dialog";
import { PaymentDialog } from "@/components/pos/payment-dialog";
import { ReceiptDialog } from "@/components/pos/receipt-dialog";
import {
  buildComboDraftLines,
  buildSetMenuDraftLines,
  buildSettleBillDto,
  draftLineTotals,
  kotDetailToDraftLine,
  kotMappers,
  newDraftId,
  type DraftOrderLine,
} from "@/lib/restaurant/kot-mappers";
import { buildComboConsumeLines } from "@/lib/pos/combo-consume";
import { buildSetMenuConsumeLines } from "@/lib/pos/set-menu-consume";
import { comboLookupService } from "@/lib/api/services/combo-lookup-service";
import { setMenuLookupService } from "@/lib/api/services/set-menu-lookup-service";
import { isSetMenuAvailableNow } from "@/lib/restaurant/set-menu-availability";
import { inventoryLedgerService } from "@/lib/api/services/inventory-ledger-service";
import { kotDtoToUpdateInput } from "@/types/restaurant";
import type { MenuItemDto } from "@/types/restaurant";
import type { PosPayment, PosDto } from "@/types/pos";
import type { ComboDetailDto, ComboMasterDto } from "@/types/combo";
import type { SetMenuGroupItemDto, SetMenuMasterDto } from "@/types/set-menu";
import { apiErrorMessage } from "@/lib/api-error";
import { PosSetupDialog } from "@/components/pos/pos-setup-dialog";

/**
 * Bar Counter Management §11 — Open Tab ordering screen. A lightweight
 * sibling of pos/tables/[tableCode]/page.tsx: same kot-mappers.ts helpers
 * (this tab's KOT/settle flow is the identical machinery a table uses,
 * just with TableCode null and TabCode set — see RestaurantOperationsController
 * .OpenTab), minus anything table/floor-specific (no Transfer/Merge/
 * Split-Table — "Transfer to Table" replaces them, §12).
 */
export default function TabOrderPage() {
  const params = useParams<{ tabCode: string }>();
  const tabCode = decodeURIComponent(params.tabCode);
  const t = useTranslations("order");
  const tr = useTranslations("restaurant");
  const tBar = useTranslations("barCounter");
  const tc = useTranslations("common");
  const tSetMenu = useTranslations("setMenu");
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const userName = useAuthStore((s) => s.user?.userName ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");
  const terminalId = usePosSessionStore((s) => s.terminalId ?? "");
  const shiftNo = usePosSessionStore((s) => s.shiftNo);
  // Billing needs a terminal + open shift (Till Setup); raise the setup dialog when it's missing.
  const [setupOpen, setSetupOpen] = useState(false);
  const withShift = (action: () => void) => {
    if (!terminalId || !shiftNo) setSetupOpen(true);
    else action();
  };

  const { data: openTabs = [] } = useQuery({
    queryKey: ["open-tabs", compId, siteId],
    queryFn: () => restaurantOperationsService.getOpenTabs(compId, siteId),
    enabled: !!compId && !!siteId,
    refetchInterval: 10_000,
  });
  const tabEntry = openTabs.find((e) => e.tabCode === tabCode);
  const kotDocNo = tabEntry?.openKotDocNo ?? null;

  const { data: kot } = useQuery({
    queryKey: ["kot", compId, siteId, kotDocNo],
    queryFn: () => kotService.get(compId, siteId, kotDocNo as number),
    enabled: !!compId && !!siteId && kotDocNo != null,
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

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [pendingItem, setPendingItem] = useState<MenuItemDto | null>(null);
  const [pickingCombo, setPickingCombo] = useState<ComboMasterDto | null>(null);
  const [pickingSetMenu, setPickingSetMenu] = useState<SetMenuMasterDto | null>(null);
  const [draftLines, setDraftLines] = useState<DraftOrderLine[]>([]);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [toTableCode, setToTableCode] = useState("");
  const [receiptPos, setReceiptPos] = useState<PosDto | null>(null);

  const { data: floorStatus = [] } = useQuery({
    queryKey: ["restaurant-floor-status", compId, siteId],
    queryFn: () => restaurantOperationsService.getFloorStatus(compId, siteId),
    enabled: !!compId && !!siteId && transferOpen,
  });
  const availableTables = floorStatus.filter((e) => e.table.currentStatus === "AVAILABLE" && e.table.active);

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

  async function syncKot(close: boolean) {
    if (!kot) throw new Error("No open order for this tab.");
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
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  const settleMutation = useMutation({
    mutationFn: async (payments: PosPayment[]) => {
      const closedKot = await syncKot(true);
      const posDto = buildSettleBillDto({ kot: closedKot, payments, terminalId, shiftNo });
      return posService.create(compId, siteId, userName, posDto);
    },
    onSuccess: (pos) => {
      toast({ title: t("billSettled") });
      setPaymentOpen(false);
      setReceiptPos(pos);
      queryClient.invalidateQueries({ queryKey: ["open-tabs", compId, siteId] });

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
          .consumeRecipe(compId, siteId, { refDocNo: pos.refNo ?? String(pos.docNo), docNo: pos.docNo, lines: consumeLines })
          .catch(() => {});
      }
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  const transferMutation = useMutation({
    mutationFn: () => restaurantOperationsService.transferTabToTable(compId, siteId, tabCode, toTableCode, userName),
    onSuccess: () => {
      toast({ title: tBar("tabTransferred") });
      setTransferOpen(false);
      queryClient.invalidateQueries({ queryKey: ["open-tabs", compId, siteId] });
      router.push(`/pos/tables/${encodeURIComponent(toTableCode)}`);
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  const netTotal = draftLines.reduce((sum, l) => sum + draftLineTotals(l).netAmount, 0);

  return (
    <div className="grid h-full grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
      <div className="flex min-h-0 min-w-0 flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" onClick={() => router.push("/pos/stations")}>
              ← {tc("back")}
            </Button>
            <h1 className="text-lg font-semibold">
              {tBar("tabCode")}: {tabCode}
              {tabEntry?.customerName && <span className="ms-2 text-sm font-normal text-muted-foreground">({tabEntry.customerName})</span>}
            </h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => setTransferOpen(true)}>
            {tBar("transferToTable")}
          </Button>
        </div>

        <MenuGrid
          categories={categories}
            subCategories={subCategories}
          items={items}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          onSelectItem={handleSelectItem}
        />
      </div>

      <div className="flex min-h-0 flex-col gap-3 rounded-lg border bg-card p-3">
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
          <Button className="w-full" disabled={draftLines.length === 0 || settleMutation.isPending} onClick={() => withShift(() => setPaymentOpen(true))}>
            {t("settleBill")}
          </Button>
        </div>
      </div>

      <AddOrderItemDialog
        item={pendingItem}
        modifierGroups={modifierGroups}
        modifiers={modifiers}
        onOpenChange={(open) => !open && setPendingItem(null)}
        onAdd={handleAddLine}
      />

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

      <PosSetupDialog open={setupOpen} onConfigured={() => setSetupOpen(false)} />

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        netTotal={netTotal}
        hasCustomer={!!kot?.customerCode}
        loading={settleMutation.isPending}
        onComplete={(payments) => settleMutation.mutate(payments)}
      />

      <ReceiptDialog open={!!receiptPos} onOpenChange={(open) => !open && router.push("/pos/stations")} pos={receiptPos} />

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{tBar("transferToTable")}</DialogTitle>
          </DialogHeader>
          <Select value={toTableCode} onValueChange={setToTableCode}>
            <SelectTrigger>
              <SelectValue placeholder={tBar("selectDestinationTable")} />
            </SelectTrigger>
            <SelectContent>
              {availableTables.map((e) => (
                <SelectItem key={e.table.code} value={e.table.code}>
                  {e.table.tableName} ({e.table.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button disabled={!toTableCode || transferMutation.isPending} onClick={() => transferMutation.mutate()}>
              {tBar("confirmTransfer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
