"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { menuSubCategoryService, type MenuSubCategoryMaster } from "@/lib/api/services/menu-sub-category-service";
import { menuCategoryService } from "@/lib/api/services/menu-category-service";
import { kitchenMasterService } from "@/lib/api/services/kitchen-master-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { menuSubCategorySchema, type MenuSubCategoryFormValues } from "@/schemas/restaurant-master.schema";
import { useAuthStore } from "@/stores/auth-store";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";

// Second level of the menu tree (e.g. Food → Pizza, Alcoholic Drinks → Beer).
// Menu items are filed under a main category and, optionally, one of its sub
// categories — the same two-level shape as Item Category.
export default function MenuSubCategoryMasterPage() {
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data: sites = [] } = useQuery({
    queryKey: ["menu-sub-category-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  const { data: categoriesResult } = useQuery({
    queryKey: ["menu-sub-category-categories"],
    queryFn: () => menuCategoryService.list(),
    enabled: !!compId,
  });
  const categories = categoriesResult?.items ?? [];

  const { data: kitchensResult } = useQuery({
    queryKey: ["menu-sub-category-kitchens"],
    queryFn: () => kitchenMasterService.list(),
    enabled: !!compId,
  });
  const kitchens = kitchensResult?.items ?? [];

  const categoryNames = useMemo(() => new Map(categories.map((c) => [c.code, c.categoryName])), [categories]);

  const fields: FieldConfig<MenuSubCategoryFormValues>[] = useMemo(
    () => [
      { name: "code", labelKey: "common.code", type: "text" },
      { name: "subCategoryName", labelKey: "common.name", type: "text" },
      { name: "subCategoryNameArb", labelKey: "common.nameAr", type: "text" },
      {
        name: "categoryCode",
        labelKey: "restaurant.mainCategoryLabel",
        type: "select",
        options: categories.map((c) => ({ value: c.code, label: c.categoryName })),
      },
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
    [sites, categories, kitchens],
  );

  return (
    <CrudDataGridPage<MenuSubCategoryMaster, MenuSubCategoryFormValues>
      queryKey="menu-sub-category-master"
      titleKey="restaurant.menuSubCategories"
      service={menuSubCategoryService}
      schema={menuSubCategorySchema}
      fields={fields}
      permission={PERMISSIONS.RESTAURANT_MANAGE_TABLES}
      defaultValues={{
        code: "",
        subCategoryName: "",
        subCategoryNameArb: "",
        categoryCode: "",
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
        subCategoryName: entity.subCategoryName,
        subCategoryNameArb: entity.subCategoryNameArb ?? "",
        categoryCode: entity.categoryCode,
        kitchenCode: entity.kitchenCode ?? "",
        displayOrder: entity.displayOrder,
        showInPOS: entity.showInPOS,
        showInKiosk: entity.showInKiosk,
        showInOnlineOrder: entity.showInOnlineOrder,
        siteId: entity.siteID,
        active: entity.active,
      })}
      columns={[
        { dataField: "code", captionKey: "common.code", width: 120 },
        { dataField: "subCategoryName", captionKey: "common.name" },
        {
          dataField: "categoryCode",
          captionKey: "restaurant.mainCategoryLabel",
          width: 220,
          cellRender: ({ data }) => categoryNames.get(String(data.categoryCode)) ?? String(data.categoryCode ?? ""),
        },
        { dataField: "displayOrder", captionKey: "common.displayOrder", dataType: "number", width: 120 },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
