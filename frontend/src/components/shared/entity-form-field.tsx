"use client";

import { useTranslations } from "next-intl";
import { Control, FieldValues, Path, useFormContext } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { MoneyInput } from "@/components/shared/money-input";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface SelectOption {
  value: string;
  label: string;
  /** Shown but not pickable — an already-saved value that matches it still displays. */
  disabled?: boolean;
}

export interface FieldConfig<T extends FieldValues> {
  name: Path<T>;
  labelKey: string;
  type: "text" | "number" | "money" | "textarea" | "checkbox" | "select" | "date" | "datetime" | "time" | "password";
  options?: SelectOption[];
  /** Select whose choices depend on another field (e.g. sub category by category): re-evaluated whenever `dependsOn` changes. */
  dependsOn?: Path<T>;
  /** `values` is the whole form, for choices that depend on more than one other field (e.g. sections by branch AND floor). */
  optionsFor?: (parentValue: unknown, values: Record<string, unknown>) => SelectOption[];
  /** Fields to clear when the user picks a different value here (e.g. category → sub category). */
  resetOnChange?: Path<T>[];
  placeholder?: string;
  /** Same as placeholder, as an i18n key. */
  placeholderKey?: string;
  /** Read-only once the record exists (e.g. an automatic code that can no longer be changed). */
  lockOnEdit?: boolean;
  /** Layout classes for the field's wrapper — e.g. a grid column span when the form is laid out in columns (see CrudDataGridPage's formGridClassName). */
  className?: string;
  /** Small helper text shown under the field (an i18n key). */
  hintKey?: string;
  /** Extra classes for a textarea field itself (e.g. a shorter box). */
  inputClassName?: string;
}

export function EntityFormField<T extends FieldValues>({
  control,
  field: config,
  editing = false,
}: {
  control: Control<T>;
  field: FieldConfig<T>;
  /** The form edits an existing record (not a new one). */
  editing?: boolean;
}) {
  const t = useTranslations();
  const { watch, setValue } = useFormContext<T>();
  const selectOptions = config.optionsFor
    ? config.optionsFor(config.dependsOn ? watch(config.dependsOn) : undefined, watch() as Record<string, unknown>)
    : (config.options ?? []);

  return (
    <FormField
      control={control}
      name={config.name}
      render={({ field }) => (
        <FormItem
          className={cn(config.type === "checkbox" && "flex flex-row items-center gap-2 space-y-0", config.className)}
        >
          {config.type !== "checkbox" && <FormLabel>{t(config.labelKey)}</FormLabel>}
          <FormControl>
            {config.type === "textarea" ? (
              <Textarea {...field} value={field.value ?? ""} placeholder={config.placeholder} className={config.inputClassName} />
            ) : config.type === "money" ? (
              <MoneyInput {...field} value={field.value ?? ""} />
            ) : config.type === "checkbox" ? (
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            ) : config.type === "select" ? (
              <Select
                value={field.value}
                onValueChange={(v) => {
                  field.onChange(v);
                  config.resetOnChange?.forEach((name) =>
                    setValue(name, "" as never, { shouldDirty: true }),
                  );
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={config.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {selectOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                {...field}
                value={field.value ?? ""}
                type={
                  config.type === "number"
                    ? "number"
                    : config.type === "date"
                      ? "date"
                      : config.type === "datetime"
                        ? "datetime-local"
                        : config.type === "time"
                          ? "time"
                          : config.type === "password"
                            ? "password"
                            : "text"
                }
                placeholder={config.placeholderKey ? t(config.placeholderKey) : config.placeholder}
                readOnly={config.lockOnEdit && editing}
                className={config.lockOnEdit && editing ? "bg-muted" : undefined}
              />
            )}
          </FormControl>
          {config.type === "checkbox" && <FormLabel className="font-normal">{t(config.labelKey)}</FormLabel>}
          {config.hintKey && <p className="text-xs text-muted-foreground">{t(config.hintKey)}</p>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
