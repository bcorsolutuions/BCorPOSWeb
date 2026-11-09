"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseFormReturn } from "react-hook-form";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { ImagePickerField } from "@/components/shared/image-picker-field";
import { menuMasterService, type MenuMaster } from "@/lib/api/services/menu-master-service";
import { menuCategoryService } from "@/lib/api/services/menu-category-service";
import { menuSubCategoryService } from "@/lib/api/services/menu-sub-category-service";
import { kitchenMasterService } from "@/lib/api/services/kitchen-master-service";
import { unitMasterService } from "@/lib/api/services/unit-master-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { imageUploadService } from "@/lib/api/services/image-upload-service";
import { imageGenerationService } from "@/lib/api/services/image-generation-service";
import { menuItemSchema, type MenuItemFormValues } from "@/schemas/restaurant-master.schema";
import { useAuthStore } from "@/stores/auth-store";
import { useToast } from "@/components/ui/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { base64ToFile, resolveImageUrl, shrinkImage } from "@/lib/utils";
import { BulkMenuImageGenerator, menuItemImagePrompt } from "@/components/restaurant/bulk-menu-image-generator";
import { UtensilsCrossed } from "lucide-react";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";
import type { MenuItemDto } from "@/types/restaurant";

async function generateMenuItemImage(item: MenuItemDto, categoryName?: string, subCategoryName?: string): Promise<File> {
  const { imageBase64, contentType } = await imageGenerationService.generateImage(
    menuItemImagePrompt(item, categoryName, subCategoryName),
  );
  return shrinkImage(base64ToFile(imageBase64, contentType, "generated.png"));
}

// Same staged-vs-immediate pattern as Item Master's ItemImageField (see
// masters/items/page.tsx) — a brand-new menu item has no code yet for the
// image endpoints to address, so the picked/generated file is staged
// locally until the item is created.
function MenuItemImageField({
  editingEntity,
  form,
  stagedFile,
  onStagedFileChange,
  uploading,
  onUpload,
  categoryName,
  subCategoryName,
}: {
  editingEntity: MenuMaster | null;
  form: UseFormReturn<MenuItemFormValues>;
  stagedFile: File | null;
  onStagedFileChange: (file: File | null) => void;
  uploading: boolean;
  onUpload: (file: File) => void;
  categoryName: (code: string) => string | undefined;
  subCategoryName: (code: string) => string | undefined;
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
      onGenerate={() =>
        generateMenuItemImage(
          {
            ...(editingEntity ?? ({} as MenuItemDto)),
            menuName: form.getValues("menuName"),
            description: form.getValues("description") || null,
          },
          categoryName(form.getValues("categoryCode")),
          subCategoryName(form.getValues("subCategoryCode") ?? ""),
        )
      }
    />
  );
}

