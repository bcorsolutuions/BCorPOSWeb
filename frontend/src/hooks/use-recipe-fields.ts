"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { restaurantLookupService } from "@/lib/api/services/restaurant-lookup-service";
import { useAuthStore } from "@/stores/auth-store";
import type { RecipeFormValues } from "@/schemas/recipe-master.schema";
import type { FieldConfig } from "@/components/shared/entity-form-field";

/**
 * The RecipeMaster form's field list — same "lifted out of the page" shape
 * as useComboFields. menuCode is restricted to items flagged IsRecipeItem
 * (MenuMaster.IsRecipeItem) — a recipe with no recipe-flagged item to attach
 * to has nothing for InventoryLedgerService.consumeRecipe to ever look up.
 */
export function useRecipeFields(): FieldConfig<RecipeFormValues>[] {
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data: sites = [] } = useQuery({
    queryKey: ["recipe-master-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });
  // This page is reached directly from Masters, not through POS Till Setup,
  // so usePosSessionStore.siteId is never set here — default to the
  // company's first branch instead (same fallback QrTableCodesPage uses for
  // the same reason).
  const siteId = sites[0]?.siteID ?? "";

  const { data: menuItems = [] } = useQuery({
    queryKey: ["recipe-master-menu-items", compId, siteId],
    queryFn: () => restaurantLookupService.getMenuItems(compId, siteId),
    enabled: !!compId && !!siteId,
  });
  const recipeMenuItems = useMemo(() => menuItems.filter((m) => m.isRecipeItem), [menuItems]);

  return useMemo(
    () => [
      { name: "code", labelKey: "common.code", type: "text" },
      { name: "recipeName", labelKey: "recipe.recipeName", type: "text" },
      { name: "recipeNameArb", labelKey: "common.nameAr", type: "text" },
      {
        name: "siteId",
        labelKey: "common.branch",
        type: "select",
        options: sites.map((s) => ({ value: s.siteID, label: s.siteName })),
      },
      {
        name: "menuCode",
        labelKey: "recipe.menuItem",
        type: "select",
        options: recipeMenuItems.map((m) => ({ value: m.code, label: m.menuName })),
      },
      { name: "yieldQty", labelKey: "recipe.yieldQty", type: "number" },
      { name: "yieldUnitCode", labelKey: "recipe.yieldUnit", type: "text" },
      { name: "standardCost", labelKey: "recipe.standardCost", type: "money" },
      { name: "preparationMinutes", labelKey: "recipe.preparationMinutes", type: "number" },
      { name: "cookingMinutes", labelKey: "recipe.cookingMinutes", type: "number" },
      { name: "versionNo", labelKey: "recipe.versionNo", type: "number" },
      { name: "effectiveFrom", labelKey: "salon.validFrom", type: "date" },
      { name: "effectiveTo", labelKey: "salon.validTo", type: "date" },
      { name: "instructions", labelKey: "recipe.instructions", type: "text" },
      { name: "isDefault", labelKey: "recipe.isDefault", type: "checkbox" },
      { name: "remarks", labelKey: "common.remarks", type: "text" },
      { name: "active", labelKey: "common.active", type: "checkbox" },
    ],
    [sites, recipeMenuItems],
  );
}
