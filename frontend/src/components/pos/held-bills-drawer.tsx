"use client";

import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { posOperationsService } from "@/lib/api/services/pos-operations-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { useSiteBusinessTypes } from "@/hooks/use-site-business-types";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { usePosCartStore } from "@/stores/pos-cart-store";
import { useCurrencyStore } from "@/stores/currency-store";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { getSalonOrderState } from "@/lib/pos/salon-order";

export function HeldBillsDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("pos");
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currencyCode);
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const { siteId, terminalId } = usePosSessionStore();
  const loadHeldBill = usePosCartStore((s) => s.loadHeldBill);
  const { hasSalon } = useSiteBusinessTypes();

  // A salon order is taken at one chair and paid at the front desk — often another terminal — so on a salon site the
  // list shows every open order of the branch instead of only this terminal's held bills.
  const { data: heldBills = [] } = useQuery({
    queryKey: ["pos-held-bills", compId, siteId, hasSalon ? "all" : terminalId],
    queryFn: () => posOperationsService.getHeldBills(compId, siteId ?? "", hasSalon ? undefined : (terminalId ?? undefined)),
    enabled: open && !!compId && !!siteId,
  });

  // Phone numbers live on the customer, not on the bill.
  const { data: customers = [] } = useQuery({
    queryKey: ["pos-customers", compId],
    queryFn: () => posLookupService.getCustomers(compId),
    enabled: open && !!compId && hasSalon,
  });
  const phoneOf = (code?: string | null) => (code ? (customers.find((c) => c.code === code)?.mobile1 ?? "") : "");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="end">
        <SheetHeader>
          <SheetTitle>{t("heldBills")}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {heldBills.length === 0 && <p className="text-sm text-muted-foreground">{t("emptyCart")}</p>}
          {heldBills.map((bill) => {
            const state = hasSalon ? getSalonOrderState(bill.remarks) : null;
            const phone = phoneOf(bill.custCode);
            const services = [
              ...bill.serviceDetails.map((s) => s.serviceName ?? s.serviceCode),
              ...bill.details.map((d) => d.name ?? d.itemCode),
            ]
              .filter(Boolean)
              .join(", ");
            return (
              <button
                key={bill.docNo}
                onClick={() => {
                  loadHeldBill(bill);
                  onOpenChange(false);
                }}
                className="flex w-full items-center justify-between gap-2 rounded-md border p-3 text-start text-sm hover:bg-accent"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-medium">
                    <span>
                      {t("billNo")} {bill.docNo}
                    </span>
                    {state && (
                      <Badge variant={state === "DONE" ? "success" : "warning"}>
                        {state === "DONE" ? t("salonServiceDone") : t("salonInService")}
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {bill.custName ?? t("customer")}
                    {phone ? ` · ${phone}` : ""} · {formatDateTime(bill.lastModifiedOn ?? bill.createTime, locale)}
                  </p>
                  {hasSalon && services && <p className="truncate text-xs text-muted-foreground">{services}</p>}
                </div>
                <span className="shrink-0 font-semibold tabular-nums">{formatMoney(bill.netTotal, currency, locale)}</span>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