export default function MenuMasterPage() {
  const t = useTranslations("common");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const [stagedFile, setStagedFile] = useState<File | null>(null);

  const { data: sites = [] } = useQuery({
    queryKey: ["menu-item-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  const { data: categoriesResult } = useQuery({
    queryKey: ["menu-item-categories"],
    queryFn: () => menuCategoryService.list(),
    enabled: !!compId,
  });
  const categories = categoriesResult?.items ?? [];

  const { data: subCategoriesResult } = useQuery({
    queryKey: ["menu-item-sub-categories"],
    queryFn: () => menuSubCategoryService.list(),
    enabled: !!compId,
  });
  const subCategories = subCategoriesResult?.items ?? [];

  const { data: kitchensResult } = useQuery({
    queryKey: ["menu-item-kitchens"],
    queryFn: () => kitchenMasterService.list(),
    enabled: !!compId,
  });
  const kitchens = kitchensResult?.items ?? [];

  const { data: units = [] } = useQuery({
    queryKey: ["menu-item-units", compId],
    queryFn: () => unitMasterService.getUnits(compId),
    enabled: !!compId,
  });

  // Same key CrudDataGridPage lists under, so this shares the grid's cache (no second request).
  const { data: menuItemsResult } = useQuery({
    queryKey: ["menu-item-master"],
    queryFn: () => menuMasterService.list(),
    enabled: !!compId,
  });
  const menuItems = menuItemsResult?.items ?? [];

  const categoryName = (code: string) => categories.find((c) => c.code === code)?.categoryName;
  const subCategoryName = (code: string) => subCategories.find((s) => s.code === code)?.subCategoryName;

  const uploadImageMutation = useMutation({
    mutationFn: ({ code, file }: { code: string; file: File }) =>
      imageUploadService.uploadMenuItemImage(compId, code, file),
    onSuccess: () => {
      toast({ title: t("photoUpdated") });
      queryClient.invalidateQueries({ queryKey: ["menu-item-master"] });
    },
    onError: (err) => toast({ title: apiErrorMessage(err, t("errorGeneric")), variant: "destructive" }),
  });

  const fields: FieldConfig<MenuItemFormValues>[] = useMemo(
    () => [
      { name: "code", labelKey: "item.sku", type: "text" },
      { name: "menuName", labelKey: "common.name", type: "text" },
      { name: "menuNameArb", labelKey: "common.nameAr", type: "text" },
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
        options: categories.map((c) => ({ value: c.code, label: c.categoryName })),
        resetOnChange: ["subCategoryCode"],
      },
      {
        name: "subCategoryCode",
        labelKey: "restaurant.subCategory",
        type: "select",
        dependsOn: "categoryCode",
        optionsFor: (category) =>
          subCategories
            .filter((s) => s.categoryCode === category)
            .map((s) => ({ value: s.code, label: s.subCategoryName })),
      },
      {
        name: "kitchenCode",
        labelKey: "restaurant.kitchen",
        type: "select",
        options: kitchens.map((k) => ({ value: k.code, label: k.kitchenName })),
      },
      {
        name: "unitCode",
        labelKey: "item.unit",
        type: "select",
        options: units.map((u) => ({
          value: u.code,
          label: u.abbreviation ? `${u.unitName} (${u.abbreviation})` : u.unitName,
        })),
      },
      { name: "barcode", labelKey: "item.barcode", type: "text" },
      { name: "description", labelKey: "common.description", type: "textarea" },
      { name: "sellingPrice", labelKey: "item.sellingPrice", type: "money" },
      { name: "takeAwayPrice", labelKey: "restaurant.takeAwayPrice", type: "money" },
      { name: "taxCode", labelKey: "item.taxCode", type: "text" },
      { name: "taxPercent", labelKey: "item.taxRate", type: "number" },
      { name: "preparationMinutes", labelKey: "restaurant.preparationMinutes", type: "number" },
      { name: "isRecipeItem", labelKey: "restaurant.isRecipeItem", type: "checkbox" },
      { name: "isVegetarian", labelKey: "restaurant.isVegetarian", type: "checkbox" },
      { name: "isSpicy", labelKey: "restaurant.isSpicy", type: "checkbox" },
      { name: "showInOnlineOrder", labelKey: "restaurant.showInOnlineOrder", type: "checkbox" },
      { name: "active", labelKey: "common.active", type: "checkbox" },
    ],
    [sites, categories, subCategories, kitchens, units],
  );

  return (
    <CrudDataGridPage<MenuMaster, MenuItemFormValues>
      queryKey="menu-item-master"
      titleKey="restaurant.menuItems"
      service={menuMasterService}
      schema={menuItemSchema}
      fields={fields}
      permission={PERMISSIONS.RESTAURANT_MANAGE_TABLES}
      defaultValues={{
        code: "",
        menuName: "",
        menuNameArb: "",
        categoryCode: "",
        subCategoryCode: "",
        kitchenCode: "",
        unitCode: "",
        barcode: "",
        description: "",
        sellingPrice: 0,
        takeAwayPrice: undefined,
        taxCode: "",
        taxPercent: 0,
        preparationMinutes: undefined,
        isRecipeItem: false,
        isVegetarian: false,
        isSpicy: false,
        showInOnlineOrder: true,
        siteId: "",
        active: true,
      }}
      toFormValues={(entity) => ({
        code: entity.code,
        menuName: entity.menuName,
        menuNameArb: entity.menuNameArb ?? "",
        categoryCode: entity.categoryCode,
        subCategoryCode: entity.subCategoryCode ?? "",
        kitchenCode: entity.kitchenCode ?? "",
        unitCode: entity.unitCode ?? "",
        barcode: entity.barcode ?? "",
        description: entity.description ?? "",
        sellingPrice: entity.sellingPrice,
        takeAwayPrice: entity.takeAwayPrice ?? undefined,
        taxCode: entity.taxCode ?? "",
        taxPercent: entity.taxPercent ?? 0,
        preparationMinutes: entity.preparationMinutes ?? undefined,
        isRecipeItem: entity.isRecipeItem,
        isVegetarian: entity.isVegetarian,
        isSpicy: entity.isSpicy,
        showInOnlineOrder: entity.showInOnlineOrder,
        siteId: entity.siteID,
        active: entity.active,
      })}
      onSaved={(entity) => {
        if (stagedFile) {
          uploadImageMutation.mutate({ code: entity.code, file: stagedFile });
          setStagedFile(null);
        }
      }}
      headerActions={
        <BulkMenuImageGenerator items={menuItems} categoryName={categoryName} subCategoryName={subCategoryName} />
      }
      renderExtra={({ form, editingEntity }) => (
        <MenuItemImageField
          editingEntity={editingEntity}
          form={form}
          categoryName={categoryName}
          subCategoryName={subCategoryName}
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
      )}
      columns={[
        {
          dataField: "imagePath",
          captionKey: "restaurant.bulkImagesPhoto",
          width: 80,
          cellRender: ({ data }) => {
            const src = resolveImageUrl(data.imagePath as string | null | undefined);
            return (
              <div className="flex h-full items-center">
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded bg-muted">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element -- backend-served upload
                    <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            );
          },
        },
        { dataField: "code", captionKey: "item.sku", width: 120 },
        { dataField: "menuName", captionKey: "common.name" },
        { dataField: "categoryCode", captionKey: "item.category", width: 140 },
        { dataField: "subCategoryCode", captionKey: "restaurant.subCategory", width: 140 },
        { dataField: "sellingPrice", captionKey: "item.sellingPrice", dataType: "number", width: 120 },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
