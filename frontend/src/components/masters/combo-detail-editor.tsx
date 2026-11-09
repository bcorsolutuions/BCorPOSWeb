"use client";

import { useTranslations } from "next-intl";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COMBO_COMPONENT_TYPES } from "@/types/combo";
import type { ComboFormValues } from "@/schemas/combo-master.schema";

// Combo component rows — a flat list (bucketed visually by groupNo), same
// precedent as masters/promotions/page.tsx's PromotionDetailEditor.
// componentCode stays plain text for v1 (no per-ComponentType autocomplete
// picker yet) — same "ship the flat editor first" call made for
// PromotionDetail's TargetCode.
//
// minimumSelection/maximumSelection describe the GROUP's pick range (e.g.
// "choose 2 of these 4 sides"), same as groupName — there's no separate
// Group entity, so admins set the identical min/max on every row that
// shares a groupNo. SelectComboOptionsDialog reads whatever the group's
// rows carry (max across them) to decide checkbox-with-cap vs. the older
// exactly-one radio behavior. Leaving max at 1 keeps a group's old
// radio/checkbox behavior unchanged.
export function ComboDetailEditor({ form }: { form: UseFormReturn<ComboFormValues> }) {
  const t = useTranslations("combo");
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "details" });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{t("targets")}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({
              groupNo: 1,
              componentType: "Inventory",
              componentCode: "",
              isOptional: false,
              quantity: 1,
              minimumSelection: 0,
              maximumSelection: 1,
              additionalPrice: 0,
              isDefault: false,
              displayOrder: 0,
            })
          }
        >
          <Plus className="me-1 h-3.5 w-3.5" />
          {t("addComponent")}
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("targetsHint")}</p>
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex flex-wrap items-start gap-2 rounded-md border p-2">
              <FormField
                control={form.control}
                name={`details.${index}.groupNo`}
                render={({ field: numField }) => (
                  <FormItem className="w-20">
                    <Input type="number" placeholder={t("groupNo")} title={t("groupNo")} {...numField} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`details.${index}.groupName`}
                render={({ field: strField }) => (
                  <FormItem className="w-28">
                    <FormControl>
                      <Input placeholder={t("groupName")} {...strField} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`details.${index}.componentType`}
                render={({ field: selectField }) => (
                  <FormItem className="w-32">
                    <Select value={selectField.value} onValueChange={selectField.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("componentType")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COMBO_COMPONENT_TYPES.map((tt) => (
                          <SelectItem key={tt} value={tt}>
                            {tt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`details.${index}.componentCode`}
                render={({ field: strField }) => (
                  <FormItem className="flex-1 basis-32">
                    <FormControl>
                      <Input placeholder={t("componentCode")} {...strField} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`details.${index}.quantity`}
                render={({ field: numField }) => (
                  <FormItem className="w-20">
                    <Input type="number" step="any" placeholder={t("quantity")} title={t("quantity")} {...numField} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`details.${index}.additionalPrice`}
                render={({ field: numField }) => (
                  <FormItem className="w-24">
                    <Input type="number" step="any" placeholder={t("additionalPrice")} title={t("additionalPrice")} {...numField} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`details.${index}.minimumSelection`}
                render={({ field: numField }) => (
                  <FormItem className="w-20">
                    <Input type="number" min={0} placeholder={t("minimumSelection")} title={t("minimumSelection")} {...numField} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`details.${index}.maximumSelection`}
                render={({ field: numField }) => (
                  <FormItem className="w-20">
                    <Input type="number" min={0} placeholder={t("maximumSelection")} title={t("maximumSelection")} {...numField} />
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
                    <span className="text-xs text-muted-foreground">{t("isOptional")}</span>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`details.${index}.isDefault`}
                render={({ field: boolField }) => (
                  <FormItem className="mt-2 flex items-center gap-1.5 space-y-0">
                    <FormControl>
                      <Checkbox checked={boolField.value} onCheckedChange={boolField.onChange} />
                    </FormControl>
                    <span className="text-xs text-muted-foreground">{t("isDefault")}</span>
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
