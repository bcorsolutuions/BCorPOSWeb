"use client";

import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import {
  Control,
  Controller,
  FieldArrayPath,
  FieldValues,
  Path,
  useFieldArray,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SelectOption } from "@/components/shared/entity-form-field";

export interface LineColumnConfig {
  name: string;
  labelKey: string;
  type: "number" | "text" | "date";
  readOnly?: boolean;
}

/**
 * Shared line-item table for the document types that carry lines
 * (Purchase Order, GRN, Stock Transfer, Stock Adjustment — see
 * 06-database-design.md). Each caller supplies the extra columns beyond
 * the common item picker; qty math/derived columns stay in the caller.
 */
export function DocumentLineItemsEditor<T extends FieldValues>({
  control,
  name,
  itemOptions,
  columns,
  emptyLine,
}: {
  control: Control<T>;
  name: FieldArrayPath<T>;
  itemOptions: SelectOption[];
  columns: LineColumnConfig[];
  emptyLine: Record<string, unknown>;
}) {
  const t = useTranslations();
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <div className="space-y-2 rounded-md border p-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("item.title")}</TableHead>
            {columns.map((col) => (
              <TableHead key={col.name}>{t(col.labelKey)}</TableHead>
            ))}
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field, index) => (
            <TableRow key={field.id}>
              <TableCell className="min-w-[180px]">
                <Controller
                  control={control}
                  name={`${name}.${index}.itemId` as Path<T>}
                  render={({ field: itemField }) => (
                    <Select value={itemField.value as string} onValueChange={itemField.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("item.title")} />
                      </SelectTrigger>
                      <SelectContent>
                        {itemOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </TableCell>
              {columns.map((col) => (
                <TableCell key={col.name} className="min-w-[110px]">
                  <Controller
                    control={control}
                    name={`${name}.${index}.${col.name}` as Path<T>}
                    render={({ field: cellField }) => (
                      <Input
                        {...cellField}
                        value={(cellField.value as string | number | undefined) ?? ""}
                        type={col.type}
                        readOnly={col.readOnly}
                      />
                    )}
                  />
                </TableCell>
              ))}
              <TableCell>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button type="button" variant="outline" size="sm" onClick={() => append(emptyLine as never)}>
        <Plus className="me-1 h-4 w-4" />
        {t("common.add")}
      </Button>
    </div>
  );
}
