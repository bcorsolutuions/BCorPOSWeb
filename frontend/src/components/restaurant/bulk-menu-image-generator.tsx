"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { imageGenerationService } from "@/lib/api/services/image-generation-service";
import { imageUploadService } from "@/lib/api/services/image-upload-service";
import { useAuthStore } from "@/stores/auth-store";
import { base64ToFile, resolveImageUrl, shrinkImage } from "@/lib/utils";
import type { MenuItemDto } from "@/types/restaurant";

const CONCURRENCY = 2;

export function menuItemImagePrompt(item: MenuItemDto, categoryName?: string, subCategoryName?: string) {
  const context = [subCategoryName, categoryName].filter(Boolean).join(", ");
  const detail = item.description ? ` (${item.description})` : "";
  return (
    `Professional menu photo of "${item.menuName}"${detail}${context ? `, from the "${context}" section of a restaurant and bar menu` : ""}. ` +
    "Appetizing, studio lighting, centered on a plain neutral background, no text, no logos, no people."
  );
}

interface Failure {
  code: string;
  name: string;
  message: string;
}

/**
 * "Generate missing photos" for the Menu Items master: walks every item that has no photo, generates one with the
 * existing image-generation endpoint, shrinks it and saves it through the existing menu-item image upload. Runs from
 * the browser (two at a time) so it can show progress, be stopped, and retry just the failures.
 */
export function BulkMenuImageGenerator({
  items,
  categoryName,
  subCategoryName,
}: {
  items: MenuItemDto[];
  categoryName: (code: string) => string | undefined;
  subCategoryName: (code: string) => string | undefined;
}) {
  const t = useTranslations("restaurant");
  const tc = useTranslations("common");
  const queryClient = useQueryClient();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(0);
  const [failures, setFailures] = useState<Failure[]>([]);
  const stopRef = useRef(false);

  const missing = items.filter((i) => !resolveImageUrl(i.imagePath));

  async function run(queue: MenuItemDto[]) {
    stopRef.current = false;
    setRunning(true);
    setTotal(queue.length);
    setDone(0);
    setFailures([]);
    const pending = [...queue];

    async function worker() {
      while (!stopRef.current) {
        const item = pending.shift();
        if (!item) return;
        try {
          const { imageBase64, contentType } = await imageGenerationService.generateImage(
            menuItemImagePrompt(item, categoryName(item.categoryCode), subCategoryName(item.subCategoryCode ?? "")),
          );
          const file = await shrinkImage(base64ToFile(imageBase64, contentType, "generated.png"));
          await imageUploadService.uploadMenuItemImage(compId, item.code, file);
          setDone((d) => d + 1);
        } catch (err) {
          const data = (err as { response?: { data?: unknown } })?.response?.data;
          const message = typeof data === "string" && data ? data : (err as Error)?.message || tc("errorGeneric");
          setFailures((f) => [...f, { code: item.code, name: item.menuName, message }]);
        }
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    setRunning(false);
    queryClient.invalidateQueries({ queryKey: ["menu-item-master"] });
    queryClient.invalidateQueries({ queryKey: ["menu-items"] });
  }

  function retryFailed() {
    const codes = new Set(failures.map((f) => f.code));
    run(items.filter((i) => codes.has(i.code)));
  }

  const processed = done + failures.length;
  const finished = !running && total > 0 && processed >= total;

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} disabled={missing.length === 0 && total === 0}>
        <ImagePlus className="me-1 h-4 w-4" />
        {t("bulkImagesButton", { count: missing.length })}
      </Button>

      <Dialog open={open} onOpenChange={(o) => !running && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("bulkImagesTitle")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {total === 0 && <p className="text-sm text-muted-foreground">{t("bulkImagesIntro", { count: missing.length })}</p>}

            {total > 0 && (
              <>
                <Progress value={total ? (processed / total) * 100 : 0} />
                <div className="flex justify-between text-sm">
                  <span>{t("bulkImagesProgress", { done, total })}</span>
                  {failures.length > 0 && (
                    <span className="text-destructive">{t("bulkImagesFailedCount", { count: failures.length })}</span>
                  )}
                </div>
                {finished && failures.length === 0 && <p className="text-sm text-primary">{t("bulkImagesFinished")}</p>}
              </>
            )}

            {failures.length > 0 && (
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2 text-xs">
                {failures.map((f) => (
                  <li key={f.code}>
                    <span className="font-medium">{f.name}</span>
                    <span className="text-muted-foreground"> — {f.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter>
            {running ? (
              <Button variant="outline" onClick={() => (stopRef.current = true)}>
                <Loader2 className="me-1 h-4 w-4 animate-spin" />
                {t("bulkImagesStop")}
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  {tc("close")}
                </Button>
                {failures.length > 0 && (
                  <Button variant="outline" onClick={retryFailed}>
                    {t("bulkImagesRetry")}
                  </Button>
                )}
                {missing.length > 0 && (
                  <Button onClick={() => run(missing)}>{t("bulkImagesStart")}</Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
