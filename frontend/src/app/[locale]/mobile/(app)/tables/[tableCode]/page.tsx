"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Receipt, Search, Split, Send } from "lucide-react";
import { restaurantLookupService } from "@/lib/api/services/restaurant-lookup-service";
import { useMenuCatalog } from "@/hooks/use-menu-catalog";
import { restaurantOperationsService } from "@/lib/api/services/restaurant-operations-service";
import { waiterMobileService } from "@/lib/api/services/waiter-mobile-service";
import { kotService } from "@/lib/api/services/kot-service";
import { comboLookupService } from "@/lib/api/services/combo-lookup-service";
import { setMenuLookupService } from "@/lib/api/services/set-menu-lookup-service";
import { openItemSettingsService } from "@/lib/api/services/open-item-settings-service";
import { isSetMenuAvailableNow } from "@/lib/restaurant/set-menu-availability";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { useCurrencyStore } from "@/stores/currency-store";
import { useSignalRHub } from "@/hooks/use-signalr-hub";
import { usePermission } from "@/hooks/use-permission";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { useToast } from "@/components/ui/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { useRouter } from "@/i18n/navigation";
import { formatMoney, formatMoneyPlain } from "@/lib/utils";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MenuGrid } from "@/components/restaurant/menu-grid";
import { AddOrderItemDialog } from "@/components/restaurant/add-order-item-dialog";
import { SelectComboOptionsDialog } from "@/components/pos/select-combo-options-dialog";
import { SelectSetMenuOptionsDialog } from "@/components/pos/select-set-menu-options-dialog";
import { OpenItemEntryDialog } from "@/components/pos/open-item-entry-dialog";
import { TransferTableDialog } from "@/components/restaurant/transfer-table-dialog";
import { SplitTableDialog } from "@/components/restaurant/split-table-dialog";
import {
  buildComboDraftLines,
  buildSetMenuDraftLines,
  buildSplitTableMoves,
  draftLineTotals,
  groupDraftLines,
  kotDetailToDraftLine,
  kotMappers,
  newDraftId,
  type DraftOrderLine,
} from "@/lib/restaurant/kot-mappers";
import { kotDtoToUpdateInput } from "@/types/restaurant";
import type { MenuItemDto } from "@/types/restaurant";
import type { ComboDetailDto, ComboMasterDto } from "@/types/combo";
import type { SetMenuGroupItemDto, SetMenuMasterDto } from "@/types/set-menu";

const FLOOR_STATUS_KEY = "restaurant-floor-status";

/**
 * Waiter Mobile Ordering §9/§10/§17/§18 — the core order screen. Reuses the
 * exact desktop table-order data flow (same services, same KOT create/update
 * pipeline, same Combo/Set Menu/Open Item dialogs — see
 * pos/tables/[tableCode]/page.tsx) with a phone-shaped shell: MenuGrid +
 * search instead of the wide desktop layout, a Sheet-based cart instead of
 * a persistent side panel, and one sticky "SEND ORDER" action.
 */
