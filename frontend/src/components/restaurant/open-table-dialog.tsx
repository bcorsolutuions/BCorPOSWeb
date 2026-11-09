"use client";

import { newUuid } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus } from "lucide-react";
import { restaurantLookupService } from "@/lib/api/services/restaurant-lookup-service";
import { restaurantOperationsService } from "@/lib/api/services/restaurant-operations-service";
import { kotService } from "@/lib/api/services/kot-service";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { useRouter } from "@/i18n/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RestaurantTableDto } from "@/types/restaurant";
import { apiErrorMessage } from "@/lib/api-error";

const DEFAULT_GUESTS = 2;

export function OpenTableDialog({
  table,
  onOpenChange,
  onSuccess,
  redirectBasePath = "/pos/tables",
  defaultWaiterCode,
  defaultCaptainCode,
  orderSource,
  recovery = false,
  compact = false,
}: {
  table: RestaurantTableDto | null;
  onOpenChange: (open: boolean) => void;
  // Fires before onOpenChange(false) on a successful open, so callers can
  // tell that apart from a Cancel/Escape dismissal (which also closes the
  // dialog via onOpenChange(false), but with nothing created).
  onSuccess?: () => void;
  /** Waiter Mobile Ordering reuses this dialog verbatim but lands on /mobile/tables/{code} instead of the desktop screen. */
  redirectBasePath?: string;
  /** Waiter Mobile Ordering — pre-selects the logged-in waiter instead of making them pick themselves from the list. */
  defaultWaiterCode?: string | null;
  /** Waiter Mobile Ordering — the waiter's own captain, pre-selected too. */
  defaultCaptainCode?: string | null;
  /** Waiter Mobile Ordering — tags the KOT's OrderSource as "WAITER_MOBILE" instead of the default "POS". */
  orderSource?: string;
  /**
   * The table is already OCCUPIED but has no open order or held bill (e.g. a payment that
   * failed after the order was closed). Skips the "open table" call — it would be refused
   * as already occupied — and offers Clear Table to free it instead.
   */
  recovery?: boolean;
  /**
   * Phone layout: just a guest stepper and the Open button, with the pre-selected waiter / captain /
   * order type / dining type shown as a one-line summary behind "Change". Everything is pre-filled.
   */
  compact?: boolean;
}) {
  const t = useTranslations("restaurant");
  const tc = useTranslations("common");
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const userName = useAuthStore((s) => s.user?.userName ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");
  const terminalId = usePosSessionStore((s) => s.terminalId ?? "");
  const shiftNo = usePosSessionStore((s) => s.shiftNo ?? null);

  const [guestCount, setGuestCount] = useState(DEFAULT_GUESTS);
  const [waiterCode, setWaiterCode] = useState<string>(defaultWaiterCode ?? "");
  const [captainCode, setCaptainCode] = useState<string>(defaultCaptainCode ?? "");
  const [orderTypeCode, setOrderTypeCode] = useState<string>("");
  const [diningTypeCode, setDiningTypeCode] = useState<string>("");
  const [showDetails, setShowDetails] = useState(!compact);
  // Waiter Mobile Ordering §38 — a stable key for the whole "this dialog is
  // open" lifetime, so a double-tap of Open (or a timeout-retry) resolves to
  // the one KOT already created instead of a second one. Regenerated only
  // when a new table is opened (identity keyed off table?.code).
  const [idempotencyKey, setIdempotencyKey] = useState(() => newUuid());

  const open = !!table;

  const { data: waiters = [] } = useQuery({
    queryKey: ["restaurant-waiters", compId],
    queryFn: () => restaurantLookupService.getWaiters(compId),
    enabled: open && !!compId,
  });
  const { data: captains = [] } = useQuery({
    queryKey: ["restaurant-captains", compId],
    queryFn: () => restaurantLookupService.getCaptains(compId),
    enabled: open && !!compId,
  });
  const { data: orderTypes = [] } = useQuery({
    queryKey: ["restaurant-order-types", compId],
    queryFn: () => restaurantLookupService.getOrderTypes(compId),
    enabled: open && !!compId,
  });
  const { data: diningTypes = [] } = useQuery({
    queryKey: ["restaurant-dining-types", compId],
    queryFn: () => restaurantLookupService.getDiningTypes(compId),
    enabled: open && !!compId,
  });

  // Defaults for the table that was just picked. A fresh table always starts from the defaults (never from the last
  // table's choices), guests never exceed a small table's seats, and the waiter / captain come from the caller.
  useEffect(() => {
    if (!open) return;
    setIdempotencyKey(newUuid());
    setGuestCount(table?.capacity && table.capacity > 0 ? Math.min(DEFAULT_GUESTS, table.capacity) : DEFAULT_GUESTS);
    setWaiterCode(defaultWaiterCode ?? "");
    setCaptainCode(defaultCaptainCode ?? "");
    setOrderTypeCode("");
    setDiningTypeCode("");
    setShowDetails(!compact);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table?.code, defaultWaiterCode, defaultCaptainCode]);

  // Fill whatever is still empty from the lookups once they load: Dine In (the order type that needs a table), the dining
  // type that order type points to, and a captain when there is only one. A pick the waiter already made is never overwritten.
  const defaults = useMemo(() => {
    const byOrder = <T extends { displayOrder: number }>(a: T, b: T) => a.displayOrder - b.displayOrder;
    const orderType = [...orderTypes].filter((o) => o.active !== false).sort(byOrder).find((o) => o.requiresTable) ?? [...orderTypes].sort(byOrder)[0];
    const dining =
      (orderType?.diningTypeCode ? diningTypes.find((d) => d.code === orderType.diningTypeCode) : undefined) ??
      [...diningTypes].filter((d) => d.active !== false).sort(byOrder).find((d) => d.requiresTable) ??
      [...diningTypes].sort(byOrder)[0];
    return {
      orderTypeCode: orderType?.code ?? "",
      diningTypeCode: dining?.code ?? "",
      captainCode: captains.length === 1 ? captains[0]!.code : "",
      waiterCode: waiters.length === 1 ? waiters[0]!.code : "",
    };
  }, [orderTypes, diningTypes, captains, waiters]);

  useEffect(() => {
    if (!open) return;
    setOrderTypeCode((cur) => cur || defaults.orderTypeCode);
    setDiningTypeCode((cur) => cur || defaults.diningTypeCode);
    setCaptainCode((cur) => cur || defaults.captainCode);
    setWaiterCode((cur) => cur || defaults.waiterCode);
  }, [open, defaults, table?.code]);

  const nameOf = {
    waiter: waiters.find((w) => w.code === waiterCode)?.waiterName,
    captain: captains.find((c) => c.code === captainCode)?.captainName,
    orderType: orderTypes.find((o) => o.code === orderTypeCode)?.orderTypeName,
    diningType: diningTypes.find((d) => d.code === diningTypeCode)?.diningTypeName,
  };
  const summary = [nameOf.waiter, nameOf.captain, nameOf.orderType].filter(Boolean).join(" · ");

  const openMutation = useMutation({
    mutationFn: async () => {
      if (!table) throw new Error("No table selected");
      if (!recovery) {
        await restaurantOperationsService.openTable(compId, siteId, table.code, {
          guestCount,
          waiterCode: waiterCode || null,
          captainCode: captainCode || null,
          orderTypeCode: orderTypeCode || null,
          diningTypeCode: diningTypeCode || null,
          userName,
        });
      }
      // "Opening" a table also starts its KOT (empty for now) so the
      // order screen has somewhere to persist guest count / waiter /
      // order+dining type — RestaurantTableMaster only tracks
      // AVAILABLE/OCCUPIED, not per-visit service context.
      return kotService.create(compId, siteId, userName, {
        docDt: new Date().toISOString(),
        tableCode: table.code,
        floorCode: table.floorCode,
        sectionCode: table.sectionCode,
        orderTypeCode: orderTypeCode || null,
        diningTypeCode: diningTypeCode || null,
        waiterCode: waiterCode || null,
        captainCode: captainCode || null,
        terminalCode: terminalId || null,
        shiftNo,
        guestCount,
        orderSource,
        idempotencyKey,
        details: [],
      });
    },
    onSuccess: () => {
      toast({ title: t("tableOpened") });
      queryClient.invalidateQueries({ queryKey: ["restaurant-floor-status"] });
      queryClient.invalidateQueries({ queryKey: ["waiter-mobile-my-tables"] });
      onSuccess?.();
      onOpenChange(false);
      if (table) router.push(`${redirectBasePath}/${encodeURIComponent(table.code)}`);
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  // Frees a table that was left OCCUPIED with nothing on it. The server refuses if an open
  // order or an unsettled (held) bill is still attached, and says so.
  const clearMutation = useMutation({
    mutationFn: async () => {
      if (!table) throw new Error("No table selected");
      return restaurantOperationsService.closeTable(compId, siteId, table.code, userName);
    },
    onSuccess: () => {
      toast({ title: t("tableCleared") });
      queryClient.invalidateQueries({ queryKey: ["restaurant-floor-status"] });
      onOpenChange(false);
      router.push(redirectBasePath);
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {t("openTable")} — {table?.tableName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>{t("guestCount")}</Label>
            {compact ? (
              <div className="flex items-center justify-center gap-4 py-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-12 w-12"
                  aria-label="-"
                  onClick={() => setGuestCount((g) => Math.max(1, g - 1))}
                >
                  <Minus className="h-5 w-5" />
                </Button>
                <span className="w-12 text-center text-3xl font-semibold tabular-nums">{guestCount}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-12 w-12"
                  aria-label="+"
                  onClick={() => setGuestCount((g) => Math.min(99, g + 1))}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <Input type="number" min={1} value={guestCount} onChange={(e) => setGuestCount(Number(e.target.value) || 1)} />
            )}
            {table?.capacity ? (
              <p className="text-center text-xs text-muted-foreground">{t("tableSeats", { count: table.capacity })}</p>
            ) : null}
          </div>

          {compact && !showDetails && (
            <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="min-w-0 truncate text-muted-foreground">{summary || t("defaultsNotSet")}</span>
              <Button type="button" variant="link" size="sm" className="h-auto shrink-0 p-0" onClick={() => setShowDetails(true)}>
                {t("changeDetails")}
              </Button>
            </div>
          )}

          {showDetails && (
            <>
              <div className="space-y-1">
                <Label>{t("waiter")}</Label>
                <Select value={waiterCode} onValueChange={setWaiterCode}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("waiter")} />
                  </SelectTrigger>
                  <SelectContent>
                    {waiters.map((w) => (
                      <SelectItem key={w.code} value={w.code}>
                        {w.waiterName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>{t("captain")}</Label>
                <Select value={captainCode} onValueChange={setCaptainCode}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("captain")} />
                  </SelectTrigger>
                  <SelectContent>
                    {captains.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.captainName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>{t("orderType")}</Label>
                <Select value={orderTypeCode} onValueChange={setOrderTypeCode}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("orderType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {orderTypes.map((o) => (
                      <SelectItem key={o.code} value={o.code}>
                        {o.orderTypeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>{t("diningType")}</Label>
                <Select value={diningTypeCode} onValueChange={setDiningTypeCode}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("diningType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {diningTypes.map((d) => (
                      <SelectItem key={d.code} value={d.code}>
                        {d.diningTypeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        {recovery && <p className="text-sm text-muted-foreground">{t("clearTableHint")}</p>}

        <DialogFooter className={compact ? "gap-2 sm:space-x-0" : undefined}>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          {recovery && (
            <Button variant="secondary" disabled={clearMutation.isPending} onClick={() => clearMutation.mutate()}>
              {t("clearTable")}
            </Button>
          )}
          <Button className={compact ? "h-11 flex-1 text-base" : undefined} disabled={openMutation.isPending} onClick={() => openMutation.mutate()}>
            {t("open")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
