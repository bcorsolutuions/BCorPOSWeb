"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { posAuthorizationService } from "@/lib/api/services/pos-authorization-service";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/shared/money-input";

/**
 * Backs the "Price change with permission" requirement: a cashier can
 * always open this, but committing the new price needs a POSSupervisor/
 * Admin's own credentials, checked live against PosAuthorizationController
 * (not just a client-side role flag — see that controller's own doc
 * comment). The approving username is stamped onto the line
 * (PosDet.PriceOverrideBy) for audit.
 */
export function PriceOverrideDialog({
  open,
  onOpenChange,
  currentPrice,
  onApproved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPrice: number;
  onApproved: (newPrice: number, approvedBy: string) => void;
}) {
  const t = useTranslations("pos");
  const tc = useTranslations("common");
  const [newPrice, setNewPrice] = useState(String(currentPrice));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const verifyMutation = useMutation({
    mutationFn: () => posAuthorizationService.verifySupervisor(username, password),
    onSuccess: (result) => {
      if (!result.authorized) {
        setError(result.reason ?? t("unauthorized"));
        return;
      }
      onApproved(Number(newPrice) || 0, result.userName ?? username);
      setUsername("");
      setPassword("");
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-warning" />
            {t("priceOverride")}
          </DialogTitle>
          <DialogDescription>{t("priceOverrideHint")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>{t("price")}</Label>
            <MoneyInput value={newPrice} onChange={(e) => setNewPrice(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1">
            <Label>{t("supervisorUsername")}</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
          </div>
          <div className="space-y-1">
            <Label>{t("supervisorPassword")}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && verifyMutation.mutate()}
            />
          </div>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button
            disabled={!username || !password || verifyMutation.isPending}
            onClick={() => {
              setError(null);
              verifyMutation.mutate();
            }}
          >
            {verifyMutation.isPending ? t("authorizing") : t("authorize")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
