"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseFormReturn } from "react-hook-form";
import { ImageOff } from "lucide-react";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { ImageUploadDialog } from "@/components/shared/image-upload-dialog";
import { ImagePickerField } from "@/components/shared/image-picker-field";
import { serviceMasterService, type Service } from "@/lib/api/services/service-master-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { imageUploadService } from "@/lib/api/services/image-upload-service";
import { imageGenerationService } from "@/lib/api/services/image-generation-service";
import { serviceSchema, type ServiceFormValues } from "@/schemas/salon-master.schema";
import { useAuthStore } from "@/stores/auth-store";
import { useToast } from "@/components/ui/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { base64ToFile, resolveImageUrl } from "@/lib/utils";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";

const SERVICE_MASTER_QUERY_KEY = "service-master";

async function generateServiceImage(name: string): Promise<File> {
  const { imageBase64, contentType } = await imageGenerationService.generateImage(
    `professional photo for a salon/spa service menu, "${name || "a salon service"}", clean background, soft studio lighting`,
  );
  return base64ToFile(imageBase64, contentType, "generated.png");
}

// Same staged-upload pattern as masters/items/page.tsx's ItemImageField — a
// brand-new service has no `code` yet for the image endpoints to address, so
// the picked/generated file is staged here and only actually uploaded by the
// page's onSaved handler once the service record exists.
function ServiceImageField({
  editingEntity,
  form,
  stagedFile,
  onStagedFileChange,
  uploading,
  onUpload,
}: {
  editingEntity: Service | null;
  form: UseFormReturn<ServiceFormValues>;
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
      onGenerate={() => generateServiceImage(form.getValues("serviceName"))}
    />
  );
}

export default function ServiceMasterPage() {
  const t = useTranslations("common");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const [imageDialogService, setImageDialogService] = useState<Service | null>(null);
  const [stagedFile, setStagedFile] = useState<File | null>(null);

  const { data: sites = [] } = useQuery({
    queryKey: ["service-master-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  const uploadImageMutation = useMutation({
    mutationFn: ({ code, file }: { code: string; file: File }) =>
      imageUploadService.uploadServiceImage(compId, code, file),
    onSuccess: () => {
      toast({ title: t("photoUpdated") });
      queryClient.invalidateQueries({ queryKey: [SERVICE_MASTER_QUERY_KEY] });
    },
    onError: (err) => toast({ title: apiErrorMessage(err, t("errorGeneric")), variant: "destructive" }),
  });

  const removeImageMutation = useMutation({
    mutationFn: (code: string) => imageUploadService.deleteServiceImage(compId, code),
    onSuccess: () => {
      toast({ title: t("photoRemoved") });
      queryClient.invalidateQueries({ queryKey: [SERVICE_MASTER_QUERY_KEY] });
    },
    onError: (err) => toast({ title: apiErrorMessage(err, t("errorGeneric")), variant: "destructive" }),
  });

  const fields: FieldConfig<ServiceFormValues>[] = useMemo(
    () => [
      { name: "code", labelKey: "common.code", type: "text" },
      { name: "serviceName", labelKey: "common.name", type: "text" },
      { name: "serviceNameArb", labelKey: "common.nameAr", type: "text" },
      {
        name: "siteId",
        labelKey: "common.branch",
        type: "select",
        options: sites.map((s) => ({ value: s.siteID, label: s.siteName })),
      },
      // Free-text category — e.g. Hair, Facial, Nail, Massage, Makeup, Spa;
      // POS builds its category tabs dynamically from whatever's used here,
      // same as it already does for Item categories.
      { name: "categoryCode", labelKey: "salon.category", type: "text" },
      { name: "rate", labelKey: "salon.rate", type: "money" },
      { name: "durationMinutes", labelKey: "salon.durationMinutes", type: "number" },
      { name: "displayOrder", labelKey: "common.displayOrder", type: "number" },
      { name: "remarks", labelKey: "common.remarks", type: "text" },
      { name: "active", labelKey: "common.active", type: "checkbox" },
    ],
    [sites],
  );

  return (
    <>
    <CrudDataGridPage<Service, ServiceFormValues>
      queryKey={SERVICE_MASTER_QUERY_KEY}
      titleKey="salon.serviceMaster"
      service={serviceMasterService}
      schema={serviceSchema}
      fields={fields}
      permission={PERMISSIONS.SALON_MANAGE}
      defaultValues={{
        code: "",
        siteId: "",
        serviceName: "",
        serviceNameArb: "",
        categoryCode: "",
        rate: 0,
        durationMinutes: undefined,
        displayOrder: 0,
        remarks: "",
        active: true,
      }}
      toFormValues={(entity) => ({
        code: entity.code,
        siteId: entity.siteID,
        serviceName: entity.serviceName,
        serviceNameArb: entity.serviceNameArb ?? "",
        categoryCode: entity.categoryCode ?? "",
        rate: entity.rate,
        durationMinutes: entity.durationMinutes ?? undefined,
        displayOrder: entity.displayOrder,
        remarks: entity.remarks ?? "",
        active: entity.active,
      })}
      onSaved={(entity) => {
        if (stagedFile) {
          uploadImageMutation.mutate({ code: entity.code, file: stagedFile });
          setStagedFile(null);
        }
      }}
      renderExtra={({ form, editingEntity }) => (
        <ServiceImageField
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
      )}
      columns={[
        {
          dataField: "imagePath",
          captionKey: "common.photo",
          width: 70,
          cellRender: (data) => {
            const service = data.data as unknown as Service;
            const url = resolveImageUrl(service.imagePath);
            return (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setImageDialogService(service);
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
        { dataField: "code", captionKey: "common.code", width: 100 },
        { dataField: "serviceName", captionKey: "common.name" },
        { dataField: "categoryCode", captionKey: "salon.category", width: 140 },
        { dataField: "rate", captionKey: "salon.rate", dataType: "number", width: 120 },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />

    <ImageUploadDialog
      open={!!imageDialogService}
      onOpenChange={(open) => !open && setImageDialogService(null)}
      imageUrl={imageDialogService?.imagePath}
      uploading={uploadImageMutation.isPending || removeImageMutation.isPending}
      onUpload={(file) => imageDialogService && uploadImageMutation.mutate({ code: imageDialogService.code, file })}
      onGenerate={() => generateServiceImage(imageDialogService?.serviceName ?? "")}
      onRemove={() => imageDialogService && removeImageMutation.mutate(imageDialogService.code)}
    />
    </>
  );
}
