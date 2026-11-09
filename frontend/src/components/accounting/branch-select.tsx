"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { useAuthStore } from "@/stores/auth-store";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Branch filter for the accounting reports. The chart of accounts is the company's, so "All branches" ("ALL") is the default. */
export function BranchSelect({ value, onChange }: { value: string; onChange: (siteId: string) => void }) {
  const t = useTranslations();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const { data: sites = [] } = useQuery({
    queryKey: ["sites-lookup", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">{t("common.branch")}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {/* A single-branch company has nothing to choose between. */}
          <SelectItem value="ALL">{t("accounting.allBranches")}</SelectItem>
          {sites.length > 1 &&
            sites.map((s) => (
              <SelectItem key={s.siteID} value={s.siteID}>
                {s.siteName}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
