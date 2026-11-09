"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import type { UseFormReturn } from "react-hook-form";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { useAuthStore } from "@/stores/auth-store";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { SetMenuFormValues } from "@/schemas/set-menu.schema";

const DAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

/**
 * GENERAL section — Code/Name/Description/Price/Tax/availability window,
 * shared between .../set-menu/new and .../set-menu/[id] so both stay in
 * sync rather than duplicating the field list. Reached directly from the
 * Restaurant Setup nav (not through POS Till Setup), so siteId comes from
 * posLookupService.getSites like every other Masters-nav page — see
 * feedback_masters_page_siteid.md.
 */
export function SetMenuGeneralFields({
  form,
  codeReadOnly,
}: {
  form: UseFormReturn<SetMenuFormValues>;
  codeReadOnly?: boolean;
}) {
  const t = useTranslations("setMenu");
  const tc = useTranslations("common");
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data: sites = [] } = useQuery({
    queryKey: ["set-menu-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  const availableDays = form.watch("availableDays") ?? "";
  const selectedDays = new Set(availableDays.split(",").filter(Boolean));

  function toggleDay(day: string) {
    const next = new Set(selectedDays);
    if (next.has(day)) next.delete(day);
    else next.add(day);
    form.setValue("availableDays", Array.from(next).join(","), { shouldDirty: true });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={form.control}
        name="code"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("code")}</FormLabel>
            <FormControl>
              <Input {...field} disabled={codeReadOnly} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="siteId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{tc("branch")}</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={tc("branch")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {sites.map((s) => (
                  <SelectItem key={s.siteID} value={s.siteID}>
                    {s.siteName}
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
        name="setMenuName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("setMenuName")}</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="setMenuNameArb"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("setMenuNameArb")}</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="sellingPrice"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("sellingPrice")}</FormLabel>
            <FormControl>
              <Input type="number" step="any" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="taxCode"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("taxCode")}</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="validFrom"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("validFrom")}</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="validTo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("validTo")}</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="startTime"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("startTime")}</FormLabel>
            <FormControl>
              <Input type="time" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="endTime"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("endTime")}</FormLabel>
            <FormControl>
              <Input type="time" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="sm:col-span-2 space-y-1.5">
        <Label>{t("availableDays")}</Label>
        <div className="flex flex-wrap gap-1.5">
          {DAY_CODES.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs",
                selectedDays.has(day) ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {t(`days.${day.toLowerCase()}` as never)}
            </button>
          ))}
        </div>
      </div>

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>{t("description")}</FormLabel>
            <FormControl>
              <Textarea {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="allowDiscount"
        render={({ field }) => (
          <FormItem className="flex items-center gap-2 space-y-0">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel className="!mt-0">{t("allowDiscount")}</FormLabel>
          </FormItem>
        )}
      />
    </div>
  );
}

/**
 * The Active checkbox, kept out of SetMenuGeneralFields so the pages can put it
 * last on the form — after the groups editor — as on every other master.
 */
export function SetMenuActiveField({ form }: { form: UseFormReturn<SetMenuFormValues> }) {
  const tc = useTranslations("common");
  return (
    <FormField
      control={form.control}
      name="active"
      render={({ field }) => (
        <FormItem className="flex items-center gap-2 space-y-0">
          <FormControl>
            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
          <FormLabel className="!mt-0">{tc("active")}</FormLabel>
        </FormItem>
      )}
    />
  );
}
