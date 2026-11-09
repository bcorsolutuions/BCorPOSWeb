import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { RecipeMasterDto } from "@/types/restaurant";
import type { RecipeFormValues } from "@/schemas/recipe-master.schema";

// Real BCorDFWebApi RecipeMasterController — generic MasterController<> CRUD,
// same pattern as combo-master-service.ts. Its details (ingredient lines)
// are what InventoryLedgerService.consumeRecipe reads at bill-settle time.
export interface Recipe extends RecipeMasterDto {
  id: string;
}

function toRecipe(dto: RecipeMasterDto): Recipe {
  return { ...dto, id: dto.code };
}

function buildDetailsPayload(payload: RecipeFormValues) {
  return payload.details.map((d) => ({
    id: d.id || undefined,
    inventoryCode: d.inventoryCode,
    unitCode: d.unitCode || null,
    requiredQty: d.requiredQty,
    wastagePercent: d.wastagePercent,
    unitCost: d.unitCost ?? null,
    isOptional: d.isOptional,
    remarks: d.remarks || null,
  }));
}

function withDefaults(payload: RecipeFormValues) {
  return {
    recipeName: payload.recipeName,
    recipeNameArb: payload.recipeNameArb || null,
    menuCode: payload.menuCode,
    yieldQty: payload.yieldQty,
    yieldUnitCode: payload.yieldUnitCode || null,
    standardCost: payload.standardCost ?? null,
    preparationMinutes: payload.preparationMinutes ?? null,
    cookingMinutes: payload.cookingMinutes ?? null,
    instructions: payload.instructions || null,
    instructionsArb: payload.instructionsArb || null,
    versionNo: payload.versionNo,
    effectiveFrom: payload.effectiveFrom || null,
    effectiveTo: payload.effectiveTo || null,
    isDefault: payload.isDefault,
    remarks: payload.remarks || null,
    details: buildDetailsPayload(payload),
  };
}

export const recipeMasterService = {
  list: async (): Promise<{ items: Recipe[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<RecipeMasterDto[]>(`/RecipeMaster/${compId}`);
    const items = data.map(toRecipe);
    return { items, total: items.length };
  },

  create: async (payload: RecipeFormValues): Promise<Recipe> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<RecipeMasterDto>(
      "/RecipeMaster",
      {
        code: payload.code,
        compID: compId,
        siteID: payload.siteId,
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        ...withDefaults(payload),
      },
      { headers: { CompID: compId } },
    );
    return toRecipe(data);
  },

  update: async (code: string, payload: RecipeFormValues): Promise<Recipe> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.put<RecipeMasterDto>(
      `/RecipeMaster/${code}`,
      {
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        ...withDefaults(payload),
      },
      { headers: { CompID: compId } },
    );
    return toRecipe(data);
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/RecipeMaster/${compId}/${code}`, { params: { user: userName } });
  },
};
