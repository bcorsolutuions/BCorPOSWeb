"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChefHat, Clock } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { KotDto, KotStatus } from "@/types/restaurant";

const nextStatus: Partial<Record<KotStatus, KotStatus>> = {
  OPEN: "PREPARING",
  PREPARING: "READY",
  READY: "SERVED",
};

const statusTone: Record<KotStatus, string> = {
  OPEN: "border-destructive",
  PREPARING: "border-primary",
  READY: "border-success",
  SERVED: "border-muted",
  CLOSED: "border-muted",
  CANCELLED: "border-muted",
};

function useElapsedMinutes(orderTime?: string | null) {
  const [minutes, setMinutes] = useState(0);
  useEffect(() => {
    if (!orderTime) return;
    const update = () => setMinutes(Math.floor((Date.now() - new Date(orderTime).getTime()) / 60000));
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [orderTime]);
  return minutes;
}

export function KotCard({ kot, onAdvance }: { kot: KotDto; onAdvance: (docNo: number, status: KotStatus) => void }) {
  const t = useTranslations("kds");
  const tBar = useTranslations("barCounter");
  const elapsed = useElapsedMinutes(kot.orderTime);
  const advanceTo = nextStatus[kot.kotStatus];
  const items = kot.details.filter((d) => !d.cancelled);
  // Bar Counter Management §20 — a line cancelled after being sent must
  // stay visible as a "CANCEL REQUEST", not silently disappear.
  const cancelledItems = kot.details.filter((d) => d.cancelled);

  return (
    <Card className={cn("border-t-4", statusTone[kot.kotStatus])}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3">
        <div>
          <p className="font-semibold">{kot.refNo}</p>
          {(kot.tableCode || kot.tabCode) && (
            <p className="text-xs text-muted-foreground">
              {kot.tableCode ? `${t("table")} ${kot.tableCode}` : `${tBar("tabCode")} ${kot.tabCode}`}
              {kot.guestCount != null && ` · ${kot.guestCount} ${t("guests")}`}
            </p>
          )}
        </div>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {elapsed}m
        </span>
      </CardHeader>
      <CardContent className="space-y-2 p-3 pt-0">
        <ul className="space-y-1 text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-2">
              <span className="font-semibold tabular-nums">{item.qty}×</span>
              <div>
                <p>{item.menuName ?? item.menuCode}</p>
                {item.courseName && <p className="text-xs text-muted-foreground">{t("course")}: {item.courseName}</p>}
                {item.preparationNotes && <p className="text-xs italic text-muted-foreground">{item.preparationNotes}</p>}
              </div>
            </li>
          ))}
        </ul>

        {cancelledItems.length > 0 && (
          <ul className="space-y-1 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm">
            {cancelledItems.map((item) => (
              <li key={item.id}>
                <p className="font-semibold text-destructive">
                  {tBar("cancelRequest")}: {item.qty}× {item.menuName ?? item.menuCode}
                </p>
                {item.cancelledBy && (
                  <p className="text-xs text-muted-foreground">
                    {tBar("cancelledBy")}: {item.cancelledBy}
                    {item.cancellationReason && ` — ${item.cancellationReason}`}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        {advanceTo && (
          <Button size="sm" className="w-full" onClick={() => onAdvance(kot.docNo, advanceTo)}>
            {advanceTo === "READY" ? <ChefHat className="me-1 h-4 w-4" /> : <Check className="me-1 h-4 w-4" />}
            {advanceTo === "PREPARING" ? t("markPreparing") : advanceTo === "READY" ? t("markReady") : t("markServed")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
