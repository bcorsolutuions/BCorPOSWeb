"use client";

import { useTranslations } from "next-intl";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import type { RecipeFormValues } from "@/schemas/recipe-master.schema";

// Ingredient rows — a flat list, same "ship the flat editor first" precedent
// as ComboDetailEditor's componentCode (no InventoryMaster autocomplete
// picker yet, plain text code entry).
export function RecipeDetailEditor({ form }: { form: UseFormReturn<RecipeFormValues> }) {
  const t = useTranslations("recipe");
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "details" });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{t("ingredients")}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({
              inventoryCode: "",
              unitCode: "",
              requiredQty: 1,
              wastagePercent: 0,
              isOptional: false,
            })
          }
        >
          <Plus className="me-1 h-3.5 w-3.5" />
          {t("addIngredient")}
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("ingredientsHint")}</p>
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex flex-wrap items-start gap-2 rounded-md border p-2">
              <FormField
                control={form.control}
                name={`details.${index}.inventoryCode`}
                render={({ field: strField }) => (
                  <FormItem className="flex-1 basis-32">
                    <FormControl>
                      <Input placeholder={t("inventoryCode")} title={t("inventoryCode")} {...strField} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`details.${index}.unitCode`}
                render={({ field: strField }) => (
                  <FormItem className="w-24">
                    <FormControl>
                      <Input placeholder={t("unit")} title={t("unit")} {...strField} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`details.${index}.requiredQty`}
                render={({ field: numField }) => (
                  <FormItem className="w-24">
                    <Input type="number" step="any" placeholder={t("requiredQty")} title={t("requiredQty")} {...numField} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`details.${index}.wastagePercent`}
                render={({ field: numField }) => (
                  <FormItem className="w-24">
                    <Input type="number" step="any" placeholder={t("wastagePercent")} title={t("wastagePercent")} {...numField} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`details.${index}.unitCost`}
                render={({ field: numField }) => (
                  <FormItem className="w-24">
                    <Input type="number" step="any" placeholder={t("unitCost")} title={t("unitCost")} {...numField} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`details.${index}.isOptional`}
                render={({ field: boolField }) => (
                  <FormItem className="mt-2 flex items-center gap-1.5 space-y-0">
                    <FormControl>
                      <Checkbox checked={boolField.value} onCheckedChange={boolField.onChange} />
                    </FormControl>
                    <span className="text-xs text-muted-foreground">{t("optional")}</span>
                  </FormItem>
                )}
              />
              <Button type="button" variant="ghost" size="icon" className="mt-0.5" onClick={() => remove(index)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
