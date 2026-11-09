"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, Info, OctagonAlert } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardSummary } from "@/lib/api/services/dashboard-service";

const severityIcon = {
  info: Info,
  warning: AlertTriangle,
  critical: OctagonAlert,
} as const;

const severityColor = {
  info: "text-muted-foreground",
  warning: "text-warning",
  critical: "text-destructive",
} as const;

export function AlertsWidget({ alerts }: { alerts: DashboardSummary["alerts"] }) {
  const t = useTranslations("dashboard");

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">{t("alerts")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
        {alerts.map((alert) => {
          const Icon = severityIcon[alert.severity];
          return (
            <div key={alert.id} className="flex items-start gap-2 text-sm">
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", severityColor[alert.severity])} />
              <span>{alert.message}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
