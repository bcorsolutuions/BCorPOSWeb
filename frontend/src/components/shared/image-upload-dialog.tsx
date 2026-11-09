"use client";

import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImagePickerField } from "@/components/shared/image-picker-field";

/**
 * Reusable photo manager — used by Item Master's grid thumbnail and the
 * restaurant Menu Item tiles alike. Thin Dialog wrapper around
 * ImagePickerField, which owns the actual picker/preview/AI-generate UI
 * (also embedded directly in the Item Master Add/Edit form).
 */
export function ImageUploadDialog({
  open,
  onOpenChange,
  title,
  imageUrl,
  uploading,
  onUpload,
  onGenerate,
  onRemove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  imageUrl?: string | null;
  uploading?: boolean;
  onUpload: (file: File) => void;
  onGenerate?: () => Promise<File>;
  onRemove?: () => void;
}) {
  const t = useTranslations("common");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title ?? t("photo")}</DialogTitle>
        </DialogHeader>

        <ImagePickerField
          imageUrl={imageUrl}
          uploading={uploading}
          onUpload={onUpload}
          onGenerate={onGenerate}
          onRemove={onRemove}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
