"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { posCustomerService } from "@/lib/api/services/pos-customer-service";
import { apiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { cn } from "@/lib/utils";

const MIN_PHONE_MATCH_LENGTH = 5;

/**
 * "Customer for this order" — asked when a salon order is saved to be paid later and no customer is on the bill yet.
 * Pick an existing customer (search by name or phone) or enter a name + phone for a new one. A phone number that already
 * belongs to a customer resolves to that customer instead of creating a duplicate.
 */
export function SalonCustomerDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (customerCode: string, customerName: string) => void;
}) {
  const t = useTranslations("pos");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");

  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const { data: customers = [] } = useQuery({
    queryKey: ["pos-customers", compId],
    queryFn: () => posLookupService.getCustomers(compId),
    enabled: open && !!compId,
  });

  useEffect(() => {
    if (open) {
      setMode("existing");
      setSearch("");
      setName("");
      setPhone("");
    }
  }, [open]);

  const usable = useMemo(() => customers.filter((c) => c.active && !c.blocked), [customers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pool = q
      ? usable.filter((c) => c.custName.toLowerCase().includes(q) || (c.mobile1 ?? "").toLowerCase().includes(q))
      : usable;
    return pool.slice(0, 50);
  }, [usable, search]);

  // A typed phone that already belongs to a customer resolves to them.
  const phoneMatch = useMemo(() => {
    const p = phone.trim();
    if (p.length < MIN_PHONE_MATCH_LENGTH) return null;
    return usable.find((c) => (c.mobile1 ?? "").trim() === p) ?? null;
  }, [usable, phone]);

  const createMutation = useMutation({
    mutationFn: () => posCustomerService.quickCreate(compId, siteId, name.trim(), phone.trim()),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["pos-customers", compId] });
      onConfirm(result.customerCode, result.customerName);
      onOpenChange(false);
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  function confirmNew() {
    if (phoneMatch) {
      onConfirm(phoneMatch.code, phoneMatch.custName);
      onOpenChange(false);
      return;
    }
    createMutation.mutate();
  }

  const canConfirmNew = phone.trim().length > 0 && (!!phoneMatch || name.trim().length > 0);

  const segment = (value: "existing" | "new", label: string) => (
    <Button type="button" size="sm" variant={mode === value ? "default" : "ghost"} onClick={() => setMode(value)}>
      {label}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("salonCustomerTitle")}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
          {segment("existing", t("salonExisting"))}
          {segment("new", t("salonNew"))}
        </div>

        {mode === "existing" ? (
          <div className="space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("salonSearchCustomer")}
                className="ps-9"
              />
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    onConfirm(c.code, c.custName);
                    onOpenChange(false);
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-start text-sm hover:border-primary hover:bg-accent"
                >
                  <span className="min-w-0 truncate font-medium">{c.custName}</span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{c.mobile1 ?? ""}</span>
                </button>
              ))}
              {filtered.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">{t("salonNoCustomers")}</p>}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t("salonCustomerPhone")}</Label>
              <Input
                autoFocus
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+973 3xxx xxxx"
              />
            </div>
            <div className="space-y-1">
              <Label>{t("salonCustomerName")}</Label>
              {phoneMatch ? (
                <p className={cn("rounded-md border border-primary bg-primary/10 px-3 py-2 text-sm")}>
                  {t("salonExistingFound", { name: phoneMatch.custName })}
                </p>
              ) : (
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          {mode === "new" && (
            <Button type="button" disabled={!canConfirmNew || createMutation.isPending} onClick={confirmNew}>
              {t("salonConfirmCustomer")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
