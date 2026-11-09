"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { posOperationsService } from "@/lib/api/services/pos-operations-service";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { useAuthStore } from "@/stores/auth-store";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Runs once per physical till (persisted in pos-session-store, independent
 * of login) and again whenever the cashier needs to open a fresh shift.
 * Confirms the chosen Site/Terminal/Shift combination isn't already
 * day-closed for today BEFORE letting the cashier start billing — the
 * authoritative gate is still usp_ValidatePos on save, but catching it
 * here means the cashier never rings up a cart just to have it rejected.
 */
/** ShiftMaster.Code is a string business key with no enforced link to PosHdr.ShiftNo (int) — see usp_ValidatePos.sql's own note on this. Best-effort: use the code if it's numeric, else its position in the list. */
function shiftNumberFor(code: string, index: number): number {
  const parsed = Number(code);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : index + 1;
}

export function PosSetupDialog({ open, onConfigured }: { open: boolean; onConfigured: () => void }) {
  const t = useTranslations("pos");
  const tc = useTranslations("common");
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const configure = usePosSessionStore((s) => s.configure);
  // This PC's terminal name, remembered from the first setup — not asked again unless "Change" is pressed.
  const rememberedTerminal = usePosSessionStore((s) => s.terminalId);

  const [siteId, setSiteId] = useState("");
  const [terminalId, setTerminalId] = useState(rememberedTerminal ?? "");
  const [changingTerminal, setChangingTerminal] = useState(false);
  const [shiftNo, setShiftNo] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [autoFailed, setAutoFailed] = useState(false);
  const autoStarted = useRef(false);

  const { data: sites = [], isFetched: sitesFetched } = useQuery({
    queryKey: ["pos-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: open && !!compId,
  });

  const { data: shifts = [], isFetched: shiftsFetched } = useQuery({
    queryKey: ["pos-shifts", compId],
    queryFn: () => posLookupService.getShifts(compId),
    enabled: open && !!compId,
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const shiftNumber = Number(shiftNo);
      const status = await posOperationsService.getShiftStatus(compId, siteId, terminalId, shiftNumber);
      if (!status.isShiftOpen) {
        throw new Error(t("shiftAlreadyClosed"));
      }
      return shiftNumber;
    },
    onSuccess: (shiftNumber) => {
      configure(siteId, terminalId, shiftNumber);
      onConfigured();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : tc("errorGeneric"));
      // The automatic start failed (e.g. today's shift is already closed): show the dialog with the reason.
      setAutoFailed(true);
    },
  });

  // A shift belongs to one branch; show only the chosen branch's active shifts.
  const siteShifts = shifts.filter((s) => s.active && (!siteId || !s.siteID || s.siteID === siteId));
  const canConfirm = !!siteId && !!terminalId.trim() && !!shiftNo;

  // Nothing to choose between -> pick it: a single branch, and a single shift for the chosen branch.
  const onlySiteId = sites.length === 1 ? sites[0]!.siteID : null;
  const onlyShiftValue = siteShifts.length === 1 ? String(shiftNumberFor(siteShifts[0]!.code, 0)) : null;
  useEffect(() => {
    if (open && onlySiteId && !siteId) setSiteId(onlySiteId);
  }, [open, onlySiteId, siteId]);
  useEffect(() => {
    if (open && onlyShiftValue && !shiftNo) setShiftNo(onlyShiftValue);
  }, [open, onlyShiftValue, shiftNo]);
  // The remembered terminal may arrive after the first render (store rehydration).
  useEffect(() => {
    if (open && rememberedTerminal && !terminalId) setTerminalId(rememberedTerminal);
  }, [open, rememberedTerminal, terminalId]);

  // One branch, one shift and a terminal this PC already knows: nothing is left to ask, so start the till without showing
  // the dialog at all. If that fails (shift already closed...) the dialog opens with the reason.
  const singleBranch = sites.length === 1;
  const singleShift = siteShifts.length === 1;
  const choicesLoaded = sitesFetched && shiftsFetched;
  const autoStart = open && choicesLoaded && singleBranch && singleShift && !!rememberedTerminal && !changingTerminal;
  const autoRunning = autoStart && !autoFailed;
  useEffect(() => {
    if (!open) {
      autoStarted.current = false;
      setAutoFailed(false);
      return;
    }
    if (autoStart && canConfirm && !autoStarted.current) {
      autoStarted.current = true;
      confirmMutation.mutate();
    }
  }, [open, autoStart, canConfirm, confirmMutation]);

  return (
    <Dialog open={open && !autoRunning}>
      <DialogContent className="max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t("setupTitle")}</DialogTitle>
          <DialogDescription>{t("setupDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* A single branch is not a choice: it is used as is and only named. */}
          {singleBranch ? (
            <div className="space-y-1">
              <Label>{t("setupSite")}</Label>
              <p className="rounded-md border bg-muted/40 px-3 py-1.5 text-sm">{sites[0]!.siteName}</p>
            </div>
          ) : (
            <div className="space-y-1">
              <Label>{t("setupSite")}</Label>
              <Select
                value={siteId}
                onValueChange={(v) => {
                  setSiteId(v);
                  setShiftNo("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("setupSite")} />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.siteID} value={s.siteID}>
                      {s.siteName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label>{t("setupTerminal")}</Label>
            {rememberedTerminal && terminalId === rememberedTerminal && !changingTerminal ? (
              <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-1.5">
                <span className="font-mono text-sm">{terminalId}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setChangingTerminal(true)}>
                  {t("setupChangeTerminal")}
                </Button>
              </div>
            ) : (
              <Input value={terminalId} onChange={(e) => setTerminalId(e.target.value)} placeholder="TERM-01" />
            )}
          </div>

          {/* Same for a single shift. */}
          {singleShift ? (
            <div className="space-y-1">
              <Label>{t("setupShift")}</Label>
              <p className="rounded-md border bg-muted/40 px-3 py-1.5 text-sm">{siteShifts[0]!.shiftName}</p>
            </div>
          ) : (
            <div className="space-y-1">
              <Label>{t("setupShift")}</Label>
              <Select value={shiftNo} onValueChange={setShiftNo}>
                <SelectTrigger>
                  <SelectValue placeholder={t("setupShift")} />
                </SelectTrigger>
                <SelectContent>
                  {siteShifts.map((s, idx) => (
                    <SelectItem key={s.code} value={String(shiftNumberFor(s.code, idx))}>
                      {s.shiftName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!!siteId && siteShifts.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("noShiftsForBranch")}</p>
          )}

          {error && (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            className="w-full"
            disabled={!canConfirm || confirmMutation.isPending}
            onClick={() => {
              setError(null);
              confirmMutation.mutate();
            }}
          >
            {t("setupConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
