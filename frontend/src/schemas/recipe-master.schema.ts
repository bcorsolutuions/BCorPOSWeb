import { z } from "zod";

// One ingredient line — mirrors BCorApi's RecipeDetail (see
// Dto/Masters/RecipeMasterDto.cs's CreateRecipeDetailDto/UpdateRecipeDetailDto).
// inventoryCode/unitCode stay plain text for v1, same "ship the flat editor
// first" call already made for ComboDetailEditor's componentCode.
export const recipeDetailRowSchema = z.object({
  id: z.string().optional(),
  inventoryCode: z.string().min(1, "validation.required"),
  unitCode: z.string().optional(),
  requiredQty: z.coerce.number().gt(0, "validation.mustBePositive").default(1),
  wastagePercent: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  unitCost: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  isOptional: z.boolean().default(false),
  remarks: z.string().optional(),
});
export type RecipeDetailRowFormValues = z.infer<typeof recipeDetailRowSchema>;

// Real RecipeMaster form — backs masters/recipes/page.tsx against
// BCorDFWebApi's actual RecipeMasterController (see types/restaurant.ts's
// RecipeMasterDto for the full field list this mirrors).
export const recipeSchema = z.object({
  code: z.string().min(1, "validation.required"),
  siteId: z.string().min(1, "validation.required"),
  recipeName: z.string().min(1, "validation.required"),
  recipeNameArb: z.string().optional(),
  menuCode: z.string().min(1, "validation.required"),
  yieldQty: z.coerce.number().gt(0, "validation.mustBePositive").default(1),
  yieldUnitCode: z.string().optional(),
  standardCost: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  preparationMinutes: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  cookingMinutes: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  instructions: z.string().optional(),
  instructionsArb: z.string().optional(),
  versionNo: z.coerce.number().min(1, "validation.mustBePositive").default(1),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().optional(),
  isDefault: z.boolean().default(true),
  remarks: z.string().optional(),
  active: z.boolean().default(true),
  details: z.array(recipeDetailRowSchema).default([]),
});
export type RecipeFormValues = z.infer<typeof recipeSchema>;
