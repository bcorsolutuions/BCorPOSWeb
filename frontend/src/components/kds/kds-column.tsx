"use client";

import { useTranslations } from "next-intl";
import { KotCard } from "@/components/kds/kot-card";
import type { KotDto, KotStatus } from "@/types/restaurant";

export function KdsColumn({
  status,
  kots,
  onAdvance,
}: {
  status: KotStatus;
  kots: KotDto[];
  onAdvance: (docNo: number, status: KotStatus) => void;
}) {
  const t = useTranslations("kds");
  const labelKey = status === "OPEN" ? "new" : status === "PREPARING" ? "preparing" : "ready";

  return (
    <div className="flex h-full min-w-[280px] flex-1 flex-col gap-3">
      <h2 className="flex items-center justify-between text-sm font-semibold text-muted-foreground">
        {t(labelKey)}
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{kots.length}</span>
      </h2>
      <div className="flex-1 space-y-3 overflow-y-auto">
        {kots.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">{t("noTickets")}</p>}
        {kots.map((kot) => (
          <KotCard key={kot.id} kot={kot} onAdvance={onAdvance} />
        ))}
      </div>
    </div>
  );
}
