import { useQuery } from "@tanstack/react-query";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";

// The branch the user is working in. A user belongs to a company, not to one
// branch, so the branch is a per-device choice — the same one POS already
// remembers ("Select Your Branch" / "Switch Branch", bcor-pos-session). Pages
// outside POS read it here, and fall back to the company's first active branch
// when none has been picked, so it never depends on the till having been set
// up (see the "masters pages must not rely on the POS session" rule).
export function useCurrentBranch() {
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const sessionSiteId = usePosSessionStore((s) => s.siteId);
  const setSiteId = usePosSessionStore((s) => s.setSiteId);

  const { data: allSites = [], isLoading } = useQuery({
    queryKey: ["sites-lookup", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  const sites = allSites.filter((s) => s.active !== false);
  const current = sites.find((s) => s.siteID === sessionSiteId) ?? sites[0];

  return {
    sites,
    siteId: current?.siteID ?? "",
    siteName: current?.siteName ?? "",
    setBranch: setSiteId,
    isLoading,
  };
}
