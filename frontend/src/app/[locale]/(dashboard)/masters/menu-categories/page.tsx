"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { menuCategoryService, type MenuCategoryMaster } from "@/lib/api/services/menu-category-service";
import { kitchenMasterService } from "@/lib/api/services/kitchen-master-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { menuCategorySchema, type MenuCategoryFormValues } from "@/schemas/restaurant-master.schema";
import { useAuthStore } from "@/stores/auth-store";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";

export default function MenuCategoryMasterPage() {
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data: sites = [] } = useQuery({
    queryKey: ["menu-category-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  const { data: kitchensResult } = useQuery({
    queryKey: ["menu-category-kitchens"],
    queryFn: () => kitchenMasterService.list(),
    enabled: !!compId,
  });
  const kitchens = kitchensResult?.items ?? [];

  const fields: FieldConfig<MenuCategoryFormValues>[] = useMemo(
    () => [
      { name: "code", labelKey: "common.code", type: "text" },
      { name: "categoryName", labelKey: "common.name", type: "text" },
      { name: "categoryNameArb", labelKey: "common.nameAr", type: "text" },
      {
        name: "siteId",
        labelKey: "common.branch",
        type: "select",
        options: sites.map((s) => ({ value: s.siteID, label: s.siteName })),
      },
      {
        name: "kitchenCode",
        labelKey: "restaurant.kitchen",
        type: "select",
        options: kitchens.map((k) => ({ value: k.code, label: k.kitchenName })),
      },
      { name: "displayOrder", labelKey: "common.displayOrder", type: "number" },
      { name: "showInPOS", labelKey: "restaurant.showInPOS", type: "checkbox" },
      { name: "showInKiosk", labelKey: "restaurant.showInKiosk", type: "checkbox" },
      { name: "showInOnlineOrder", labelKey: "restaurant.showInOnlineOrder", type: "checkbox" },
      { name: "active", labelKey: "common.active", type: "checkbox" },
    ],
    [sites, kitchens],
  );

  return (
    <CrudDataGridPage<MenuCategoryMaster, MenuCategoryFormValues>
      queryKey="menu-category-master"
      titleKey="restaurant.menuCategories"
      service={menuCategoryService}
      schema={menuCategorySchema}
      fields={fields}
      permission={PERMISSIONS.RESTAURANT_MANAGE_TABLES}
      defaultValues={{
        code: "",
        categoryName: "",
        categoryNameArb: "",
        kitchenCode: "",
        displayOrder: 0,
        showInPOS: true,
        showInKiosk: true,
        showInOnlineOrder: true,
        siteId: "",
        active: true,
      }}
      toFormValues={(entity) => ({
        code: entity.code,
        categoryName: entity.categoryName,
        categoryNameArb: entity.categoryNameArb ?? "",
        kitchenCode: entity.kitchenCode ?? "",
        displayOrder: entity.displayOrder,
        showInPOS: entity.showInPOS,
        showInKiosk: entity.showInKiosk,
        showInOnlineOrder: entity.showInOnlineOrder,
        siteId: entity.siteID,
        active: entity.active,
      })}
      columns={[
        { dataField: "code", captionKey: "common.code", width: 100 },
        { dataField: "categoryName", captionKey: "common.name" },
        { dataField: "displayOrder", captionKey: "common.displayOrder", dataType: "number", width: 120 },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
