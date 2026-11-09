"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { stockWastageService } from "@/lib/api/services/stock-wastage-service";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { useToast } from "@/components/ui/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PermissionGate } from "@/components/auth/permission-gate";
import { PERMISSIONS } from "@/lib/auth/permissions";

/** Bar Counter Management §16 — records wastage/breakage/spillage, posting a matching negative InventoryLedger movement. */
export default function StockWastagePage() {
  const t = useTranslations("common");
  const tBar = useTranslations("barCounter");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const userName = useAuthStore((s) => s.user?.userName ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");

  const [open, setOpen] = useState(false);
  const [inventoryCode, setInventoryCode] = useState("");
  const [qty, setQty] = useState(1);
  const [locationCode, setLocationCode] = useState("MAIN");
  const [reason, setReason] = useState("");
  const [stationCode, setStationCode] = useState("");
  const [remarks, setRemarks] = useState("");

  const { data: entries = [] } = useQuery({
    queryKey: ["stock-wastage", compId, siteId],
    queryFn: () => stockWastageService.list(compId, siteId),
    enabled: !!compId && !!siteId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      stockWastageService.create(compId, siteId, {
        inventoryCode,
        qty,
        locationCode,
        reason,
        stationCode: stationCode || null,
        remarks: remarks || null,
        userName,
      }),
    onSuccess: () => {
      toast({ title: t("saveSuccess") });
      setOpen(false);
      setInventoryCode("");
      setQty(1);
      setReason("");
      setStationCode("");
      setRemarks("");
      queryClient.invalidateQueries({ queryKey: ["stock-wastage", compId, siteId] });
    },
    onError: (err) => toast({ title: apiErrorMessage(err, t("errorGeneric")), variant: "destructive" }),
  });

  return (
    <PermissionGate permission={PERMISSIONS.BAR_COUNTER_MANAGE}>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{tBar("wastage")}</h1>
          <Button onClick={() => setOpen(true)}>{t("add")}</Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("date")}</TableHead>
              <TableHead>{t("code")}</TableHead>
              <TableHead>{t("quantity")}</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>{t("user")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{new Date(e.docDt).toLocaleString()}</TableCell>
                <TableCell>{e.inventoryCode}</TableCell>
                <TableCell>{e.qty}</TableCell>
                <TableCell>{e.locationCode}</TableCell>
                <TableCell>{e.reason}</TableCell>
                <TableCell>{e.userName}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t("add")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>{t("code")}</Label>
                <Input value={inventoryCode} onChange={(e) => setInventoryCode(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{t("quantity")}</Label>
                <Input type="number" min={0} value={qty} onChange={(e) => setQty(Number(e.target.value) || 0)} />
              </div>
              <div className="space-y-1">
                <Label>Location</Label>
                <Input value={locationCode} onChange={(e) => setLocationCode(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Reason</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Station</Label>
                <Input value={stationCode} onChange={(e) => setStationCode(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{t("remarks")}</Label>
                <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                {t("cancel")}
              </Button>
              <Button
                disabled={!inventoryCode || qty <= 0 || !reason || !locationCode || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {t("save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
}
