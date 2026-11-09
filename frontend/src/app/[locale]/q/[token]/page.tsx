"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell, Droplet, Receipt, ShoppingCart, UtensilsCrossed } from "lucide-react";
import { qrMenuService } from "@/lib/api/services/qr-menu-service";
import { QrItemDetailSheet, type QrCartAddPayload } from "@/components/qr-order/qr-item-detail-sheet";
import { QrCartSheet } from "@/components/qr-order/qr-cart-sheet";
import { SelectComboOptionsDialog } from "@/components/pos/select-combo-options-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { useCurrencyStore } from "@/stores/currency-store";
import { formatMoney, resolveImageUrl, newUuid } from "@/lib/utils";
import type { MenuItemDto } from "@/types/restaurant";
import type { ComboMasterDto, ComboDetailDto, ResolvedComboComponent } from "@/types/combo";
import type { PlaceQrOrderLineRequestDto, QrCartLine, QrServiceRequestType } from "@/types/qr-order";

function componentCode(d: ComboDetailDto): string {
  return d.componentType === "Inventory" ? d.inventoryCode ?? "" : d.componentType === "Service" ? d.serviceCode ?? "" : d.menuCode ?? "";
}

function sessionStorageKey(token: string) {
  return `qr-session-${token}`;
}

const ALL_SUB = "__all";
const OTHER_SUB = "__other";
const COMBOS_TAB = "__combos";
const byDisplayOrder = <T extends { displayOrder: number }>(a: T, b: T) => a.displayOrder - b.displayOrder;

// Safari (private browsing / locked-down iOS settings) can throw on localStorage access - ordering must still work without it.
function readStoredSession(token: string): string | null {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(sessionStorageKey(token)) : null;
  } catch {
    return null;
  }
}
function storeSession(token: string, sessionId: string) {
  try {
    window.localStorage.setItem(sessionStorageKey(token), sessionId);
  } catch {
    /* kept in memory only */
  }
}

