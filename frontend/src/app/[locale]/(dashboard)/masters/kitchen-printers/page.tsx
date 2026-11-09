"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { kitchenPrinterService, type KitchenPrinter } from "@/lib/api/services/kitchen-printer-service";
import { kitchenMasterService } from "@/lib/api/services/kitchen-master-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { kitchenPrinterSchema, type KitchenPrinterFormValues } from "@/schemas/restaurant-master.schema";
import { useAuthStore } from "@/stores/auth-store";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";

export default function KitchenPrinterMasterPage() {
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data: sites = [] } = useQuery({
    queryKey: ["kitchen-printer-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });
  const { data: kitchens } = useQuery({
    queryKey: ["kitchen-printer-kitchens", compId],
    queryFn: () => kitchenMasterService.list(),
    enabled: !!compId,
  });

  const fields: FieldConfig<KitchenPrinterFormValues>[] = useMemo(
    () => [
      { name: "code", labelKey: "common.code", type: "text" },
      { name: "printerName", labelKey: "restaurant.printerName", type: "text" },
      {
        name: "siteId",
        labelKey: "common.branch",
        type: "select",
        options: sites.map((s) => ({ value: s.siteID, label: s.siteName })),
      },
      {
        name: "kitchenCode",
        labelKey: "restaurant.kitchen",
        type: "select",
        options: (kitchens?.items ?? []).map((k) => ({ value: k.code, label: `${k.code} - ${k.kitchenName}` })),
      },
      { name: "ipAddress", labelKey: "restaurant.printerIp", type: "text" },
      { name: "portNo", labelKey: "restaurant.printerPort", type: "number" },
      { name: "paperWidth", labelKey: "restaurant.paperWidth", type: "number" },
      { name: "noOfCopies", labelKey: "restaurant.noOfCopies", type: "number" },
      { name: "autoCut", labelKey: "restaurant.autoCut", type: "checkbox" },
      { name: "printArabic", labelKey: "restaurant.printArabic", type: "checkbox" },
      { name: "printCancelledItems", labelKey: "restaurant.printCancelledItems", type: "checkbox" },
      { name: "printModifiedItems", labelKey: "restaurant.printModifiedItems", type: "checkbox" },
      { name: "remarks", labelKey: "common.remarks", type: "text" },
      { name: "active", labelKey: "common.active", type: "checkbox" },
    ],
    [sites, kitchens],
  );

  return (
    <CrudDataGridPage<KitchenPrinter, KitchenPrinterFormValues>
      queryKey="kitchen-printer-master"
      titleKey="restaurant.kitchenPrinters"
      service={kitchenPrinterService}
      schema={kitchenPrinterSchema}
      fields={fields}
      permission={PERMISSIONS.RESTAURANT_MANAGE_TABLES}
      defaultValues={{
        code: "",
        printerName: "",
        kitchenCode: "",
        siteId: "",
        ipAddress: "",
        portNo: 9100,
        paperWidth: 80,
        noOfCopies: 1,
        autoCut: true,
        printArabic: false,
        printCancelledItems: true,
        printModifiedItems: true,
        remarks: "",
        active: true,
      }}
      toFormValues={(e) => ({
        code: e.code,
        printerName: e.printerName,
        kitchenCode: e.kitchenCode,
        siteId: e.siteID,
        ipAddress: e.ipAddress ?? "",
        portNo: e.portNo ?? 9100,
        paperWidth: e.paperWidth ?? 80,
        noOfCopies: e.noOfCopies,
        autoCut: e.autoCut,
        printArabic: e.printArabic,
        printCancelledItems: e.printCancelledItems,
        printModifiedItems: e.printModifiedItems,
        remarks: e.remarks ?? "",
        active: e.active,
      })}
      columns={[
        { dataField: "code", captionKey: "common.code", width: 110 },
        { dataField: "printerName", captionKey: "restaurant.printerName" },
        { dataField: "kitchenCode", captionKey: "restaurant.kitchen", width: 120 },
        { dataField: "ipAddress", captionKey: "restaurant.printerIp", width: 140 },
        { dataField: "portNo", captionKey: "restaurant.printerPort", width: 90 },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
