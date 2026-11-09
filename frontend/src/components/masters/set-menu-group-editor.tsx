"use client";

import { useTranslations } from "next-intl";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import type { SetMenuFormValues } from "@/schemas/set-menu.schema";

// Set Menu's courses (groups) each own a nested list of choices (items) —
// genuinely 2 levels of useFieldArray, unlike every other master-with-
// details editor in this codebase (Combo/Recipe/Promotion are all one flat
// list). The outer array is "groups"; each group card owns its own
// useFieldArray scoped to `groups.${groupIndex}.items` via the sub-
// component below — this is the standard RHF nested-field-array pattern,
// not a library limitation. See kind-crafting-hamming.md.
export function SetMenuGroupEditor({ form }: { form: UseFormReturn<SetMenuFormValues> }) {
  const t = useTranslations("setMenu");
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "groups" });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base">{t("courses")}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({
              groupCode: "",
              groupName: "",
              sequence: fields.length + 1,
              minSelection: 1,
              maxSelection: 1,
              isRequired: true,
              displayOrder: fields.length,
              active: true,
              items: [],
            })
          }
        >
          <Plus className="me-1 h-3.5 w-3.5" />
          {t("addCourse")}
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("noCourses")}</p>
      ) : (
        <div className="space-y-3">
          {fields.map((field, groupIndex) => (
            <div key={field.id} className="space-y-2 rounded-md border p-3">
              <div className="flex flex-wrap items-start gap-2">
                <FormField
                  control={form.control}
                  name={`groups.${groupIndex}.sequence`}
                  render={({ field: numField }) => (
                    <FormItem className="w-20">
                      <Input type="number" min={0} placeholder={t("sequence")} title={t("sequence")} {...numField} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`groups.${groupIndex}.groupCode`}
                  render={({ field: strField }) => (
                    <FormItem className="w-28">
                      <FormControl>
                        <Input placeholder={t("groupCode")} title={t("groupCode")} {...strField} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`groups.${groupIndex}.groupName`}
                  render={({ field: strField }) => (
                    <FormItem className="flex-1 basis-32">
                      <FormControl>
                        <Input placeholder={t("groupName")} title={t("groupName")} {...strField} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`groups.${groupIndex}.minSelection`}
                  render={({ field: numField }) => (
                    <FormItem className="w-20">
                      <Input type="number" min={0} placeholder={t("minSelection")} title={t("minSelection")} {...numField} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`groups.${groupIndex}.maxSelection`}
                  render={({ field: numField }) => (
                    <FormItem className="w-20">
                      <Input type="number" min={0} placeholder={t("maxSelection")} title={t("maxSelection")} {...numField} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`groups.${groupIndex}.isRequired`}
                  render={({ field: boolField }) => (
                    <FormItem className="mt-2 flex items-center gap-1.5 space-y-0">
                      <FormControl>
                        <Checkbox checked={boolField.value} onCheckedChange={boolField.onChange} />
                      </FormControl>
                      <span className="text-xs text-muted-foreground">{t("isRequired")}</span>
                    </FormItem>
                  )}
                />
                <Button type="button" variant="ghost" size="icon" className="mt-0.5" onClick={() => remove(groupIndex)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              <SetMenuGroupItemsEditor form={form} groupIndex={groupIndex} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SetMenuGroupItemsEditor({ form, groupIndex }: { form: UseFormReturn<SetMenuFormValues>; groupIndex: number }) {
  const t = useTranslations("setMenu");
  const { fields, append, remove } = useFieldArray({ control: form.control, name: `groups.${groupIndex}.items` });

  return (
    <div className="ms-6 space-y-1.5 border-s ps-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{t("choices")}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => append({ menuCode: "", additionalPrice: 0, isDefault: false, displayOrder: fields.length, active: true })}
        >
          <Plus className="me-1 h-3.5 w-3.5" />
          {t("addChoice")}
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("noChoices")}</p>
      ) : (
        fields.map((field, itemIndex) => (
          <div key={field.id} className="flex flex-wrap items-start gap-2 rounded-md border p-2">
            <FormField
              control={form.control}
              name={`groups.${groupIndex}.items.${itemIndex}.menuCode`}
              render={({ field: strField }) => (
                <FormItem className="flex-1 basis-32">
                  <FormControl>
                    <Input placeholder={t("menuCode")} title={t("menuCode")} {...strField} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`groups.${groupIndex}.items.${itemIndex}.additionalPrice`}
              render={({ field: numField }) => (
                <FormItem className="w-28">
                  <Input type="number" step="any" placeholder={t("additionalPrice")} title={t("additionalPrice")} {...numField} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`groups.${groupIndex}.items.${itemIndex}.isDefault`}
              render={({ field: boolField }) => (
                <FormItem className="mt-2 flex items-center gap-1.5 space-y-0">
                  <FormControl>
                    <Checkbox checked={boolField.value} onCheckedChange={boolField.onChange} />
                  </FormControl>
                  <span className="text-xs text-muted-foreground">{t("isDefault")}</span>
                </FormItem>
              )}
            />
            <Button type="button" variant="ghost" size="icon" className="mt-0.5" onClick={() => remove(itemIndex)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))
      )}
    </div>
  );
}