export default function QrOrderPage() {
  const params = useParams<{ token: string }>();
  const token = decodeURIComponent(params.token);
  const t = useTranslations("qrMenu");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { toast } = useToast();
  const currency = useCurrencyStore((s) => s.currencyCode);

  const [sessionId, setSessionId] = useState<string | null>(() => readStoredSession(token));
  const [cart, setCart] = useState<QrCartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<MenuItemDto | null>(null);
  const [detailCombo, setDetailCombo] = useState<ComboMasterDto | null>(null);
  const [placedDocNo, setPlacedDocNo] = useState<number | null>(null);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [billConfirmOpen, setBillConfirmOpen] = useState(false);

  const { data: tableInfo, isLoading: tableLoading, isError: tableError } = useQuery({
    queryKey: ["qr-table", token],
    queryFn: () => qrMenuService.getTable(token),
    retry: false,
  });

  const { data: menu, isLoading: menuLoading } = useQuery({
    queryKey: ["qr-menu", token],
    queryFn: () => qrMenuService.getMenu(token),
    enabled: !!sessionId,
  });

  const { data: orderStatus } = useQuery({
    queryKey: ["qr-order-status", token, placedDocNo],
    queryFn: () => qrMenuService.getOrderStatus(token, placedDocNo!),
    enabled: !!placedDocNo && !!tableInfo?.allowOrderTracking,
    refetchInterval: 8000,
    retry: false,
  });

  const startSessionMutation = useMutation({
    mutationFn: () => qrMenuService.startSession(token),
    onSuccess: (result) => {
      setSessionId(result.sessionId);
      storeSession(token, result.sessionId);
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: message || t("errorGeneric"), variant: "destructive" });
    },
  });

  type CheckoutInput = { customerName: string; customerMobile: string; couponCode: string; remarks: string };

  const placeOrderMutation = useMutation({
    mutationFn: (input: CheckoutInput) => {
      const lines: PlaceQrOrderLineRequestDto[] = cart.map((l) => ({
        menuCode: l.menuCode,
        comboCode: l.comboCode,
        qty: l.qty,
        modifiers: l.modifiers?.map((m) => ({ code: m.code })),
        comboComponents: l.comboComponents,
        specialInstructions: l.specialInstructions,
      }));
      return qrMenuService.placeOrder(token, {
        sessionId: sessionId!,
        customerName: input.customerName || undefined,
        customerMobile: input.customerMobile || undefined,
        couponCode: input.couponCode || undefined,
        remarks: input.remarks || undefined,
        lines,
        idempotencyKey: newUuid(),
      });
    },
    onSuccess: (order) => {
      setCart([]);
      setCartOpen(false);
      setPlacedDocNo(order.docNo);
      setPendingApproval(order.orderStatus === "PENDING");
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: message || t("errorGeneric"), variant: "destructive" });
    },
  });

  const serviceRequestMutation = useMutation({
    mutationFn: (requestType: QrServiceRequestType) => qrMenuService.requestService(token, requestType),
    onSuccess: () => toast({ title: t("serviceRequested") }),
    onError: (err) => toast({ title: apiErrorMessage(err, t("errorGeneric")), variant: "destructive" }),
  });

  const items = useMemo(() => menu?.items ?? [], [menu]);
  const combos = useMemo(() => menu?.combos ?? [], [menu]);
  const categories = useMemo(() => [...(menu?.categories ?? [])].sort(byDisplayOrder), [menu]);
  const subCategories = useMemo(() => menu?.subCategories ?? [], [menu]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [subSelection, setSubSelection] = useState<{ category: string | null; value: string }>({ category: null, value: ALL_SUB });
  const [search, setSearch] = useState("");

  // Same drill-down as the POS table screen: main category -> sub category -> items, plus a search across the whole menu.
  // No "all items" chip: a menu of hundreds of items is never rendered at once. Combos get their own tab.
  const category =
    activeCategory === COMBOS_TAB && combos.length > 0
      ? COMBOS_TAB
      : activeCategory && categories.some((c) => c.code === activeCategory)
        ? activeCategory
        : (categories[0]?.code ?? (combos.length > 0 ? COMBOS_TAB : null));
  const visibleSubs = useMemo(
    () => subCategories.filter((s) => s.categoryCode === category).sort(byDisplayOrder),
    [subCategories, category],
  );
  const activeSub = subSelection.category === category ? subSelection.value : ALL_SUB;
  const hasOtherItems = useMemo(() => {
    if (visibleSubs.length === 0) return false;
    const codes = new Set(visibleSubs.map((s) => s.code));
    return items.some((i) => i.categoryCode === category && (!i.subCategoryCode || !codes.has(i.subCategoryCode)));
  }, [items, visibleSubs, category]);

  const query = search.trim().toLowerCase();
  const visibleItems = useMemo(() => {
    let list: MenuItemDto[];
    if (query) {
      list = items.filter(
        (i) =>
          i.menuName.toLowerCase().includes(query) ||
          (i.menuNameArb ?? "").toLowerCase().includes(query) ||
          i.code.toLowerCase().includes(query),
      );
    } else if (category === COMBOS_TAB) {
      list = [];
    } else if (category === null) {
      list = items; // a menu with no categories configured at all
    } else {
      list = items.filter((i) => i.categoryCode === category);
      if (visibleSubs.length > 0 && activeSub !== ALL_SUB) {
        const codes = new Set(visibleSubs.map((s) => s.code));
        list = list.filter((i) =>
          activeSub === OTHER_SUB ? !i.subCategoryCode || !codes.has(i.subCategoryCode) : i.subCategoryCode === activeSub,
        );
      }
    }
    return [...list].sort((a, b) => byDisplayOrder(a, b) || a.menuName.localeCompare(b.menuName));
  }, [items, query, category, visibleSubs, activeSub]);
  const visibleCombos = useMemo(
    () =>
      query
        ? combos.filter((c) => c.comboName.toLowerCase().includes(query) || c.code.toLowerCase().includes(query))
        : category === COMBOS_TAB || category === null
          ? combos
          : [],
    [combos, query, category],
  );

  const cartCount = cart.reduce((sum, l) => sum + l.qty, 0);
  const cartTotal = cart.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);

  function addPlainItemToCart(item: MenuItemDto, payload: QrCartAddPayload) {
    const modifierTotal = payload.modifiers.reduce((s, m) => s + m.price, 0);
    setCart((prev) => [
      ...prev,
      {
        draftId: newUuid(),
        menuCode: item.code,
        name: locale === "ar" && item.menuNameArb ? item.menuNameArb : item.menuName,
        qty: payload.qty,
        unitPrice: item.sellingPrice + modifierTotal,
        modifiers: payload.modifiers,
        specialInstructions: payload.specialInstructions || undefined,
      },
    ]);
  }

  function addComboToCart(combo: ComboMasterDto, resolved: ResolvedComboComponent[], qty: number) {
    const extra = resolved.filter((c) => c.selected).reduce((s, c) => s + c.additionalPrice, 0);
    setCart((prev) => [
      ...prev,
      {
        draftId: newUuid(),
        comboCode: combo.code,
        name: locale === "ar" && combo.comboNameArb ? combo.comboNameArb : combo.comboName,
        qty,
        unitPrice: combo.sellingPrice + extra,
        comboComponents: resolved.map((c) => ({ groupNo: c.groupNo, code: c.code, selected: c.selected })),
      },
    ]);
  }

  if (tableLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">{t("loading")}</div>;
  }

  if (tableError || !tableInfo) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
        <UtensilsCrossed className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("invalidQr")}</p>
      </div>
    );
  }

  // ── Order status view (after Place Order) ─────────────────────────────────
  if (placedDocNo) {
    const statusLabel: Record<string, string> = {
      RECEIVED: t("statusReceived"),
      ACCEPTED: t("statusAccepted"),
      PREPARING: t("statusPreparing"),
      READY: t("statusReady"),
      SERVED: t("statusServed"),
      REJECTED: t("statusRejected"),
    };
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
        <UtensilsCrossed className="h-10 w-10 text-primary" />
        <h1 className="text-lg font-semibold">{pendingApproval ? t("orderPendingApproval") : t("orderConfirmed")}</h1>
        <p className="text-sm text-muted-foreground">{t("orderNumber", { docNo: placedDocNo })}</p>
        {tableInfo.allowOrderTracking && orderStatus && <Badge variant="secondary">{statusLabel[orderStatus.customerStatus] ?? orderStatus.customerStatus}</Badge>}
        <Button
          className="mt-4"
          onClick={() => {
            setPlacedDocNo(null);
            setPendingApproval(false);
          }}
        >
          {t("orderMore")}
        </Button>
      </div>
    );
  }

  // ── Landing view (no session yet) ─────────────────────────────────────────
  if (!sessionId) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
        <UtensilsCrossed className="h-12 w-12 text-primary" />
        <h1 className="text-xl font-semibold">{t("welcomeTable", { table: tableInfo.tableCode })}</h1>
        {tableInfo.tableName && <p className="text-sm text-muted-foreground">{tableInfo.tableName}</p>}
        <Button size="lg" className="mt-4 w-full" onClick={() => startSessionMutation.mutate()} disabled={startSessionMutation.isPending}>
          {t("startOrdering")}
        </Button>
      </div>
    );
  }

  // ── Menu view ──────────────────────────────────────────────────────────────
  const categoryLabel = (c: { categoryName: string; categoryNameArb?: string | null }) =>
    locale === "ar" && c.categoryNameArb ? c.categoryNameArb : c.categoryName;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 pb-28">
      <div className="sticky top-0 z-10 space-y-2 bg-background/95 p-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold">{t("welcomeTable", { table: tableInfo.tableCode })}</h1>
          <div className="flex gap-1">
            {tableInfo.allowCallWaiter && (
              <Button size="icon" variant="outline" className="h-8 w-8" title={t("callWaiter")} onClick={() => serviceRequestMutation.mutate("CALL_WAITER")}>
                <Bell className="h-4 w-4" />
              </Button>
            )}
            {tableInfo.allowRequestWater && (
              <Button size="icon" variant="outline" className="h-8 w-8" title={t("requestWater")} onClick={() => serviceRequestMutation.mutate("WATER")}>
                <Droplet className="h-4 w-4" />
              </Button>
            )}
            {tableInfo.allowRequestBill && (
              <Button size="icon" variant="outline" className="h-8 w-8" title={t("requestBill")} onClick={() => setBillConfirmOpen(true)}>
                <Receipt className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* 16px text: iOS Safari zooms the whole page when a smaller input is focused. */}
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchMenu")}
          className="h-9 text-base"
          inputMode="search"
        />

        {!query && (categories.length > 0 || combos.length > 0) && (
          <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
            {categories.map((c) => (
              <Button
                key={c.code}
                size="sm"
                className="shrink-0"
                variant={category === c.code ? "default" : "outline"}
                onClick={() => {
                  setSubSelection({ category: c.code, value: ALL_SUB });
                  setActiveCategory(c.code);
                }}
              >
                {categoryLabel(c)}
              </Button>
            ))}
            {combos.length > 0 && (
              <Button
                size="sm"
                className="shrink-0"
                variant={category === COMBOS_TAB ? "default" : "outline"}
                onClick={() => setActiveCategory(COMBOS_TAB)}
              >
                {t("combos")}
              </Button>
            )}
          </div>
        )}

        {!query && visibleSubs.length > 0 && (
          <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
            <Button
              size="sm"
              className="shrink-0"
              variant={activeSub === ALL_SUB ? "secondary" : "ghost"}
              onClick={() => setSubSelection({ category, value: ALL_SUB })}
            >
              {t("allSubCategories")}
            </Button>
            {visibleSubs.map((s) => (
              <Button
                key={s.code}
                size="sm"
                className="shrink-0"
                variant={activeSub === s.code ? "secondary" : "ghost"}
                onClick={() => setSubSelection({ category, value: s.code })}
              >
                {locale === "ar" && s.subCategoryNameArb ? s.subCategoryNameArb : s.subCategoryName}
              </Button>
            ))}
            {hasOtherItems && (
              <Button
                size="sm"
                className="shrink-0"
                variant={activeSub === OTHER_SUB ? "secondary" : "ghost"}
                onClick={() => setSubSelection({ category, value: OTHER_SUB })}
              >
                {t("otherItems")}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2 px-3">
        {menuLoading && <p className="text-sm text-muted-foreground">{t("loading")}</p>}

        {visibleCombos.length > 0 && (
          <div className="space-y-2">
            {visibleCombos.map((combo) => (
              <Card key={combo.code} className="flex items-center gap-3 p-3" onClick={() => setDetailCombo(combo)}>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                  {combo.imagePath ? (
                    // eslint-disable-next-line @next/next/no-img-element -- backend-served upload
                    <img src={resolveImageUrl(combo.imagePath)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <UtensilsCrossed className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 break-words text-sm font-medium">{locale === "ar" && combo.comboNameArb ? combo.comboNameArb : combo.comboName}</p>
                  <p className="text-sm text-primary">{formatMoney(combo.sellingPrice, currency, locale)}</p>
                </div>
                <Button size="sm" onClick={(e) => { e.stopPropagation(); setDetailCombo(combo); }}>
                  {t("add")}
                </Button>
              </Card>
            ))}
          </div>
        )}

        {visibleItems.map((item) => (
          <Card key={item.code} className={`flex items-center gap-3 p-3 ${item.isSoldOut ? "opacity-60" : ""}`}>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
              {item.imagePath ? (
                // eslint-disable-next-line @next/next/no-img-element -- backend-served upload
                <img src={resolveImageUrl(item.imagePath)} alt="" className="h-full w-full object-cover" />
              ) : (
                <UtensilsCrossed className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              {/* Two lines, not truncated: "... - Single" / "... - Double" are different items and the suffix is the part that matters. */}
              <p className="line-clamp-2 break-words text-sm font-medium">{locale === "ar" && item.menuNameArb ? item.menuNameArb : item.menuName}</p>
              <p className="text-sm text-primary">{formatMoney(item.sellingPrice, currency, locale)}</p>
            </div>
            {item.isSoldOut ? (
              <Badge variant="secondary">{t("soldOut")}</Badge>
            ) : (
              <Button size="sm" onClick={() => setDetailItem(item)}>
                {t("add")}
              </Button>
            )}
          </Card>
        ))}
      </div>

      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t bg-background p-3">
          <Button className="mx-auto flex w-full max-w-md items-center justify-between" size="lg" onClick={() => setCartOpen(true)}>
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              {t("cartCount", { count: cartCount })}
            </span>
            <span>{formatMoney(cartTotal, currency, locale)}</span>
          </Button>
        </div>
      )}

      <QrItemDetailSheet
        item={detailItem}
        modifierGroups={menu?.modifierGroups ?? []}
        modifiers={menu?.modifiers ?? []}
        onOpenChange={(open) => !open && setDetailItem(null)}
        onAdd={(payload) => detailItem && addPlainItemToCart(detailItem, payload)}
      />

      <SelectComboOptionsDialog
        combo={detailCombo}
        resolveName={(d) => {
          const code = componentCode(d);
          const menuItem = items.find((i) => i.code === code);
          return menuItem ? (locale === "ar" && menuItem.menuNameArb ? menuItem.menuNameArb : menuItem.menuName) : code;
        }}
        onOpenChange={(open) => !open && setDetailCombo(null)}
        onConfirm={(resolved, qty) => detailCombo && addComboToCart(detailCombo, resolved, qty)}
      />

      <QrCartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        lines={cart}
        tableInfo={tableInfo}
        onRemoveLine={(draftId) => setCart((prev) => prev.filter((l) => l.draftId !== draftId))}
        isPlacing={placeOrderMutation.isPending}
        onPlaceOrder={(input) => placeOrderMutation.mutate(input)}
      />

      <Dialog open={billConfirmOpen} onOpenChange={setBillConfirmOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{t("confirmRequestBill")}</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBillConfirmOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button
              onClick={() => {
                serviceRequestMutation.mutate("REQUEST_BILL");
                setBillConfirmOpen(false);
              }}
            >
              {tc("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
