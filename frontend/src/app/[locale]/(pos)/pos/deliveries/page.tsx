"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bike, Plus } from "lucide-react";
import { deliveryOrderService } from "@/lib/api/services/delivery-order-service";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { useToast } from "@/components/ui/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DELIVERY_ORDER_STATUSES, type DeliveryOrderDto, type DeliveryOrderStatus } from "@/types/delivery-order";

const DELIVERIES_QUERY_KEY = "delivery-orders-active";

const NEXT_STATUS: Partial<Record<DeliveryOrderStatus, DeliveryOrderStatus>> = {
  Pending: "Assigned",
  Assigned: "Preparing",
  Preparing: "Ready",
  Ready: "OutForDelivery",
  OutForDelivery: "Delivered",
};

export default function DeliveriesPage() {
  const t = useTranslations("common");
  const td = useTranslations("delivery");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const userName = useAuthStore((s) => s.user?.userName ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ posRefNo: "", customerName: "", customerPhone: "", address: "" });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: [DELIVERIES_QUERY_KEY, compId, siteId],
    queryFn: () => deliveryOrderService.getActive(compId, siteId),
    enabled: !!compId && !!siteId,
    refetchInterval: 15_000,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      deliveryOrderService.create(compId, siteId, userName, {
        docDt: new Date().toISOString(),
        posRefNo: form.posRefNo,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        address: form.address || null,
      }),
    onSuccess: () => {
      toast({ title: td("created") });
      queryClient.invalidateQueries({ queryKey: [DELIVERIES_QUERY_KEY] });
      setCreateOpen(false);
      setForm({ posRefNo: "", customerName: "", customerPhone: "", address: "" });
    },
    onError: (err) => toast({ title: apiErrorMessage(err, t("errorGeneric")), variant: "destructive" }),
  });

  const advanceMutation = useMutation({
    mutationFn: ({ docNo, status }: { docNo: number; status: DeliveryOrderStatus }) =>
      deliveryOrderService.updateStatus(compId, siteId, docNo, userName, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DELIVERIES_QUERY_KEY] }),
    onError: (err) => toast({ title: apiErrorMessage(err, t("errorGeneric")), variant: "destructive" }),
  });

  const columns: DeliveryOrderStatus[] = ["Pending", "Assigned", "Preparing", "Ready", "OutForDelivery"];

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <Bike className="h-5 w-5" />
          {td("title")}
        </h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="me-1 h-4 w-4" />
          {td("newDelivery")}
        </Button>
      </div>

      <div className="flex flex-1 gap-4 overflow-x-auto">
        {columns.map((status) => (
          <div key={status} className="flex h-full min-w-[260px] flex-1 flex-col gap-3">
            <h2 className="flex items-center justify-between text-sm font-semibold text-muted-foreground">
              {td(`status.${status}`)}
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                {orders.filter((o) => o.status === status).length}
              </span>
            </h2>
            <div className="flex-1 space-y-3 overflow-y-auto">
              {!isLoading &&
                orders
                  .filter((o) => o.status === status)
                  .map((order) => (
                    <DeliveryCard
                      key={order.id}
                      order={order}
                      onAdvance={() => {
                        const next = NEXT_STATUS[order.status];
                        if (next) advanceMutation.mutate({ docNo: order.docNo, status: next });
                      }}
                      onCancel={() => advanceMutation.mutate({ docNo: order.docNo, status: "Cancelled" })}
                    />
                  ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{td("newDelivery")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{td("posRefNo")}</Label>
              <Input value={form.posRefNo} onChange={(e) => setForm((f) => ({ ...f, posRefNo: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{t("name")}</Label>
              <Input value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{td("phone")}</Label>
              <Input value={form.customerPhone} onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{td("address")}</Label>
              <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              type="button"
              disabled={!form.posRefNo || !form.customerName || !form.customerPhone || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DeliveryCard({
  order,
  onAdvance,
  onCancel,
}: {
  order: DeliveryOrderDto;
  onAdvance: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("common");
  const td = useTranslations("delivery");
  const hasNext = !!NEXT_STATUS[order.status];

  return (
    <div className="rounded-md border bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">{order.refNo}</span>
        <span className="text-xs text-muted-foreground">{order.posRefNo}</span>
      </div>
      <p className="mt-1 text-sm">{order.customerName}</p>
      <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
      {order.address && <p className="text-xs text-muted-foreground">{order.address}</p>}
      <div className="mt-2 flex gap-2">
        {hasNext && (
          <Button type="button" size="sm" className="flex-1" onClick={onAdvance}>
            {td(`advanceTo.${NEXT_STATUS[order.status]}`)}
          </Button>
        )}
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}
