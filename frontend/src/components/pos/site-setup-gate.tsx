"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "@/i18n/navigation";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { useAuthStore } from "@/stores/auth-store";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * pos-session-store's siteId is per-device (see its own comment), and until
 * now the only screen that ever set it was POS Billing's PosSetupDialog
 * (which also asks for terminal/shift). That left Restaurant Tables/KDS/
 * Reservations/Deliveries silently showing "nothing found" on any device
 * that had never opened POS Billing — those screens only need a branch, not
 * a full till setup. This gate covers that gap; POS Billing keeps its own
 * fuller dialog and is explicitly skipped here to avoid asking for the site
 * twice back-to-back.
 */
export function SiteSetupGate() {
  const t = useTranslations("pos");
  const pathname = usePathname();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const siteId = usePosSessionStore((s) => s.siteId);
  const sessionCompId = usePosSessionStore((s) => s.compId);
  const setSiteId = usePosSessionStore((s) => s.setSiteId);
  const resetSession = usePosSessionStore((s) => s.reset);
  const [selected, setSelected] = useState("");

  const skip = pathname.startsWith("/pos/sale");
  const needsSite = !skip && !siteId;

  // The branch is remembered on this PC across logins. Also load the list when one is saved, to check it still belongs to the
  // signed-in company.
  const { data: sites = [], isFetched } = useQuery({
    queryKey: ["pos-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: (needsSite || !!siteId) && !!compId,
  });

  // A branch is always tied to its company. A branch (and shift) saved while another company was signed in is not this company's -
  // even when both have a branch with the same code - so the till would open with the wrong business type (the plain style) until
  // someone pressed Switch Branch. Forget it and ask again. (The terminal name is kept - it names this PC.)
  useEffect(() => {
    if (compId && siteId && sessionCompId && sessionCompId !== compId) resetSession();
  }, [compId, siteId, sessionCompId, resetSession]);

  // A session saved before the company was recorded: keep it only if the branch really is one of this company's, and tie it to it now.
  useEffect(() => {
    if (!compId || !siteId || sessionCompId || !isFetched || sites.length === 0) return;
    if (sites.some((s) => s.siteID === siteId)) usePosSessionStore.setState({ compId });
    else resetSession();
  }, [compId, siteId, sessionCompId, isFetched, sites, resetSession]);

  // A company with a single branch has nothing to choose - use it straight away (the waiter app and the table screens
  // otherwise greet every phone with a branch picker that has exactly one entry).
  const onlySite = sites.length === 1 ? sites[0]!.siteID : null;
  useEffect(() => {
    if (needsSite && onlySite) setSiteId(onlySite);
  }, [needsSite, onlySite, setSiteId]);

  const open = needsSite && !onlySite;

  if (skip) return null;

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t("setupSiteTitle")}</DialogTitle>
          <DialogDescription>{t("setupSiteDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <Label>{t("setupSite")}</Label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger>
              <SelectValue placeholder={t("setupSite")} />
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

        <DialogFooter>
          <Button className="w-full" disabled={!selected} onClick={() => setSiteId(selected)}>
            {t("setupSiteConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
