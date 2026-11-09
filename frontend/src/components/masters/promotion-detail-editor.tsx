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
import { PROMOTION_TARGET_TYPES, type PromotionFormValues } from "@/schemas/salon-master.schema";

// Targeting rows (Item / Item Category / Brand / Customer Category /
// Payment Mode) on a PromotionMaster — a promotion with none applies
// bill-/every-line-wide (e.g. VIP %, Happy Hour). Shared by /promotions
// (edit dialog) and /promotions/new (standalone create form) — a Next.js
// page.tsx file can't carry extra named exports, so this lives in its own
// module, same convention as ComboDetailEditor/CouponDetailEditor.
export function PromotionDetailEditor({ form }: { form: UseFormReturn<PromotionFormValues> }) {
  const t = useTranslations("salon");
  const tc = useTranslations("common");
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "details" });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{t("promotionTargets")}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({ targetType: "ITEM", targetCode: "", isExclude: false })
          }
        >
          <Plus className="me-1 h-3.5 w-3.5" />
          {tc("add")}
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("promotionTargetsHint")}</p>
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-2">
              <FormField
                control={form.control}
                name={`details.${index}.targetType`}
                render={({ field: selectField }) => (
                  <FormItem className="w-40">
                    <Select value={selectField.value} onValueChange={selectField.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("targetType")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROMOTION_TARGET_TYPES.map((tt) => (
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
                name={`details.${index}.targetCode`}
                render={({ field: codeField }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder={t("targetCode")} {...codeField} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`details.${index}.isExclude`}
                render={({ field: excludeField }) => (
                  <FormItem className="mt-2 flex items-center gap-1.5 space-y-0">
                    <FormControl>
                      <Checkbox checked={excludeField.value} onCheckedChange={excludeField.onChange} />
                    </FormControl>
                    <span className="text-xs text-muted-foreground">{t("exclude")}</span>
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
