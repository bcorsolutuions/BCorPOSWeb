"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Printer, Receipt, Split, ArrowLeftRight, Ban } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { useCurrencyStore } from "@/stores/currency-store";
import { usePermission } from "@/hooks/use-permission";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { useToast } from "@/components/ui/use-toast";
import { orderManagementService } from "@/lib/api/services/order-management-service";
import { restaurantOperationsService } from "@/lib/api/services/restaurant-operations-service";
import { waiterMobileService } from "@/lib/api/services/waiter-mobile-service";
import { posService } from "@/lib/api/services/pos-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PaymentDialog } from "@/components/pos/payment-dialog";
import { ReceiptDialog } from "@/components/pos/receipt-dialog";
import { TransferTableDialog } from "@/components/restaurant/transfer-table-dialog";
import { SplitTableDialog } from "@/components/restaurant/split-table-dialog";
import { groupDraftLines, kotDetailToDraftLine, draftLineTotals, buildSettleBillDto } from "@/lib/restaurant/kot-mappers";
import { formatMoney, formatMoneyPlain, formatDateTime } from "@/lib/utils";
import type { PosPayment, PosDto } from "@/types/pos";

/** Restaurant Order Management §10/§11/§42 — order details, timeline, and every operational action, all wired to existing services. */
export default function OrderDetailPage() {
  const params = useParams<{ docNo: string }>();
  const docNo = Number(params.docNo);
  const t = useTranslations("orderManagement");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const currency = useCurrencyStore((s) => s.currencyCode);
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const userName = useAuthStore((s) => s.user?.userName ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");
  const terminalId = usePosSessionStore((s) => s.terminalId ?? "");
  const shiftNo = usePosSessionStore((s) => s.shiftNo);

  const detailKey = ["order-management-detail", compId, siteId, docNo];
  const { data: detail, isLoading } = useQuery({
    queryKey: detailKey,
    queryFn: () => orderManagementService.getOrderDetail(compId, siteId, docNo),
    enabled: !!compId && !!siteId && !!docNo,
    refetchInterval: 15_000,
  });
  const { data: floorStatus = [] } = useQuery({
    queryKey: ["restaurant-floor-status", compId, siteId],
    queryFn: () => restaurantOperationsService.getFloorStatus(compId, siteId),
    enabled: !!compId && !!siteId,
  });

  const [cancelItemRowId, setCancelItemRowId] = useState<string | null>(null);
  const [cancelOrderOpen, setCancelOrderOpen] = useState(false);
  const [reprintOpen, setReprintOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [receiptPos, setReceiptPos] = useState<PosDto | null>(null);

  const onError = (err: unknown) => {
    const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
    toast({ title: message || tc("errorGeneric"), variant: "destructive" });
  };

  const requestBillMutation = useMutation({
    mutationFn: () => waiterMobileService.requestBill(compId, siteId, detail!.kot.tableCode ?? "", userName),
    onSuccess: (res) => toast({ title: res.message }),
    onError,
  });
  const reprintMutation = useMutation({
    mutationFn: (reason: string) => orderManagementService.reprintKot(compId, siteId, docNo, reason || null, userName),
    onSuccess: () => {
      toast({ title: t("kotReprinted") });
      setReprintOpen(false);
      queryClient.invalidateQueries({ queryKey: detailKey });
    },
    onError,
  });
  const cancelItemMutation = useMutation({
    mutationFn: (v: { rowId: string; reason: string }) =>
      orderManagementService.cancelItem(compId, siteId, docNo, {
        rowId: v.rowId,
        reason: v.reason,
        lastModifiedOn: detail?.kot ? undefined : undefined,
        userName,
      }),
    onSuccess: () => {
      toast({ title: t("itemCancelled") });
      setCancelItemRowId(null);
      queryClient.invalidateQueries({ queryKey: detailKey });
    },
    onError,
  });
  const cancelOrderMutation = useMutation({
    mutationFn: (reason: string) => orderManagementService.cancelOrder(compId, siteId, docNo, { reason, userName }),
    onSuccess: () => {
      toast({ title: t("orderCancelled") });
      setCancelOrderOpen(false);
      router.push("/pos/orders" as never);
    },
    onError,
  });
  const settleMutation = useMutation({
    mutationFn: async (payments: PosPayment[]) => {
      if (!detail) throw new Error("No order loaded");
      const posDto = buildSettleBillDto({ kot: detail.kot, payments, terminalId, shiftNo });
      const pos = await posService.create(compId, siteId, userName, posDto);
      if (detail.kot.tableCode) await restaurantOperationsService.closeTable(compId, siteId, detail.kot.tableCode, userName);
      return pos;
    },
    onSuccess: (pos) => {
      toast({ title: t("billSettled") });
      setPaymentOpen(false);
      setReceiptPos(pos);
      queryClient.invalidateQueries({ queryKey: detailKey });
    },
    onError,
  });

  const groups = useMemo(
    () => (detail ? groupDraftLines(detail.kot.details.filter((d) => !d.cancelled).map(kotDetailToDraftLine)) : []),
    [detail],
  );
  const cancelledLines = detail?.kot.details.filter((d) => d.cancelled) ?? [];

  if (isLoading || !detail) {
    return <div className="p-4 text-sm text-muted-foreground">{t("loading")}</div>;
  }

  const { kot, status, delayed, pos, delivery, timeline } = detail;
  const settings = { requireCancelReason: true }; // client-side hint only — server is authoritative regardless.

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">
            {t("order")} #{kot.docNo}
          </h1>
          <p className="text-sm text-muted-foreground">
            {kot.tableCode ? `${t("table")} ${kot.tableCode}` : kot.tabCode ? `${t("tab")} ${kot.tabCode}` : t("counter")}
            {kot.floorCode ? ` · ${kot.floorCode}` : ""} · {t("waiter", { name: kot.waiterCode ?? "-" })} · {t("source", { source: kot.orderSource })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{t(`status_${status}` as never)}</Badge>
          {delayed && <Badge variant="destructive">{t("delayedBadge")}</Badge>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => router.push(`/pos/tables/${encodeURIComponent(kot.tableCode ?? "")}` as never)} disabled={!kot.tableCode}>
          {t("orderMore")}
        </Button>
        {can(PERMISSIONS.ORDER_MANAGEMENT_REPRINT_KOT) && (
          <Button variant="outline" onClick={() => setReprintOpen(true)}>
            <Printer className="me-2 h-4 w-4" />
            {t("reprintKot")}
          </Button>
        )}
        {kot.tableCode && (
          <Button variant="outline" onClick={() => requestBillMutation.mutate()} disabled={requestBillMutation.isPending}>
            <Receipt className="me-2 h-4 w-4" />
            {t("requestBill")}
          </Button>
        )}
        {kot.tableCode && (
          <>
            <Button variant="outline" onClick={() => setTransferOpen(true)}>
              <ArrowLeftRight className="me-2 h-4 w-4" />
              {t("transferTable")}
            </Button>
            <Button variant="outline" onClick={() => setSplitOpen(true)}>
              <Split className="me-2 h-4 w-4" />
              {t("splitTable")}
            </Button>
          </>
        )}
        {can(PERMISSIONS.ORDER_MANAGEMENT_TAKE_PAYMENT) && status !== "COMPLETED" && status !== "CANCELLED" && (
          <Button onClick={() => setPaymentOpen(true)}>{t("takePayment")}</Button>
        )}
        {can(PERMISSIONS.ORDER_MANAGEMENT_CANCEL_ORDER) && status !== "COMPLETED" && status !== "CANCELLED" && (
          <Button variant="destructive" onClick={() => setCancelOrderOpen(true)}>
            <Ban className="me-2 h-4 w-4" />
            {t("cancelOrder")}
          </Button>
        )}
      </div>

      {(pos || delivery) && (
        <div className="flex flex-wrap gap-4 text-sm">
          {pos && (
            <p>
              {t("bill")}: #{pos.docNo} — {pos.status}
            </p>
          )}
          {delivery && (
            <p>
              {t("delivery")}: #{delivery.docNo} — {delivery.status}
            </p>
          )}
        </div>
      )}

      <Card className="p-3">
        <h2 className="mb-2 text-sm font-semibold">{t("itemsHeading")}</h2>
        <div className="space-y-2">
          {groups.map((group) => {
            const priced = group.find((l) => l.comboCode || l.setMenuCode) ?? group[0];
            if (!priced) return null;
            const totals = draftLineTotals(priced);
            const kotLine = kot.details.find((d) => d.id === priced.id);
            return (
              <div key={priced.draftId} className="flex items-start justify-between gap-2 border-b pb-2">
                <div className="min-w-0">
                  <p className="font-medium">
                    {priced.qty} × {priced.menuName}
                  </p>
                  {priced.preparationNotes && <p className="text-xs italic text-muted-foreground">{priced.preparationNotes}</p>}
                  <p className="text-xs text-muted-foreground">
                    {priced.kitchenCode ?? "-"} · {kotLine?.itemStatus ?? "-"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="tabular-nums">{formatMoneyPlain(totals.netAmount, currency, locale)}</span>
                  {can(PERMISSIONS.ORDER_MANAGEMENT_CANCEL_ITEM) && kotLine?.id && (
                    <Button size="sm" variant="ghost" onClick={() => setCancelItemRowId(kotLine.id)}>
                      {tc("delete")}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {cancelledLines.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2 border-b border-dashed pb-2 text-muted-foreground line-through">
              <span>
                {d.qty} × {d.menuName ?? d.menuCode}
              </span>
              <span className="text-xs">{d.cancellationReason}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-3">
        <h2 className="mb-2 text-sm font-semibold">{t("timeline")}</h2>
        <div className="space-y-1.5 text-sm">
          {timeline.map((ev, idx) => (
            <div key={idx} className="flex justify-between gap-2 text-xs">
              <span>{formatDateTime(ev.at, locale)}</span>
              <span className="flex-1 px-2">{ev.event}</span>
              <span className="text-muted-foreground">{ev.actor ?? ""}</span>
            </div>
          ))}
          {timeline.length === 0 && <p className="text-xs text-muted-foreground">{t("noTimeline")}</p>}
        </div>
      </Card>

      {/* Cancel item dialog */}
      <CancelDialog
        open={!!cancelItemRowId}
        title={t("cancelItem")}
        onOpenChange={(open) => !open && setCancelItemRowId(null)}
        onConfirm={(reason) => cancelItemRowId && cancelItemMutation.mutate({ rowId: cancelItemRowId, reason })}
        loading={cancelItemMutation.isPending}
        requireReason={settings.requireCancelReason}
        tc={tc}
      />
      <CancelDialog
        open={cancelOrderOpen}
        title={t("cancelOrder")}
        onOpenChange={setCancelOrderOpen}
        onConfirm={(reason) => cancelOrderMutation.mutate(reason)}
        loading={cancelOrderMutation.isPending}
        requireReason={settings.requireCancelReason}
        tc={tc}
      />

      <Dialog open={reprintOpen} onOpenChange={setReprintOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("reprintKot")}</DialogTitle>
          </DialogHeader>
          <ReprintForm onConfirm={(reason) => reprintMutation.mutate(reason)} loading={reprintMutation.isPending} tc={tc} />
        </DialogContent>
      </Dialog>

      <TransferTableDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        fromTableCode={kot.tableCode ?? ""}
        entries={floorStatus}
        onConfirm={async (toTableCode) => {
          await restaurantOperationsService.transferTable(compId, siteId, kot.tableCode ?? "", toTableCode, userName);
          toast({ title: t("tableTransferred") });
          setTransferOpen(false);
          queryClient.invalidateQueries({ queryKey: detailKey });
        }}
      />
      <SplitTableDialog
        open={splitOpen}
        onOpenChange={setSplitOpen}
        fromTableCode={kot.tableCode ?? ""}
        lines={kot.details.filter((d) => !d.cancelled).map(kotDetailToDraftLine)}
        entries={floorStatus}
        onConfirm={async ({ toTableCode, guestCount, moves }) => {
          await restaurantOperationsService.splitTable(compId, siteId, kot.tableCode ?? "", {
            toTableCode, guestCount, lines: moves, userName,
          });
          toast({ title: t("tableSplit") });
          setSplitOpen(false);
          queryClient.invalidateQueries({ queryKey: detailKey });
        }}
      />

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        netTotal={kot.details.filter((d) => !d.cancelled).reduce((s, d) => s + d.netAmount, 0)}
        hasCustomer={!!kot.customerName}
        onComplete={(payments) => settleMutation.mutate(payments)}
        loading={settleMutation.isPending}
      />
      <ReceiptDialog open={!!receiptPos} onOpenChange={(open) => !open && setReceiptPos(null)} pos={receiptPos} />
    </div>
  );
}

function CancelDialog({
  open, title, onOpenChange, onConfirm, loading, requireReason, tc,
}: {
  open: boolean;
  title: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
  requireReason: boolean;
  tc: ReturnType<typeof useTranslations>;
}) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setReason(""); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          <Label>{tc("remarks")} {requireReason && "*"}</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button variant="destructive" disabled={loading || (requireReason && !reason.trim())} onClick={() => onConfirm(reason)}>
            {tc("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReprintForm({ onConfirm, loading, tc }: { onConfirm: (reason: string) => void; loading: boolean; tc: ReturnType<typeof useTranslations> }) {
  const [reason, setReason] = useState("");
  return (
    <>
      <div className="space-y-1">
        <Label>{tc("remarks")}</Label>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <DialogFooter>
        <Button disabled={loading} onClick={() => onConfirm(reason)}>
          {tc("confirm")}
        </Button>
      </DialogFooter>
    </>
  );
}
