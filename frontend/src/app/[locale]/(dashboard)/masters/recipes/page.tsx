"use client";

import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { recipeMasterService, type Recipe } from "@/lib/api/services/recipe-master-service";
import { useRecipeFields } from "@/hooks/use-recipe-fields";
import { RecipeDetailEditor } from "@/components/masters/recipe-detail-editor";
import { recipeSchema, type RecipeFormValues } from "@/schemas/recipe-master.schema";
import { PERMISSIONS } from "@/lib/auth/permissions";

export default function RecipeMasterPage() {
  const fields = useRecipeFields();

  return (
    <CrudDataGridPage<Recipe, RecipeFormValues>
      queryKey="recipe-master"
      titleKey="recipe.recipeMaster"
      descriptionKey="recipe.recipeMasterDesc"
      service={recipeMasterService}
      schema={recipeSchema}
      fields={fields}
      permission={PERMISSIONS.RESTAURANT_MANAGE_TABLES}
      defaultValues={{
        code: "",
        siteId: "",
        recipeName: "",
        recipeNameArb: "",
        menuCode: "",
        yieldQty: 1,
        yieldUnitCode: "",
        standardCost: undefined,
        preparationMinutes: undefined,
        cookingMinutes: undefined,
        instructions: "",
        instructionsArb: "",
        versionNo: 1,
        effectiveFrom: "",
        effectiveTo: "",
        isDefault: true,
        remarks: "",
        active: true,
        details: [],
      }}
      toFormValues={(entity) => ({
        code: entity.code,
        siteId: entity.siteID,
        recipeName: entity.recipeName,
        recipeNameArb: entity.recipeNameArb ?? "",
        menuCode: entity.menuCode,
        yieldQty: entity.yieldQty,
        yieldUnitCode: entity.yieldUnitCode ?? "",
        standardCost: entity.standardCost ?? undefined,
        preparationMinutes: entity.preparationMinutes ?? undefined,
        cookingMinutes: entity.cookingMinutes ?? undefined,
        instructions: entity.instructions ?? "",
        instructionsArb: entity.instructionsArb ?? "",
        versionNo: entity.versionNo,
        effectiveFrom: entity.effectiveFrom ? entity.effectiveFrom.slice(0, 10) : "",
        effectiveTo: entity.effectiveTo ? entity.effectiveTo.slice(0, 10) : "",
        isDefault: entity.isDefault,
        remarks: entity.remarks ?? "",
        active: entity.active,
        details: (entity.details ?? []).map((d) => ({
          id: d.id,
          inventoryCode: d.inventoryCode,
          unitCode: d.unitCode ?? "",
          requiredQty: d.requiredQty,
          wastagePercent: d.wastagePercent,
          unitCost: d.unitCost ?? undefined,
          isOptional: d.isOptional,
          remarks: d.remarks ?? "",
        })),
      })}
      renderExtra={({ form }) => <RecipeDetailEditor form={form} />}
      columns={[
        { dataField: "code", captionKey: "common.code", width: 100 },
        { dataField: "recipeName", captionKey: "recipe.recipeName" },
        { dataField: "menuCode", captionKey: "recipe.menuItem", width: 140 },
        { dataField: "yieldQty", captionKey: "recipe.yieldQty", dataType: "number", width: 100 },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
