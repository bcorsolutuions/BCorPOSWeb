"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { loyaltyService } from "@/lib/api/services/loyalty-service";

const MIN_MOBILE_LOOKUP_LENGTH = 6;
const LOOKUP_DEBOUNCE_MS = 500;

/**
 * Shown before Payment when the site has loyalty enabled and no customer is
 * on the bill — asks for a phone number, then debounce-looks it up against
 * CustomerMaster (LoyaltyService.LookupAsync, which matches by mobile
 * regardless of enrollment status): a match shows that customer's name and
 * Local ID (CPR) read-only and enrolls them as-is; no match leaves both
 * editable (and both required) so a new customer can be registered. The
 * final Enroll call (LoyaltyService.QuickRegisterAndEnrollAsync) re-resolves
 * the phone itself server-side and enforces the same "both required for a
 * new customer" rule independently — this dialog's lookup only drives what
 * the cashier sees, never what actually gets saved (same "backend stays
 * authoritative" stance as the rest of the loyalty engine).
 */
export function QuickCustomerRegisterDialog({
  open,
  onOpenChange,
  onRegistered,
  onSkip,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistered: (customerCode: string, customerName: string) => void;
  onSkip: () => void;
}) {
  const t = useTranslations("loyalty");
  const tc = useTranslations("common");
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const userName = useAuthStore((s) => s.user?.userName ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");
  const [mobile, setMobile] = useState("");
  const [name, setName] = useState("");
  const [localId, setLocalId] = useState("");
  const [isExisting, setIsExisting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileRef = useRef(mobile);
  mobileRef.current = mobile;

  const lookupMutation = useMutation({
    mutationFn: (m: string) => loyaltyService.lookup(compId, { mobile: m }),
    onSuccess: (result, requestedMobile) => {
      // Debounced lookups for earlier, partial digits of the same number can
      // resolve after a later (correct) one — a slow/out-of-order response
      // must never clobber what the cashier has since typed.
      if (requestedMobile !== mobileRef.current.trim()) return;
      if (result.found && result.customerName) {
        setName(result.customerName);
        setLocalId(result.localId ?? "");
        setIsExisting(true);
      } else {
        setName("");
        setLocalId("");
        setIsExisting(false);
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: () =>
      loyaltyService.quickRegister(
        compId,
        siteId,
        userName,
        mobile.trim(),
        isExisting ? undefined : name.trim(),
        isExisting ? undefined : localId.trim(),
      ),
    onSuccess: (result) => {
      if (result.success && result.customerCode) {
        onRegistered(result.customerCode, result.customerName ?? name.trim());
      }
    },
  });

  useEffect(() => {
    if (open) {
      setMobile("");
      setName("");
      setLocalId("");
      setIsExisting(false);
      lookupMutation.reset();
      registerMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = mobile.trim();
    if (trimmed.length < MIN_MOBILE_LOOKUP_LENGTH) {
      setIsExisting(false);
      return;
    }
    debounceRef.current = setTimeout(() => lookupMutation.mutate(trimmed), LOOKUP_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile]);

  const canSubmit =
    mobile.trim().length > 0 && (isExisting || (name.trim().length > 0 && localId.trim().length > 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("enrollCustomer")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="quick-reg-mobile">{tc("phone")}</Label>
            <Input
              id="quick-reg-mobile"
              autoFocus
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canSubmit && registerMutation.mutate()}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="quick-reg-name">{tc("name")}</Label>
            <Input
              id="quick-reg-name"
              value={name}
              disabled={isExisting}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canSubmit && registerMutation.mutate()}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="quick-reg-local-id">{t("localId")}</Label>
            <Input
              id="quick-reg-local-id"
              value={localId}
              disabled={isExisting}
              onChange={(e) => setLocalId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canSubmit && registerMutation.mutate()}
            />
          </div>
          {registerMutation.data && !registerMutation.data.success && (
            <p className="text-sm text-destructive">{registerMutation.data.reason}</p>
          )}
          {registerMutation.isError && <p className="text-sm text-destructive">{tc("errorGeneric")}</p>}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={onSkip}>
            {tc("skip")}
          </Button>
          <Button disabled={!canSubmit || registerMutation.isPending} onClick={() => registerMutation.mutate()}>
            {t("enrollCustomer")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
