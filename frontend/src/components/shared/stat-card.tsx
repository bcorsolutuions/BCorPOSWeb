import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  changePct,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  changePct?: number;
  tone?: "default" | "warning" | "destructive";
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p
            className={cn(
              "text-2xl font-semibold tabular-nums",
              tone === "warning" && "text-warning",
              tone === "destructive" && "text-destructive",
            )}
          >
            {value}
          </p>
          {typeof changePct === "number" && (
            <p
              className={cn(
                "flex items-center gap-1 text-xs font-medium",
                changePct >= 0 ? "text-success" : "text-destructive",
              )}
            >
              {changePct >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(changePct).toFixed(1)}%
            </p>
          )}
        </div>
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
