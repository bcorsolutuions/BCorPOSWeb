"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { FileUp, ImageOff, Images, Plus, Printer, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { ImageUploadDialog } from "@/components/shared/image-upload-dialog";
import { ImagePickerField } from "@/components/shared/image-picker-field";
import { BulkImageUploadDialog } from "@/components/shared/bulk-image-upload-dialog";
import { PrintLabelDialog } from "@/components/masters/print-label-dialog";
import { ItemVendorEditor } from "@/components/masters/item-vendor-editor";
import { ItemCostingPanel } from "@/components/masters/item-costing-panel";
import { useCurrentBranch } from "@/hooks/use-current-branch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { itemMasterService } from "@/lib/api/services/item-master-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { unitMasterService } from "@/lib/api/services/unit-master-service";
import { itemCategoryService } from "@/lib/api/services/item-category-service";
import { taxMasterService } from "@/lib/api/services/tax-master-service";
import { vendorMasterService } from "@/lib/api/services/vendor-master-service";
import { imageUploadService } from "@/lib/api/services/image-upload-service";
import { imageGenerationService } from "@/lib/api/services/image-generation-service";
import { itemMasterSchema, type ItemMasterFormValues } from "@/schemas/masters.schema";
import { useAuthStore } from "@/stores/auth-store";
import { useToast } from "@/components/ui/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { base64ToFile, cn, resolveImageUrl } from "@/lib/utils";
import type { ItemMaster, UnitMaster } from "@/types/item-master";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";

const ITEM_MASTER_QUERY_KEY = "item-master";

async function generateItemImage(name: string): Promise<File> {
  const { imageBase64, contentType } = await imageGenerationService.generateImage(
    `professional product photo of ${name || "a retail product"}, white background, studio lighting, retail packaging`,
  );
  return base64ToFile(imageBase64, contentType, "generated.png");
}