export default function MobileTableOrderPage() {
  const params = useParams<{ tableCode: string }>();
  const tableCode = decodeURIComponent(params.tableCode);
  const t = useTranslations("mobileWaiter");
  const tSetMenu = useTranslations("setMenu");
  const tOpenItem = useTranslations("openItem");
  const tc = useTranslations("common");
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currencyCode);
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = usePermission();

  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const userName = useAuthStore((s) => s.user?.userName ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");
  const terminalId = usePosSessionStore((s) => s.terminalId ?? "");
  const shiftNo = usePosSessionStore((s) => s.shiftNo);

  const { data: floorStatus = [] } = useQuery({
    queryKey: [FLOOR_STATUS_KEY, compId, siteId],
    queryFn: () => restaurantOperationsService.getFloorStatus(compId, siteId),
    enabled: !!compId && !!siteId,
    refetchInterval: 15_000,
  });
  const entry = floorStatus.find((e) => e.table.code === tableCode);
  const kotDocNo = entry?.openKotDocNo ?? null;

  const { data: profile } = useQuery({
    queryKey: ["waiter-mobile-profile", compId, siteId, userName],
    queryFn: () => waiterMobileService.getMyProfile(compId, siteId, userName),
    enabled: !!compId && !!siteId && !!userName,
    retry: false,
  });

  const { data: kot } = useQuery({
    queryKey: ["kot", compId, siteId, kotDocNo],
    queryFn: () => kotService.get(compId, siteId, kotDocNo as number),
    enabled: !!compId && !!siteId && kotDocNo != null,
    refetchInterval: 20_000,
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
  const { data: openItemSettings } = useQuery({
    queryKey: ["open-item-settings", compId, siteId],
    queryFn: () => openItemSettingsService.getBySite(compId, siteId),
    enabled: !!compId && !!siteId,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [pendingItem, setPendingItem] = useState<MenuItemDto | null>(null);
  const [pickingCombo, setPickingCombo] = useState<ComboMasterDto | null>(null);
  const [pickingSetMenu, setPickingSetMenu] = useState<SetMenuMasterDto | null>(null);
  const [openItemDialogOpen, setOpenItemDialogOpen] = useState(false);
  const [draftLines, setDraftLines] = useState<DraftOrderLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);

  useEffect(() => {
    if (kot) setDraftLines(kot.details.filter((d) => !d.cancelled).map(kotDetailToDraftLine));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kot?.id]);

  // §25/§26 — join the "floor" pseudo-group (table status changes) and every
  // kitchen this KOT's lines route to (item ready/preparing pings), the same
  // JoinKitchen/group scheme the desktop floor map and KDS already use — no
  // backend/hub change needed.
  const kitchenCodes = useMemo(
    () => Array.from(new Set((kot?.details ?? []).map((d) => d.kitchenCode).filter((k): k is string => !!k))),
    [kot],
  );
  useSignalRHub(
    "/kds",
    {
      TableStatusChanged: () => queryClient.invalidateQueries({ queryKey: [FLOOR_STATUS_KEY] }),
      KotStatusChanged: () => queryClient.invalidateQueries({ queryKey: ["kot", compId, siteId, kotDocNo] }),
      KotCreated: () => queryClient.invalidateQueries({ queryKey: ["kot", compId, siteId, kotDocNo] }),
    },
    (connection) => {
      if (!compId || !siteId) return;
      void connection.invoke("JoinKitchen", compId, siteId, "floor").catch(() => {});
      for (const code of kitchenCodes) void connection.invoke("JoinKitchen", compId, siteId, code).catch(() => {});
    },
  );

  function handleAddLine(line: Omit<DraftOrderLine, "draftId">) {
    setDraftLines((prev) => [...prev, { ...line, draftId: newDraftId() }]);
  }
  function handleRemoveLine(draftId: string) {
    setDraftLines((prev) => prev.filter((l) => l.draftId !== draftId));
  }

  function handleSelectItem(item: MenuItemDto) {
    if (item.isComboItem) {
      const combo = combos.find((c) => c.menuCode === item.code);
      if (combo) return setPickingCombo(combo);
    }
    if (item.isSetMenuItem) {
      const setMenu = setMenus.find((s) => s.menuCode === item.code);
      if (setMenu) {
        if (!isSetMenuAvailableNow(setMenu)) {
          toast({ title: tSetMenu("unavailable"), variant: "destructive" });
          return;
        }
        return setPickingSetMenu(setMenu);
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

  async function syncKot(): Promise<void> {
    if (!kot) throw new Error("No open order for this table.");
    const dto = kotDtoToUpdateInput(kot);
    dto.details = draftLines.map(kotMappers.draftToUpdateDetail);
    await kotService.update(compId, siteId, userName, kot.docNo, dto);
  }

  const sendMutation = useMutation({
    mutationFn: syncKot,
    onSuccess: () => {
      toast({ title: t("orderSent") });
      queryClient.invalidateQueries({ queryKey: ["kot", compId, siteId, kotDocNo] });
      queryClient.invalidateQueries({ queryKey: [FLOOR_STATUS_KEY] });
      setCartOpen(false);
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  const requestBillMutation = useMutation({
    mutationFn: () => waiterMobileService.requestBill(compId, siteId, tableCode, userName),
    onSuccess: (res) => toast({ title: res.message }),
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  const visibleItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.trim().toLowerCase();
    return items.filter((i) => i.code.toLowerCase().includes(q) || i.menuName.toLowerCase().includes(q));
  }, [items, searchQuery]);

  const groups = groupDraftLines(draftLines);
  const cartTotal = draftLines.reduce((sum, l) => sum + draftLineTotals(l).netAmount, 0);
  const unsentCount = draftLines.length;

  if (!kotDocNo) {
    return (
      <div className="flex flex-1 flex-col">
        <MobileHeader title={tableCode} onBack={() => router.push("/mobile/tables" as never)} />
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">{t("noActiveOrder")}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title={`${tc("table")} ${entry?.table.tableName ?? tableCode}`} onBack={() => router.push("/mobile/tables" as never)} />

      <div className="flex items-center gap-2 border-b p-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="ps-8" placeholder={tc("search")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        {profile?.allowWaiterRequestBill && can(PERMISSIONS.WAITER_MOBILE_REQUEST_BILL) && (
          <Button variant="outline" size="icon" onClick={() => requestBillMutation.mutate()} disabled={requestBillMutation.isPending}>
            <Receipt className="h-4 w-4" />
          </Button>
        )}
        {profile?.allowWaiterTransferTable && can(PERMISSIONS.WAITER_MOBILE_TRANSFER_TABLE) && (
          <Button variant="outline" size="icon" onClick={() => setTransferOpen(true)}>
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
        )}
        {profile?.allowWaiterSplitTable && can(PERMISSIONS.WAITER_MOBILE_SPLIT_TABLE) && (
          <Button variant="outline" size="icon" onClick={() => setSplitOpen(true)}>
            <Split className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-2">
        <MenuGrid
          categories={categories}
            subCategories={subCategories}
          items={visibleItems}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          onSelectItem={handleSelectItem}
        />
      </div>

      {openItemSettings?.enableOpenItem && can(PERMISSIONS.OPEN_ITEM_ADD) && (
        <div className="border-t p-2">
          <Button variant="secondary" className="w-full" onClick={() => setOpenItemDialogOpen(true)}>
            {tOpenItem("title")}
          </Button>
        </div>
      )}

      <div className="sticky bottom-0 border-t bg-background p-2">
        <Button className="h-12 w-full text-base" onClick={() => setCartOpen(true)}>
          {t("viewCart")} ({unsentCount}) — {formatMoney(cartTotal, currency, locale)}
        </Button>
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
        onConfirm={(resolved, qty) => {
          if (!pickingCombo) return;
          buildComboDraftLines(pickingCombo, resolved, qty).forEach(handleAddLine);
          setPickingCombo(null);
        }}
      />
      <SelectSetMenuOptionsDialog
        setMenu={pickingSetMenu}
        resolveName={resolveSetMenuComponentName}
        resolveKitchenCode={resolveSetMenuComponentKitchenCode}
        onOpenChange={(open) => !open && setPickingSetMenu(null)}
        onConfirm={(resolved, qty) => {
          if (!pickingSetMenu) return;
          buildSetMenuDraftLines(pickingSetMenu, resolved, qty).forEach(handleAddLine);
          setPickingSetMenu(null);
        }}
      />
      <OpenItemEntryDialog open={openItemDialogOpen} onOpenChange={setOpenItemDialogOpen} onAdd={handleAddLine} />

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="bottom" className="flex max-h-[85vh] flex-col overflow-y-auto rounded-t-xl">
          <SheetHeader>
            <SheetTitle>{t("cart")}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 space-y-2 overflow-y-auto py-2">
            {groups.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{t("emptyCart")}</p>}
            {groups.map((group) => {
              const priced = group.find((l) => l.comboCode || l.setMenuCode) ?? group[0];
              if (!priced) return null;
              const totals = draftLineTotals(priced);
              return (
                <div key={priced.draftId} className="flex items-start justify-between gap-2 border-b pb-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {priced.qty} × {priced.menuName}
                    </p>
                    {priced.preparationNotes && <p className="truncate text-xs italic text-muted-foreground">{priced.preparationNotes}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm tabular-nums">{formatMoneyPlain(totals.netAmount, currency, locale)}</span>
                    {!priced.id && (
                      <Button variant="ghost" size="sm" onClick={() => group.forEach((l) => handleRemoveLine(l.draftId))}>
                        {tc("delete")}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
            <span>{tc("total")}</span>
            <span>{formatMoney(cartTotal, currency, locale)}</span>
          </div>
          <Button className="h-12 w-full text-base" disabled={sendMutation.isPending} onClick={() => sendMutation.mutate()}>
            <Send className="me-2 h-4 w-4" />
            {sendMutation.isPending ? t("sending") : t("sendOrder")}
          </Button>
        </SheetContent>
      </Sheet>

      <TransferTableDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        fromTableCode={tableCode}
        entries={floorStatus}
        onConfirm={async (toTableCode) => {
          await restaurantOperationsService.transferTable(compId, siteId, tableCode, toTableCode, userName);
          toast({ title: t("tableTransferred") });
          setTransferOpen(false);
          queryClient.invalidateQueries({ queryKey: [FLOOR_STATUS_KEY] });
          router.push(`/mobile/tables/${encodeURIComponent(toTableCode)}` as never);
        }}
      />
      <SplitTableDialog
        open={splitOpen}
        onOpenChange={setSplitOpen}
        fromTableCode={tableCode}
        lines={draftLines}
        entries={floorStatus}
        onConfirm={async ({ toTableCode, guestCount, moves }) => {
          await restaurantOperationsService.splitTable(compId, siteId, tableCode, {
            toTableCode,
            guestCount,
            lines: moves,
            userName,
          });
          toast({ title: t("tableSplit") });
          setSplitOpen(false);
          queryClient.invalidateQueries({ queryKey: [FLOOR_STATUS_KEY] });
          queryClient.invalidateQueries({ queryKey: ["kot", compId, siteId, kotDocNo] });
        }}
      />
    </div>
  );
}
