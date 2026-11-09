"use client";

import { Building2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useCurrentBranch } from "@/hooks/use-current-branch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Lists the company's real branches (SysSiteMast). A user belongs to a
// company, not to a single branch, so the branch is a per-device choice shared
// with POS — see useCurrentBranch. Item Master's Stock column and the Stock
// Ledger report follow it.
export function BranchCompanySwitcher() {
  const user = useAuthStore((s) => s.user);
  const { sites, siteId, setBranch } = useCurrentBranch();

  if (!user || sites.length === 0) return null;

  return (
    <div className="hidden items-center gap-2 md:flex">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select value={siteId} onValueChange={setBranch}>
        <SelectTrigger className="h-9 w-48">
          <SelectValue placeholder="Branch" />
        </SelectTrigger>
        <SelectContent>
          {sites.map((s) => (
            <SelectItem key={s.siteID} value={s.siteID}>
              {s.siteName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