// Embedded in the Add/Edit dialog via CrudDataGridPage's renderExtra. Editing
// an existing item uploads immediately; a brand-new item has no `code` yet
// for the image endpoints to address, so the picked/generated file is only
// staged here (onStagedFileChange) and actually uploaded by the page's
// onSaved handler once the item is created. The mount-effect cleanup clears
// any staged file left over from a cancelled create attempt, since this
// component (and the whole dialog) unmounts on close either way.
function ItemImageField({
  editingEntity,
  form,
  stagedFile,
  onStagedFileChange,
  uploading,
  onUpload,
}: {
  editingEntity: ItemMaster | null;
  form: UseFormReturn<ItemMasterFormValues>;
  stagedFile: File | null;
  onStagedFileChange: (file: File | null) => void;
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  useEffect(() => {
    return () => onStagedFileChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ImagePickerField
      imageUrl={editingEntity?.imagePath}
      uploading={uploading}
      onUpload={onUpload}
      onGenerate={() => generateItemImage(form.getValues("name"))}
    />
  );
}

// One column template shared by the Units of Measure header and every row so
// the labels line up with their inputs: Unit | Conversion | Barcode | Tag |
// Retail | Wholesale | remove button.
const UOM_GRID =
  "grid min-w-[760px] grid-cols-[minmax(0,1.5fr)_5.5rem_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_2.5rem] items-start gap-2";

// Alternate selling/stocking units for the item (e.g. "Box = 12 PCS"),
// relative to the Base Unit field above — InventoryMaster's pre-existing
// UOMs detail collection (see item-master-service.ts's buildPayload for how
// each row round-trips as insert/update/delete on save).
function ItemUomEditor({ form, units }: { form: UseFormReturn<ItemMasterFormValues>; units: UnitMaster[] }) {
  const t = useTranslations("item");
  const tc = useTranslations("common");
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "uoms" });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{t("unitsOfMeasure")}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ unitCode: "", conversionFactor: 1, barCode: "" })}
        >
          <Plus className="me-1 h-3.5 w-3.5" />
          {tc("add")}
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("noUomsHint")}</p>
      ) : (
        <div className="space-y-2 overflow-x-auto">
          <div className={cn(UOM_GRID, "text-xs font-medium text-muted-foreground")}>
            <span>{t("unit")}</span>
            <span>{t("conversionFactor")}</span>
            <span>{t("barcode")}</span>
            <span>{t("tagPrice")}</span>
            <span>{t("retailPrice")}</span>
            <span>{t("wholesalePrice")}</span>
            <span />
          </div>
          {fields.map((field, index) => (
            <div key={field.id} className={UOM_GRID}>
              <FormField
                control={form.control}
                name={`uoms.${index}.unitCode`}
                render={({ field: selectField }) => (
                  <FormItem>
                    <Select value={selectField.value} onValueChange={selectField.onChange}>
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
                name={`uoms.${index}.conversionFactor`}
                render={({ field: numField }) => (
                  <FormItem>
                    <FormControl>
                      <Input type="number" step="any" aria-label={t("conversionFactor")} {...numField} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`uoms.${index}.barCode`}
                render={({ field: barCodeField }) => (
                  <FormItem>
                    <FormControl>
                      <Input aria-label={t("barcode")} {...barCodeField} value={barCodeField.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {(
                [
                  ["tagPrice", "tagPrice"],
                  ["retailPrice", "retailPrice"],
                  ["wholesalePrice", "wholesalePrice"],
                ] as const
              ).map(([fieldName, labelKey]) => (
                <FormField
                  key={fieldName}
                  control={form.control}
                  name={`uoms.${index}.${fieldName}`}
                  render={({ field: priceField }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          min={0}
                          aria-label={t(labelKey)}
                          className="text-end tabular-nums"
                          {...priceField}
                          value={priceField.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-0.5"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ItemMasterPage() {
  const t = useTranslations("common");
  const ti = useTranslations("item");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const [imageDialogItem, setImageDialogItem] = useState<ItemMaster | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [labelPrintItem, setLabelPrintItem] = useState<ItemMaster | null>(null);
  const [stagedFile, setStagedFile] = useState<File | null>(null);

  // Shares CrudDataGridPage's own cache entry (same queryKey/queryFn) rather
  // than a second network call — TanStack Query dedupes by key, so this just
  // reads whatever CrudDataGridPage already fetched for the grid.
  const { data: itemList } = useQuery({
    queryKey: [ITEM_MASTER_QUERY_KEY],
    queryFn: () => itemMasterService.list(),
    enabled: !!compId,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["item-master-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  const { data: units = [] } = useQuery({
    queryKey: ["item-master-units", compId],
    queryFn: () => unitMasterService.getUnits(compId),
    enabled: !!compId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["item-master-categories", compId],
    queryFn: () => itemCategoryService.getCategories(compId),
    enabled: !!compId,
  });

  // Items file under a sub category whenever a main category has any, so a
  // main category with sub categories is listed (greyed out) but not
  // pickable — it stays visible so an item filed there before the sub
  // categories existed still shows its current category when edited.
  const categoryOptions = useMemo(() => {
    const active = categories.filter((c) => c.active);
    const parentCodes = new Set(active.filter((c) => c.parentCode).map((c) => c.parentCode as string));
    const mains = active.filter((c) => !c.parentCode).sort((a, b) => a.name.localeCompare(b.name));
    return mains.flatMap((main) => {
      const hasSubs = parentCodes.has(main.code);
      const subs = active
        .filter((c) => c.parentCode === main.code)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((s) => ({ value: s.code, label: `${main.name} › ${s.name}` }));
      return [
        {
          value: main.code,
          label: hasSubs ? `${main.name} (${ti("hasSubCategories")})` : main.name,
          disabled: hasSubs,
        },
        ...subs,
      ];
    });
  }, [categories, ti]);

  // Stock column: on-hand quantity at the branch the user is working in.
  const { siteId: branchId, siteName: branchName } = useCurrentBranch();
  const { data: branchStock } = useQuery({
    queryKey: ["item-branch-stock", compId, branchId],
    queryFn: () => itemMasterService.getBranchStock(branchId),
    enabled: !!compId && !!branchId,
  });

  const { data: vendorList } = useQuery({
    queryKey: ["item-master-vendors", compId],
    queryFn: () => vendorMasterService.list(),
    enabled: !!compId,
  });
  const vendorOptions = useMemo(
    () => (vendorList?.items ?? []).map((v) => ({ code: v.code, name: v.vendorName })),
    [vendorList],
  );

  const { data: taxCodes = [] } = useQuery({
    queryKey: ["item-master-tax-codes", compId],
    queryFn: () => taxMasterService.getTaxCodes(compId),
    enabled: !!compId,
  });

  const uploadImageMutation = useMutation({
    mutationFn: ({ code, file }: { code: string; file: File }) =>
      imageUploadService.uploadItemImage(compId, code, file),
    onSuccess: () => {
      toast({ title: t("photoUpdated") });
      queryClient.invalidateQueries({ queryKey: [ITEM_MASTER_QUERY_KEY] });
    },
    onError: (err) => toast({ title: apiErrorMessage(err, t("errorGeneric")), variant: "destructive" }),
  });

  const removeImageMutation = useMutation({
    mutationFn: (code: string) => imageUploadService.deleteItemImage(compId, code),
    onSuccess: () => {
      toast({ title: t("photoRemoved") });
      queryClient.invalidateQueries({ queryKey: [ITEM_MASTER_QUERY_KEY] });
    },
    onError: (err) => toast({ title: apiErrorMessage(err, t("errorGeneric")), variant: "destructive" }),
  });

  const fields: FieldConfig<ItemMasterFormValues>[] = useMemo(
    () => [
      { name: "code", labelKey: "item.sku", type: "text" },
      { name: "name", labelKey: "common.name", type: "text", className: "md:col-span-2" },
      {
        name: "description",
        labelKey: "common.description",
        type: "textarea",
        className: "md:col-span-3",
        inputClassName: "min-h-[56px]",
      },
      {
        name: "siteId",
        labelKey: "common.branch",
        type: "select",
        options: sites.map((s) => ({ value: s.siteID, label: s.siteName })),
      },
      {
        name: "categoryCode",
        labelKey: "item.category",
        type: "select",
        options: categoryOptions,
      },
      {
        // Captioned "Base Unit" (not just "Unit") now that Units of Measure
        // below lets an item carry alternate units too — this is the one
        // stock is counted in.
        name: "unitCode",
        labelKey: "item.baseUnit",
        type: "select",
        options: units.map((u) => ({
          value: u.code,
          label: u.abbreviation ? `${u.unitName} (${u.abbreviation})` : u.unitName,
        })),
      },
      { name: "barCode", labelKey: "item.barcode", type: "text" },
      {
        // Tax Rate is deliberately not a field here — it's resolved from Tax
        // Master (see item-master-service.ts's resolveTaxRate) whenever the
        // item is saved, not typed per item. The rate shows right in the
        // option label so picking a code still tells you what it applies.
        name: "taxCode",
        labelKey: "item.taxCode",
        type: "select",
        options: taxCodes.map((tx) => ({ value: tx.code, label: `${tx.taxName} (${tx.taxRate}%)` })),
      },
      { name: "pluCode", labelKey: "item.pluCode", type: "text" },
      // The three prices share a row. "price" is the Retail Price — the one
      // POS bills at (InventoryMaster.RetailPrice).
      { name: "tagPrice", labelKey: "item.tagPrice", type: "money" },
      { name: "price", labelKey: "item.retailPrice", type: "money" },
      { name: "wholesalePrice", labelKey: "item.wholesalePrice", type: "money" },
      { name: "costPrice", labelKey: "item.costPrice", type: "money" },
      { name: "brandCode", labelKey: "item.brand", type: "text" },
      { name: "isWeighted", labelKey: "item.isWeighted", type: "checkbox" },
      { name: "active", labelKey: "common.active", type: "checkbox" },
    ],
    [sites, units, categoryOptions, taxCodes],
  );

  return (
    <>
    <div className="mb-2 flex items-center justify-end gap-2">
      {branchName && (
        <span className="me-auto text-sm text-muted-foreground">{ti("stockAtBranch", { branch: branchName })}</span>
      )}
      <Button variant="outline" size="sm" asChild>
        <Link href="/masters/import?entity=items">
          <FileUp className="me-1 h-4 w-4" />
          {t("import")}
        </Link>
      </Button>
      <Button variant="outline" size="sm" onClick={() => setBulkDialogOpen(true)}>
        <Images className="me-1 h-4 w-4" />
        {t("bulkUploadPhotos")}
      </Button>
    </div>

    <CrudDataGridPage<ItemMaster, ItemMasterFormValues>
      queryKey="item-master"
      titleKey="item.title"
      descriptionKey="item.bilingualNameHint"
      service={itemMasterService}
      schema={itemMasterSchema}
      fields={fields}
      permission={PERMISSIONS.INVENTORY_MANAGE_ITEMS}
      // Wide 4-column form so every field shows without scrolling: fields use
      // the first 3 columns, the photo takes the 4th beside them (6 rows
      // tall), Units of Measure runs full width underneath.
      dialogClassName="max-w-5xl"
      formGridClassName="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-4"
      defaultValues={{
        code: "",
        name: "",
        description: "",
        categoryCode: "",
        unitCode: "",
        barCode: "",
        price: 0,
        tagPrice: undefined,
        wholesalePrice: undefined,
        costPrice: undefined,
        brandCode: "",
        taxCode: "",
        siteId: "",
        active: true,
        isWeighted: false,
        pluCode: "",
        uoms: [],
        vendors: [],
      }}
      toFormValues={(entity) => ({
        code: entity.code,
        name: entity.name,
        description: entity.description ?? "",
        categoryCode: entity.categoryCode ?? "",
        unitCode: entity.unitCode ?? "",
        barCode: entity.barCode ?? "",
        price: entity.price ?? 0,
        tagPrice: entity.tagPrice ?? undefined,
        wholesalePrice: entity.wholesalePrice ?? undefined,
        costPrice: entity.costPrice ?? undefined,
        brandCode: entity.brandCode ?? "",
        taxCode: entity.taxCode ?? "",
        siteId: entity.siteID,
        active: entity.active,
        isWeighted: entity.isWeighted,
        pluCode: entity.pluCode ?? "",
        uoms: (entity.uoms ?? []).map((u) => ({
          id: u.id,
          unitCode: u.unitCode,
          conversionFactor: u.conversionFactor,
          barCode: u.barCode ?? "",
          tagPrice: u.tagPrice ?? undefined,
          retailPrice: u.retailPrice ?? undefined,
          wholesalePrice: u.wholesalePrice ?? undefined,
        })),
        vendors: (entity.vendors ?? []).map((v) => ({
          id: v.id,
          vendorCode: v.vendorCode,
          unitCode: v.unitCode ?? "",
          price: v.price ?? undefined,
          vendorItemRef: v.vendorItemRef ?? "",
          vendorItemName: v.vendorItemName ?? "",
          vendorItemNameArb: v.vendorItemNameArb ?? "",
          remarks: v.remarks ?? "",
          remarksArb: v.remarksArb ?? "",
        })),
      })}
      onSaved={(entity) => {
        if (stagedFile) {
          uploadImageMutation.mutate({ code: entity.code, file: stagedFile });
          setStagedFile(null);
        }
      }}
      renderExtra={({ form, editingEntity }) => (
        <>
          <div className="md:col-start-4 md:row-span-6 md:row-start-1">
            <ItemImageField
              editingEntity={editingEntity}
              form={form}
              stagedFile={stagedFile}
              onStagedFileChange={setStagedFile}
              uploading={uploadImageMutation.isPending}
              onUpload={(file) => {
                if (editingEntity) {
                  uploadImageMutation.mutate({ code: editingEntity.code, file });
                } else {
                  setStagedFile(file);
                }
              }}
            />
          </div>
          <div className="col-span-full">
            <ItemCostingPanel form={form} editingEntity={editingEntity} onPrintBarcode={setLabelPrintItem} />
          </div>
          <div className="col-span-full">
            <ItemUomEditor form={form} units={units} />
          </div>
          <div className="col-span-full">
            <ItemVendorEditor form={form} vendors={vendorOptions} units={units} />
          </div>
        </>
      )}
      columns={[
        {
          dataField: "imagePath",
          captionKey: "common.photo",
          width: 70,
          cellRender: (data) => {
            const item = data.data as unknown as ItemMaster;
            const url = resolveImageUrl(item.imagePath);
            return (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setImageDialogItem(item);
                }}
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded border bg-muted"
              >
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- backend-served upload
                  <img src={url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageOff className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            );
          },
        },
        { dataField: "code", captionKey: "item.sku", width: 120 },
        { dataField: "name", captionKey: "common.name" },
        { dataField: "barCode", captionKey: "item.barcode", width: 140 },
        { dataField: "price", captionKey: "item.retailPrice", dataType: "number", width: 120 },
        { dataField: "active", captionKey: "common.status", width: 100 },
        {
          dataField: "stock",
          captionKey: "item.stock",
          width: 100,
          cellRender: (data) => {
            const item = data.data as unknown as ItemMaster;
            const qty = branchStock?.[item.code] ?? 0;
            return (
              <span className={cn("block text-end tabular-nums", qty < 0 && "text-destructive", qty === 0 && "text-muted-foreground")}>
                {branchStock ? qty.toLocaleString(undefined, { maximumFractionDigits: 3 }) : "…"}
              </span>
            );
          },
        },
        {
          dataField: "id",
          captionKey: "item.printLabel",
          width: 60,
          cellRender: (data) => {
            const item = data.data as unknown as ItemMaster;
            return (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLabelPrintItem(item);
                }}
                className="flex h-8 w-8 items-center justify-center rounded border hover:bg-accent"
                title={ti("printLabel")}
              >
                <Printer className="h-4 w-4" />
              </button>
            );
          },
        },
      ]}
    />

    <ImageUploadDialog
      open={!!imageDialogItem}
      onOpenChange={(open) => !open && setImageDialogItem(null)}
      imageUrl={imageDialogItem?.imagePath}
      uploading={uploadImageMutation.isPending || removeImageMutation.isPending}
      onUpload={(file) => imageDialogItem && uploadImageMutation.mutate({ code: imageDialogItem.code, file })}
      onGenerate={() => generateItemImage(imageDialogItem?.name ?? "")}
      onRemove={() => imageDialogItem && removeImageMutation.mutate(imageDialogItem.code)}
    />

    <BulkImageUploadDialog
      open={bulkDialogOpen}
      onOpenChange={setBulkDialogOpen}
      entities={(itemList?.items ?? []).map((i) => ({ code: i.code, name: i.name }))}
      uploadFn={(code, file) => imageUploadService.uploadItemImage(compId, code, file)}
      onDone={() => queryClient.invalidateQueries({ queryKey: [ITEM_MASTER_QUERY_KEY] })}
    />

    <PrintLabelDialog item={labelPrintItem} onOpenChange={(open) => !open && setLabelPrintItem(null)} />
    </>
  );
}
