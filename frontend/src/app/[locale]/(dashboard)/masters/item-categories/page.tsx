"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { itemCategoryService, MAIN_CATEGORY, NO_GL } from "@/lib/api/services/item-category-service";
import { glMasterService } from "@/lib/api/services/gl-master-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { itemCategorySchema, type ItemCategoryFormValues } from "@/schemas/masters.schema";
import { useAuthStore } from "@/stores/auth-store";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";
import type { ItemCategoryMaster } from "@/types/item-master";

type ItemCategoryRow = ItemCategoryMaster & { id: string };

export default function ItemCategoryMasterPage() {
  const t = useTranslations();
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data: sites = [] } = useQuery({
    queryKey: ["item-category-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  // Only main categories can be a parent (two levels: main -> sub), so
  // that's all the dropdown offers. Same key prefix as the grid's own list so
  // a save/delete there refreshes these options too.
  const { data: mainCategories = [] } = useQuery({
    queryKey: ["item-category-master", "main-categories", compId],
    queryFn: () => itemCategoryService.getCategories(compId),
    enabled: !!compId,
    select: (all) => all.filter((c) => c.active && !c.parentCode),
  });

  // GL accounts to post to: stock is an asset, sales is income, cost of sales is an expense (the chart marks those with control type COGS).
  const { data: glAccounts = [] } = useQuery({
    queryKey: ["gl-master", "item-category-gl", compId],
    queryFn: async () => (await glMasterService.list()).items,
    enabled: !!compId,
    select: (all) => all.filter((a) => a.active),
  });
  const glOptions = useMemo(() => {
    const opts = (accounts: typeof glAccounts) => [
      { value: NO_GL, label: "—" },
      ...accounts.map((a) => ({ value: a.code, label: `${a.code} — ${a.glName}` })),
    ];
    const expenses = glAccounts.filter((a) => a.accountType === 4);
    const cogs = expenses.filter((a) => a.glCtrlTypeCode === "COGS");
    return {
      inventory: opts(glAccounts.filter((a) => a.accountType === 1)),
      sales: opts(glAccounts.filter((a) => a.accountType === 3)),
      cost: opts(cogs.length > 0 ? cogs : expenses),
    };
  }, [glAccounts]);

  const fields: FieldConfig<ItemCategoryFormValues>[] = useMemo(
    () => [
      { name: "code", labelKey: "common.code", type: "text" },
      { name: "name", labelKey: "common.name", type: "text" },
      {
        name: "parentCode",
        labelKey: "item.parentCategory",
        type: "select",
        options: [
          { value: MAIN_CATEGORY, label: t("item.mainCategory") },
          ...mainCategories.map((c) => ({ value: c.code, label: `${c.name} (${c.code})` })),
        ],
      },
      { name: "description", labelKey: "common.description", type: "textarea" },
      { name: "inventoryGlCode", labelKey: "item.inventoryGL", type: "select", options: glOptions.inventory },
      { name: "costGlCode", labelKey: "item.costOfSalesGL", type: "select", options: glOptions.cost },
      { name: "salesGlCode", labelKey: "item.salesGL", type: "select", options: glOptions.sales },
      {
        name: "siteId",
        labelKey: "common.branch",
        type: "select",
        options: sites.map((s) => ({ value: s.siteID, label: s.siteName })),
      },
      { name: "active", labelKey: "common.active", type: "checkbox" },
    ],
    [sites, mainCategories, glOptions, t],
  );

  return (
    <CrudDataGridPage<ItemCategoryRow, ItemCategoryFormValues>
      queryKey="item-category-master"
      titleKey="item.categoryMasterTitle"
      service={itemCategoryService}
      schema={itemCategorySchema}
      fields={fields}
      permission={PERMISSIONS.INVENTORY_MANAGE_ITEMS}
      defaultValues={{
        code: "",
        name: "",
        description: "",
        parentCode: MAIN_CATEGORY,
        inventoryGlCode: NO_GL,
        costGlCode: NO_GL,
        salesGlCode: NO_GL,
        glCode: "",
        salesGlCode2: "",
        costGlCode2: "",
        siteId: "",
        active: true,
      }}
      toFormValues={(entity) => ({
        code: entity.code,
        name: entity.name,
        description: entity.description ?? "",
        parentCode: entity.parentCode || MAIN_CATEGORY,
        inventoryGlCode: entity.inventoryGLCode || NO_GL,
        costGlCode: entity.costGLCode || NO_GL,
        salesGlCode: entity.salesGLCode || NO_GL,
        glCode: entity.glCode ?? "",
        salesGlCode2: entity.salesGLCode2 ?? "",
        costGlCode2: entity.costGLCode2 ?? "",
        siteId: entity.siteID,
        active: entity.active,
      })}
      columns={[
        { dataField: "code", captionKey: "common.code", width: 120 },
        { dataField: "name", captionKey: "common.name" },
        { dataField: "parentName", captionKey: "item.parentCategory" },
        { dataField: "description", captionKey: "common.description" },
        { dataField: "inventoryGLCode", captionKey: "item.inventoryGL", width: 130 },
        { dataField: "costGLCode", captionKey: "item.costOfSalesGL", width: 130 },
        { dataField: "salesGLCode", captionKey: "item.salesGL", width: 110 },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
