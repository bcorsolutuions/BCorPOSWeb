"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { useCurrencyStore } from "@/stores/currency-store";
import { useToast } from "@/components/ui/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { restaurantLookupService } from "@/lib/api/services/restaurant-lookup-service";
import { useMenuCatalog } from "@/hooks/use-menu-catalog";
import { orderManagementService } from "@/lib/api/services/order-management-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MenuGrid } from "@/components/restaurant/menu-grid";
import { AddOrderItemDialog } from "@/components/restaurant/add-order-item-dialog";
import { newDraftId, kotMappers, draftLineTotals, type DraftOrderLine } from "@/lib/restaurant/kot-mappers";
import { formatMoney, formatMoneyPlain, newUuid } from "@/lib/utils";
import type { MenuItemDto } from "@/types/restaurant";

/** Restaurant Order Management §17/§19 — Takeaway/Phone Order creation: no table needed, same menu/pricing/order engine. */
export default function NewStandaloneOrderPage() {
  const t = useTranslations("orderManagement");
  const tc = useTranslations("common");
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currencyCode);
  const { toast } = useToast();
  const router = useRouter();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const userName = useAuthStore((s) => s.user?.userName ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");
  const terminalId = usePosSessionStore((s) => s.terminalId ?? "");
  const shiftNo = usePosSessionStore((s) => s.shiftNo);

  const { data: orderTypes = [] } = useQuery({
    queryKey: ["restaurant-order-types", compId],
    queryFn: () => restaurantLookupService.getOrderTypes(compId),
    enabled: !!compId,
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

  const standaloneTypes = orderTypes.filter((o) => !o.requiresTable);

  const [orderTypeCode, setOrderTypeCode] = useState("");
  const [orderSource, setOrderSource] = useState<"MAIN_POS" | "PHONE_ORDER">("MAIN_POS");
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [pendingItem, setPendingItem] = useState<MenuItemDto | null>(null);
  const [draftLines, setDraftLines] = useState<DraftOrderLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [idempotencyKey] = useState(() => newUuid());

  useEffect(() => {
    const first = standaloneTypes[0];
    if (!orderTypeCode && first) setOrderTypeCode(first.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standaloneTypes.length]);

  function handleAddLine(line: Omit<DraftOrderLine, "draftId">) {
    setDraftLines((prev) => [...prev, { ...line, draftId: newDraftId() }]);
  }
  function handleRemoveLine(draftId: string) {
    setDraftLines((prev) => prev.filter((l) => l.draftId !== draftId));
  }

  const createMutation = useMutation({
    mutationFn: () =>
      orderManagementService.createStandaloneOrder(compId, siteId, {
        orderTypeCode,
        orderSource,
        customerName: customerName || null,
        customerMobile: customerMobile || null,
        terminalCode: terminalId || null,
        shiftNo,
        idempotencyKey,
        userName,
        details: draftLines.map(kotMappers.draftToCreateDetail),
      }),
    onSuccess: (kot) => {
      toast({ title: t("orderCreated") });
      router.push(`/pos/orders/${kot.docNo}` as never);
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  const total = draftLines.reduce((sum, l) => sum + draftLineTotals(l).netAmount, 0);

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden p-4">
      <h1 className="text-xl font-semibold">{t("newOrder")}</h1>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
        <div className="space-y-1">
          <Label>{t("orderType")}</Label>
          <Select value={orderTypeCode} onValueChange={setOrderTypeCode}>
            <SelectTrigger>
              <SelectValue placeholder={t("orderType")} />
            </SelectTrigger>
            <SelectContent>
              {standaloneTypes.map((o) => (
                <SelectItem key={o.code} value={o.code}>
                  {o.orderTypeName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{t("sourceLabel")}</Label>
          <Select value={orderSource} onValueChange={(v) => setOrderSource(v as "MAIN_POS" | "PHONE_ORDER")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MAIN_POS">{t("source_MAIN_POS")}</SelectItem>
              <SelectItem value="PHONE_ORDER">{t("source_PHONE_ORDER")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{tc("name")}</Label>
          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>{tc("phone")}</Label>
          <Input value={customerMobile} onChange={(e) => setCustomerMobile(e.target.value)} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <MenuGrid
          categories={categories}
            subCategories={subCategories}
          items={items}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          onSelectItem={setPendingItem}
        />
      </div>

      <Button className="h-12 w-full text-base" onClick={() => setCartOpen(true)}>
        {t("viewCart")} ({draftLines.length}) — {formatMoney(total, currency, locale)}
      </Button>

      <AddOrderItemDialog
        item={pendingItem}
        modifierGroups={modifierGroups}
        modifiers={modifiers}
        onOpenChange={(open) => !open && setPendingItem(null)}
        onAdd={handleAddLine}
      />

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="bottom" className="flex max-h-[85vh] flex-col overflow-y-auto rounded-t-xl">
          <SheetHeader>
            <SheetTitle>{t("cart")}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 space-y-2 overflow-y-auto py-2">
            {draftLines.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{t("emptyCart")}</p>}
            {draftLines.map((line) => {
              const totals = draftLineTotals(line);
              return (
                <div key={line.draftId} className="flex items-center justify-between border-b pb-2">
                  <span>
                    {line.qty} × {line.menuName}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums">{formatMoneyPlain(totals.netAmount, currency, locale)}</span>
                    <Button size="sm" variant="ghost" onClick={() => handleRemoveLine(line.draftId)}>
                      {tc("delete")}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
            <span>{tc("total")}</span>
            <span>{formatMoney(total, currency, locale)}</span>
          </div>
          <Button
            className="h-12 w-full text-base"
            disabled={draftLines.length === 0 || !orderTypeCode || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? t("sending") : t("sendOrder")}
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
