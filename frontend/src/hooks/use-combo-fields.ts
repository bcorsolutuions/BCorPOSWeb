"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { useAuthStore } from "@/stores/auth-store";
import type { ComboFormValues } from "@/schemas/combo-master.schema";
import type { FieldConfig } from "@/components/shared/entity-form-field";

/**
 * The ComboMaster form's field list — lifted out of the admin page so both
 * the list page's edit dialog and the standalone create page (/combos/new)
 * render the exact same fields from one source.
 */
export function useComboFields(): FieldConfig<ComboFormValues>[] {
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data: sites = [] } = useQuery({
    queryKey: ["combo-master-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  return useMemo(
    () => [
      { name: "code", labelKey: "common.code", type: "text" },
      { name: "comboName", labelKey: "combo.comboName", type: "text" },
      { name: "comboNameArb", labelKey: "common.nameAr", type: "text" },
      {
        name: "siteId",
        labelKey: "common.branch",
        type: "select",
        options: sites.map((s) => ({ value: s.siteID, label: s.siteName })),
      },
      { name: "sellingPrice", labelKey: "combo.sellingPrice", type: "money" },
      { name: "taxCode", labelKey: "item.taxCode", type: "text" },
      { name: "validFrom", labelKey: "salon.validFrom", type: "date" },
      { name: "validTo", labelKey: "salon.validTo", type: "date" },
      { name: "allowItemSubstitution", labelKey: "combo.allowItemSubstitution", type: "checkbox" },
      { name: "allowDiscount", labelKey: "combo.allowDiscount", type: "checkbox" },
      { name: "remarks", labelKey: "common.remarks", type: "text" },
      { name: "active", labelKey: "common.active", type: "checkbox" },
    ],
    [sites],
  );
}
