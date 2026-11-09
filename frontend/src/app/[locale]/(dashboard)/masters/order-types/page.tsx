"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { orderTypeService, type OrderTypeMaster } from "@/lib/api/services/order-type-service";
import { restaurantLookupService } from "@/lib/api/services/restaurant-lookup-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { orderTypeSchema, type OrderTypeFormValues } from "@/schemas/restaurant-master.schema";
import { useAuthStore } from "@/stores/auth-store";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";

// Order Types: Dine In, Takeaway, Home Delivery, Online Pickup ... Only a type with "Requires table" is started from a table;
// the others are started from Order Management > New Order (and delivery ones appear on the Deliveries board).
export default function OrderTypeMasterPage() {
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data: sites = [] } = useQuery({
    queryKey: ["order-type-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });
  const { data: diningTypes = [] } = useQuery({
    queryKey: ["order-type-dining-types", compId],
    queryFn: () => restaurantLookupService.getDiningTypes(compId),
    enabled: !!compId,
  });

  const fields: FieldConfig<OrderTypeFormValues>[] = useMemo(
    () => [
      { name: "code", labelKey: "common.code", type: "text" },
      { name: "orderTypeName", labelKey: "common.name", type: "text" },
      { name: "orderTypeNameArb", labelKey: "common.nameAr", type: "text" },
      {
        name: "siteId",
        labelKey: "common.branch",
        type: "select",
        options: sites.map((s) => ({ value: s.siteID, label: s.siteName })),
        resetOnChange: ["diningTypeCode"],
      },
      {
        name: "diningTypeCode",
        labelKey: "restaurant.diningType",
        type: "select",
        dependsOn: "siteId",
        optionsFor: (site) =>
          diningTypes.filter((d) => !d.siteID || d.siteID === site).map((d) => ({ value: d.code, label: d.diningTypeName })),
      },
      { name: "requiresTable", labelKey: "restaurant.requiresTable", type: "checkbox" },
      { name: "requiresCustomer", labelKey: "restaurant.requiresCustomer", type: "checkbox" },
      { name: "requiresAddress", labelKey: "restaurant.requiresAddress", type: "checkbox" },
      { name: "requiresWaiter", labelKey: "restaurant.requiresWaiter", type: "checkbox" },
      { name: "requiresDriver", labelKey: "restaurant.requiresDriver", type: "checkbox" },
      { name: "allowScheduledOrder", labelKey: "restaurant.allowScheduledOrder", type: "checkbox" },
      { name: "allowOnlineOrder", labelKey: "restaurant.allowOnlineOrder", type: "checkbox" },
      { name: "displayOrder", labelKey: "common.displayOrder", type: "number" },
      { name: "active", labelKey: "common.active", type: "checkbox" },
    ],
    [sites, diningTypes],
  );

  return (
    <CrudDataGridPage<OrderTypeMaster, OrderTypeFormValues>
      queryKey="order-type-master"
      titleKey="restaurant.orderTypes"
      descriptionKey="restaurant.orderTypesHint"
      service={orderTypeService}
      schema={orderTypeSchema}
      fields={fields}
      permission={PERMISSIONS.RESTAURANT_MANAGE_TABLES}
      defaultValues={{
        code: "",
        orderTypeName: "",
        orderTypeNameArb: "",
        siteId: "",
        diningTypeCode: "",
        requiresTable: false,
        requiresCustomer: false,
        requiresAddress: false,
        requiresWaiter: false,
        requiresDriver: false,
        allowScheduledOrder: false,
        allowOnlineOrder: false,
        displayOrder: 0,
        active: true,
      }}
      toFormValues={(entity) => ({
        code: entity.code,
        orderTypeName: entity.orderTypeName,
        orderTypeNameArb: entity.orderTypeNameArb ?? "",
        siteId: entity.siteID ?? "",
        diningTypeCode: entity.diningTypeCode ?? "",
        requiresTable: entity.requiresTable,
        requiresCustomer: entity.requiresCustomer,
        requiresAddress: entity.requiresAddress,
        requiresWaiter: entity.requiresWaiter,
        requiresDriver: entity.requiresDriver,
        allowScheduledOrder: entity.allowScheduledOrder,
        allowOnlineOrder: entity.allowOnlineOrder,
        displayOrder: entity.displayOrder,
        active: entity.active,
      })}
      columns={[
        { dataField: "code", captionKey: "common.code", width: 120 },
        { dataField: "orderTypeName", captionKey: "common.name" },
        { dataField: "siteID", captionKey: "common.branch", width: 100 },
        { dataField: "diningTypeCode", captionKey: "restaurant.diningType", width: 140 },
        { dataField: "requiresTable", captionKey: "restaurant.requiresTable", width: 130 },
        { dataField: "requiresDriver", captionKey: "restaurant.requiresDriver", width: 130 },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
