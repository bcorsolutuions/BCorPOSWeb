"use client";

import { useTranslations } from "next-intl";
import { Users, ClipboardList, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FloorStatusEntry, TableStatus } from "@/types/restaurant";

const statusStyles: Record<TableStatus, string> = {
  AVAILABLE: "border-success bg-success/10 text-success",
  OCCUPIED: "border-destructive bg-destructive/10 text-destructive",
  RESERVED: "border-warning bg-warning/10 text-warning",
  DIRTY: "border-muted-foreground bg-muted text-muted-foreground",
};

const statusKey: Record<TableStatus, "free" | "occupied" | "reserved" | "dirty"> = {
  AVAILABLE: "free",
  OCCUPIED: "occupied",
  RESERVED: "reserved",
  DIRTY: "dirty",
};

export function TableCard({ entry, onClick }: { entry: FloorStatusEntry; onClick: () => void }) {
  const t = useTranslations("restaurant");
  const { table, openKotDocNo, heldBillDocNo } = entry;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-lg border-2 p-4 text-center transition-transform active:scale-95",
        statusStyles[table.currentStatus],
      )}
    >
      <span className="text-lg font-bold">{table.tableName}</span>
      <span className="flex items-center gap-1 text-xs">
        <Users className="h-3 w-3" />
        {table.capacity}
      </span>
      <span className="text-xs font-medium">{t(statusKey[table.currentStatus])}</span>
      {openKotDocNo != null && (
        <span className="flex items-center gap-1 text-[10px] opacity-75">
          <ClipboardList className="h-3 w-3" />
          {t("activeOrder")}
        </span>
      )}
      {heldBillDocNo != null && (
        <span className="flex items-center gap-1 text-[10px] opacity-75">
          <Receipt className="h-3 w-3" />
          {t("heldBill")}
        </span>
      )}
    </button>
  );
}
