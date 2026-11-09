"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DEFAULT_CUSTOM_THEME,
  applyCustomTheme,
  clearCustomTheme,
  contrastRatio,
  isHex,
  loadCustomTheme,
  saveCustomTheme,
  type CustomThemeSettings,
} from "@/lib/theme/custom-theme";

const FIELDS: { key: keyof CustomThemeSettings; labelKey: "primary" | "accent" | "background" | "surface" | "text" }[] = [
  { key: "primary", labelKey: "primary" },
  { key: "accent", labelKey: "accent" },
  { key: "background", labelKey: "background" },
  { key: "surface", labelKey: "surface" },
  { key: "text", labelKey: "text" },
];

/**
 * "My mode" colour editor. Changes preview live on the real screen behind the dialog (the theme is only a set of
 * CSS variables, so this is instant); Save keeps them (localStorage, this device) and switches to My mode,
 * Cancel puts back whatever was active before.
 */
export function ThemeCustomizer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("theme");
  const tc = useTranslations("common");
  const { resolvedTheme, setTheme } = useTheme();
  const [draft, setDraft] = useState<CustomThemeSettings>(DEFAULT_CUSTOM_THEME);

  // Start from the saved palette every time the dialog opens.
  useEffect(() => {
    if (open) {
      const saved = loadCustomTheme();
      setDraft(saved);
      applyCustomTheme(saved);
    }
  }, [open]);

  function update(next: CustomThemeSettings) {
    setDraft(next);
    if (Object.values(next).every(isHex)) applyCustomTheme(next);
  }

  // Put the screen back to what is really active (saved My mode colours, or the plain theme's own).
  function restoreActive() {
    if (resolvedTheme === "mine") applyCustomTheme(loadCustomTheme());
    else clearCustomTheme();
  }

  function handleOpenChange(next: boolean) {
    if (!next) restoreActive();
    onOpenChange(next);
  }

  function handleSave() {
    if (!Object.values(draft).every(isHex)) return;
    saveCustomTheme(draft);
    applyCustomTheme(draft);
    setTheme("mine");
    onOpenChange(false);
  }

  const valid = Object.values(draft).every(isHex);
  const lowContrast =
    valid &&
    (contrastRatio(draft.text, draft.background) < 4.5 || contrastRatio(draft.text, draft.surface) < 4.5);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("customizeTitle")}</DialogTitle>
          <DialogDescription>{t("customizeHint")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {FIELDS.map(({ key, labelKey }) => (
            <div key={key} className="flex items-center gap-3">
              <Label className="w-28 shrink-0 text-sm">{t(labelKey)}</Label>
              <input
                type="color"
                aria-label={t(labelKey)}
                value={isHex(draft[key]) ? draft[key] : "#000000"}
                onChange={(e) => update({ ...draft, [key]: e.target.value })}
                className="h-9 w-12 shrink-0 cursor-pointer rounded border bg-transparent p-0.5"
              />
              <Input
                value={draft[key]}
                maxLength={7}
                onChange={(e) => update({ ...draft, [key]: e.target.value })}
                className={`h-9 font-mono text-sm uppercase ${isHex(draft[key]) ? "" : "border-destructive"}`}
              />
            </div>
          ))}
        </div>

        {lowContrast && <p className="text-xs text-destructive">{t("contrastWarning")}</p>}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="ghost" onClick={() => update(DEFAULT_CUSTOM_THEME)}>
            {t("reset")}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {tc("cancel")}
            </Button>
            <Button type="button" disabled={!valid} onClick={handleSave}>
              {tc("save")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
