"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { membershipTierMasterService, type MembershipTier } from "@/lib/api/services/membership-tier-master-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { membershipTierSchema, type MembershipTierFormValues } from "@/schemas/salon-master.schema";
import { useAuthStore } from "@/stores/auth-store";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";

export default function MembershipTierMasterPage() {
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data: sites = [] } = useQuery({
    queryKey: ["membership-tier-master-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  const fields: FieldConfig<MembershipTierFormValues>[] = useMemo(
    () => [
      { name: "code", labelKey: "common.code", type: "text" },
      { name: "tierName", labelKey: "salon.tierName", type: "text" },
      { name: "tierNameArb", labelKey: "common.nameAr", type: "text" },
      {
        name: "siteId",
        labelKey: "common.branch",
        type: "select",
        options: sites.map((s) => ({ value: s.siteID, label: s.siteName })),
      },
      // Cumulative spend threshold to qualify for this tier.
      { name: "minSpend", labelKey: "salon.minSpend", type: "number" },
      { name: "discountPercent", labelKey: "salon.discountPercent", type: "number" },
      { name: "remarks", labelKey: "common.remarks", type: "text" },
      { name: "active", labelKey: "common.active", type: "checkbox" },
    ],
    [sites],
  );

  return (
    <CrudDataGridPage<MembershipTier, MembershipTierFormValues>
      queryKey="membership-tier-master"
      titleKey="salon.membershipTierMaster"
      service={membershipTierMasterService}
      schema={membershipTierSchema}
      fields={fields}
      permission={PERMISSIONS.SALON_MANAGE}
      defaultValues={{
        code: "",
        siteId: "",
        tierName: "",
        tierNameArb: "",
        minSpend: 0,
        discountPercent: undefined,
        remarks: "",
        active: true,
      }}
      toFormValues={(entity) => ({
        code: entity.code,
        siteId: entity.siteID,
        tierName: entity.tierName,
        tierNameArb: entity.tierNameArb ?? "",
        minSpend: entity.minSpend,
        discountPercent: entity.discountPercent ?? undefined,
        remarks: entity.remarks ?? "",
        active: entity.active,
      })}
      columns={[
        { dataField: "code", captionKey: "common.code", width: 100 },
        { dataField: "tierName", captionKey: "salon.tierName" },
        { dataField: "minSpend", captionKey: "salon.minSpend", dataType: "number", width: 140 },
        { dataField: "discountPercent", captionKey: "salon.discountPercent", dataType: "number", width: 120 },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
