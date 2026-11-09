"use client";

import { useTranslations } from "next-intl";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ItemMasterFormValues } from "@/schemas/masters.schema";
import type { UnitMaster } from "@/types/item-master";

export interface VendorOption {
  code: string;
  name: string;
}

// Suppliers that sell this item — InventoryMaster's VendorDetails collection
// (see item-master-service.ts: a row with `id` is updated, one without is
// inserted, and a saved row removed here is deleted on save).
export function ItemVendorEditor({
  form,
  vendors,
  units,
}: {
  form: UseFormReturn<ItemMasterFormValues>;
  vendors: VendorOption[];
  units: UnitMaster[];
}) {
  const t = useTranslations("item");
  const tc = useTranslations("common");
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "vendors" });

  // A row can point at a vendor that is no longer in the active list (made
  // inactive since) — keep it selectable so the saved choice still displays.
  const vendorOptionsFor = (current: string | undefined) =>
    current && !vendors.some((v) => v.code === current)
      ? [...vendors, { code: current, name: current }]
      : vendors;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{t("vendorDetails")}</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => append({ vendorCode: "" })}>
          <Plus className="me-1 h-3.5 w-3.5" />
          {tc("add")}
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("noVendorsHint")}</p>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="rounded-md border p-3">
              <div className="grid grid-cols-1 gap-x-3 gap-y-2 md:grid-cols-[repeat(4,minmax(0,1fr))_2.5rem]">
                <FormField
                  control={form.control}
                  name={`vendors.${index}.vendorCode`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t("vendor")}</FormLabel>
                      <Select value={f.value} onValueChange={f.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("vendor")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vendorOptionsFor(f.value).map((v) => (
                            <SelectItem key={v.code} value={v.code}>
                              {v.name === v.code ? v.code : `${v.name} (${v.code})`}
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
                  name={`vendors.${index}.unitCode`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t("unit")}</FormLabel>
                      <Select value={f.value ?? ""} onValueChange={f.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("unit")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {units.map((u) => (
                            <SelectItem key={u.code} value={u.code}>
                              {u.abbreviation ? `${u.unitName} (${u.abbreviation})` : u.unitName}
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
                  name={`vendors.${index}.price`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t("vendorPrice")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          min={0}
                          className="text-end tabular-nums"
                          {...f}
                          value={f.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`vendors.${index}.vendorItemRef`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t("vendorItemRef")}</FormLabel>
                      <FormControl>
                        <Input {...f} value={f.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-5 hidden md:inline-flex"
                  onClick={() => remove(index)}
                  aria-label={tc("delete")}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>

                <FormField
                  control={form.control}
                  name={`vendors.${index}.vendorItemName`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t("vendorItemName")}</FormLabel>
                      <FormControl>
                        <Input {...f} value={f.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`vendors.${index}.vendorItemNameArb`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t("vendorItemNameArb")}</FormLabel>
                      <FormControl>
                        <Input dir="rtl" {...f} value={f.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`vendors.${index}.remarks`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{tc("remarks")}</FormLabel>
                      <FormControl>
                        <Input {...f} value={f.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`vendors.${index}.remarksArb`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t("vendorRemarksArb")}</FormLabel>
                      <FormControl>
                        <Input dir="rtl" {...f} value={f.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Phone width: the remove button sits under the fields instead of beside them. */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="justify-self-start md:hidden"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="me-1 h-4 w-4 text-destructive" />
                  {tc("delete")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
