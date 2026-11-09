"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImageOff, Loader2, Sparkles, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { resolveImageUrl } from "@/lib/utils";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Preview box + Upload/Generate-with-AI/Remove controls, extracted from
 * ImageUploadDialog so it can be reused both inside that dialog (grid
 * thumbnail entry point) and embedded directly in the Add/Edit form.
 * `onGenerate` (if provided) is awaited here so a manually-picked file and
 * an AI-generated one both converge on the same preview+onUpload path —
 * callers don't need to special-case either source.
 */
export function ImagePickerField({
  imageUrl,
  uploading,
  onUpload,
  onGenerate,
  onRemove,
}: {
  imageUrl?: string | null;
  uploading?: boolean;
  onUpload: (file: File) => void;
  onGenerate?: () => Promise<File>;
  onRemove?: () => void;
}) {
  const t = useTranslations("common");
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const resolvedUrl = previewUrl ?? resolveImageUrl(imageUrl);
  const busy = !!uploading || generating;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ title: t("invalidImageType"), variant: "destructive" });
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast({ title: t("imageTooLarge"), variant: "destructive" });
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    onUpload(file);
  }

  async function handleGenerateClick() {
    if (!onGenerate) return;
    setGenerating(true);
    try {
      const file = await onGenerate();
      setPreviewUrl(URL.createObjectURL(file));
      onUpload(file);
    } catch {
      toast({ title: t("errorGeneric"), variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-md border bg-muted">
        {resolvedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- backend-served upload, not a build-time asset
          <img src={resolvedUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageOff className="h-8 w-8 text-muted-foreground" />
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex w-full flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="me-1 h-4 w-4" />
          {t("uploadPhoto")}
        </Button>
        {onGenerate && (
          <Button type="button" variant="outline" className="flex-1" disabled={busy} onClick={handleGenerateClick}>
            {generating ? <Loader2 className="me-1 h-4 w-4 animate-spin" /> : <Sparkles className="me-1 h-4 w-4" />}
            {t("generateWithAi")}
          </Button>
        )}
        {onRemove && resolvedUrl && (
          <Button type="button" variant="outline" disabled={busy} onClick={onRemove}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
}
