"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { User, UserCog } from "lucide-react";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { useAuthStore } from "@/stores/auth-store";
import { usePosCartStore } from "@/stores/pos-cart-store";
import { EntityPickerDialog, type EntityPickerItem } from "@/components/pos/entity-picker-dialog";
import { LoyaltyBalanceBadge } from "@/components/pos/loyalty-balance-badge";
import { Button } from "@/components/ui/button";

export function CustomerSalesmanBar() {
  const t = useTranslations("pos");
  const locale = useLocale();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const { customerCode, customerName, salesManCode, setCustomer, setSalesman } = usePosCartStore();
  const [customerOpen, setCustomerOpen] = useState(false);
  const [salesmanOpen, setSalesmanOpen] = useState(false);

  const { data: customers = [] } = useQuery({
    queryKey: ["pos-customers", compId],
    queryFn: () => posLookupService.getCustomers(compId),
    enabled: customerOpen && !!compId,
  });

  // Fetched (not gated by salesmanOpen) so the button can show the selected
  // salesman's name — PosHdr only stores SalesManCode (see pos-cart-store),
  // the Salesman master is the source of truth for the display name.
  const { data: salesmen = [] } = useQuery({
    queryKey: ["pos-salesmen", compId],
    queryFn: () => posLookupService.getSalesmen(compId),
    enabled: !!compId,
  });

  const customerItems: EntityPickerItem[] = customers.map((c) => ({
    key: c.code,
    label: locale === "ar" && c.custNameArabic ? c.custNameArabic : c.custName,
    subLabel: c.creditLimit ? `${t("creditLimit")}: ${c.creditLimit}` : undefined,
    disabled: c.blocked,
    disabledReason: c.blocked ? t("creditBlocked") : undefined,
  }));

  const salesmanItems: EntityPickerItem[] = salesmen.map((s) => ({
    key: s.code,
    label: locale === "ar" && s.empNameArb ? s.empNameArb : s.empName,
  }));

  const selectedSalesman = salesmen.find((s) => s.code === salesManCode);
  const selectedSalesmanLabel = selectedSalesman
    ? locale === "ar" && selectedSalesman.empNameArb
      ? selectedSalesman.empNameArb
      : selectedSalesman.empName
    : salesManCode;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => setCustomerOpen(true)}>
        <User className="me-1 h-4 w-4" />
        {customerName ?? t("customer")}
      </Button>
      <Button variant="outline" size="sm" onClick={() => setSalesmanOpen(true)}>
        <UserCog className="me-1 h-4 w-4" />
        {selectedSalesmanLabel ?? t("noSalesman")}
      </Button>

      {customerCode && <LoyaltyBalanceBadge customerCode={customerCode} />}

      <EntityPickerDialog
        open={customerOpen}
        onOpenChange={setCustomerOpen}
        title={t("selectCustomer")}
        searchPlaceholder={t("searchCustomer")}
        items={customerItems}
        onSelect={(code) => {
          const match = customers.find((c) => c.code === code);
          setCustomer(code, match ? (locale === "ar" && match.custNameArabic ? match.custNameArabic : match.custName) : code);
        }}
      />

      <EntityPickerDialog
        open={salesmanOpen}
        onOpenChange={setSalesmanOpen}
        title={t("selectSalesman")}
        searchPlaceholder={t("searchSalesman")}
        items={salesmanItems}
        onSelect={(code) => setSalesman(code)}
      />
    </div>
  );
}
