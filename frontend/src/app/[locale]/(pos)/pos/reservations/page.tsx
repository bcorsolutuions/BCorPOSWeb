"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck } from "lucide-react";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { reservationService } from "@/lib/api/services/reservation-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { restaurantLookupService } from "@/lib/api/services/restaurant-lookup-service";
import { restaurantOperationsService } from "@/lib/api/services/restaurant-operations-service";
import { reservationSchema, type ReservationFormValues } from "@/schemas/masters.schema";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { useRouter } from "@/i18n/navigation";
import { useToast } from "@/components/ui/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ReservationMaster } from "@/types/reservation";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";

const RESERVATION_QUERY_KEY = "reservations";

export default function ReservationsPage() {
  const t = useTranslations("common");
  const tr = useTranslations("restaurant");
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const userName = useAuthStore((s) => s.user?.userName ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");

  const [seatingReservation, setSeatingReservation] = useState<ReservationMaster | null>(null);
  const [seatTableCode, setSeatTableCode] = useState<string>("");

  const { data: sites = [] } = useQuery({
    queryKey: ["reservation-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["reservation-tables", compId, siteId],
    queryFn: () => restaurantLookupService.getTables(compId, siteId),
    enabled: !!compId && !!siteId && !!seatingReservation,
  });

  const seatMutation = useMutation({
    mutationFn: async () => {
      if (!seatingReservation || !seatTableCode) throw new Error("Select a table");
      await reservationService.seat(seatingReservation.code, seatTableCode);
      await restaurantOperationsService.openTable(compId, siteId, seatTableCode, {
        guestCount: seatingReservation.partySize,
        userName,
      });
      return seatTableCode;
    },
    onSuccess: (tableCode) => {
      toast({ title: tr("reservationSeated") });
      queryClient.invalidateQueries({ queryKey: [RESERVATION_QUERY_KEY] });
      setSeatingReservation(null);
      router.push(`/pos/tables/${tableCode}`);
    },
    onError: (err) => toast({ title: apiErrorMessage(err, t("errorGeneric")), variant: "destructive" }),
  });

  const fields: FieldConfig<ReservationFormValues>[] = useMemo(
    () => [
      { name: "code", labelKey: "common.code", type: "text" },
      { name: "customerName", labelKey: "common.name", type: "text" },
      { name: "customerPhone", labelKey: "customer.phone", type: "text" },
      { name: "partySize", labelKey: "restaurant.partySize", type: "number" },
      { name: "reservationDateTime", labelKey: "restaurant.reservationDateTime", type: "datetime" },
      { name: "durationMinutes", labelKey: "restaurant.durationMinutes", type: "number" },
      {
        name: "siteId",
        labelKey: "common.branch",
        type: "select",
        options: sites.map((s) => ({ value: s.siteID, label: s.siteName })),
      },
      {
        name: "status",
        labelKey: "common.status",
        type: "select",
        options: ["Pending", "Confirmed", "Seated", "Cancelled", "NoShow"].map((v) => ({ value: v, label: v })),
      },
      { name: "remarks", labelKey: "common.description", type: "textarea" },
    ],
    [sites],
  );

  return (
    <>
      <CrudDataGridPage<ReservationMaster, ReservationFormValues>
        queryKey={RESERVATION_QUERY_KEY}
        titleKey="restaurant.reservations"
        service={reservationService}
        schema={reservationSchema}
        fields={fields}
        permission={PERMISSIONS.POS_SELL}
        defaultValues={{
          code: "",
          customerName: "",
          customerPhone: "",
          partySize: 2,
          reservationDateTime: "",
          durationMinutes: 60,
          status: "Pending",
          siteId: siteId || "",
          remarks: "",
        }}
        toFormValues={(entity) => ({
          code: entity.code,
          customerName: entity.customerName,
          customerPhone: entity.customerPhone,
          partySize: entity.partySize,
          reservationDateTime: entity.reservationDateTime,
          durationMinutes: entity.durationMinutes,
          status: entity.status,
          siteId: entity.siteID,
          remarks: entity.remarks ?? "",
        })}
        columns={[
          { dataField: "code", captionKey: "common.code", width: 100 },
          { dataField: "customerName", captionKey: "common.name" },
          { dataField: "customerPhone", captionKey: "customer.phone", width: 140 },
          { dataField: "partySize", captionKey: "restaurant.partySize", dataType: "number", width: 100 },
          { dataField: "reservationDateTime", captionKey: "restaurant.reservationDateTime", dataType: "date", width: 180 },
          { dataField: "status", captionKey: "common.status", width: 110 },
          {
            dataField: "tableCode",
            captionKey: "restaurant.seat",
            width: 90,
            cellRender: (data) => {
              const reservation = data.data as unknown as ReservationMaster;
              const seatable = reservation.status === "Pending" || reservation.status === "Confirmed";
              return (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!seatable}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSeatingReservation(reservation);
                    setSeatTableCode("");
                  }}
                >
                  <CalendarCheck className="h-4 w-4" />
                </Button>
              );
            },
          },
        ]}
      />

      <Dialog open={!!seatingReservation} onOpenChange={(open) => !open && setSeatingReservation(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{tr("seatReservation")}</DialogTitle>
          </DialogHeader>

          <Select value={seatTableCode} onValueChange={setSeatTableCode}>
            <SelectTrigger>
              <SelectValue placeholder={tr("selectTable")} />
            </SelectTrigger>
            <SelectContent>
              {tables.map((tbl) => (
                <SelectItem key={tbl.code} value={tbl.code}>
                  {tbl.tableName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSeatingReservation(null)}>
              {t("cancel")}
            </Button>
            <Button type="button" disabled={!seatTableCode || seatMutation.isPending} onClick={() => seatMutation.mutate()}>
              {tr("seat")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
