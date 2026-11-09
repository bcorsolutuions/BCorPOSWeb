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
import { COUPON_TARGET_TYPES } from "@/types/coupon";
import type { CouponFormValues } from "@/schemas/coupon-master.schema";

// Coupon restriction rows — a flat list, same precedent as
// masters/promotions/page.tsx's PromotionDetailEditor and
// combo-detail-editor.tsx. Zero rows of a given targetType means
// unrestricted on that axis (ITEM/ITEM_CATEGORY/BRAND/SITE — see
// types/coupon.ts's CouponTargetType doc comment).
export function CouponDetailEditor({ form }: { form: UseFormReturn<CouponFormValues> }) {
  const t = useTranslations("coupon");
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "details" });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{t("targets")}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ targetType: "ITEM", targetCode: "", isExclude: false })}
        >
          <Plus className="me-1 h-3.5 w-3.5" />
          {t("addTarget")}
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
                name={`details.${index}.targetType`}
                render={({ field: selectField }) => (
                  <FormItem className="w-36">
                    <Select value={selectField.value} onValueChange={selectField.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("targetType")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COUPON_TARGET_TYPES.map((tt) => (
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
                render={({ field: strField }) => (
                  <FormItem className="flex-1 basis-32">
                    <FormControl>
                      <Input placeholder={t("targetCode")} {...strField} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`details.${index}.isExclude`}
                render={({ field: boolField }) => (
                  <FormItem className="mt-2 flex items-center gap-1.5 space-y-0">
                    <FormControl>
                      <Checkbox checked={boolField.value} onCheckedChange={boolField.onChange} />
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
