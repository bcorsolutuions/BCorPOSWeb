"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Martini, Plus, Receipt } from "lucide-react";
import { kotService } from "@/lib/api/services/kot-service";
import { restaurantLookupService } from "@/lib/api/services/restaurant-lookup-service";
import { restaurantOperationsService, type OpenTabEntry } from "@/lib/api/services/restaurant-operations-service";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { useSignalRHub } from "@/hooks/use-signalr-hub";
import { useRouter } from "@/i18n/navigation";
import { useToast } from "@/components/ui/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { KdsColumn } from "@/components/kds/kds-column";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { kotDtoToUpdateInput } from "@/types/restaurant";
import type { KotStatus } from "@/types/restaurant";
import { formatMoney } from "@/lib/utils";
import { useCurrencyStore } from "@/stores/currency-store";

const KOTS_QUERY_KEY = "restaurant-kots";
const TABS_QUERY_KEY = "open-tabs";

/**
 * Bar Counter Management §6/§18/§19 — the focused, single-station board the
 * spec's mockup describes (NEW/PREPARING/READY, elapsed timer, special
 * instructions). Reuses the exact same KdsColumn/KotCard/useSignalRHub("/kds")
 * machinery as the existing kitchen-wide /pos/kds screen — this route is a
 * pre-filtered, chrome-different sibling of it, not a new engine (§2/§18).
 */
export default function StationScreenPage() {
  const params = useParams<{ stationCode: string }>();
  const stationCode = decodeURIComponent(params.stationCode);
  const t = useTranslations("kds");
  const tBar = useTranslations("barCounter");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { toast } = useToast();
  const router = useRouter();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");
  const userName = useAuthStore((s) => s.user?.userName ?? "");
  const currency = useCurrencyStore((s) => s.currencyCode);
  const queryClient = useQueryClient();

  const [openTabDialog, setOpenTabDialog] = useState(false);
  const [tabsListOpen, setTabsListOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");

  const { data: kitchens = [] } = useQuery({
    queryKey: ["kitchens", compId, siteId],
    queryFn: () => restaurantLookupService.getKitchens(compId, siteId),
    enabled: !!compId && !!siteId,
  });
  const station = kitchens.find((k) => k.code === stationCode);

  const { data: kots = [] } = useQuery({
    queryKey: [KOTS_QUERY_KEY, compId, siteId],
    queryFn: () => kotService.getAll(compId, siteId),
    enabled: !!compId && !!siteId,
    refetchInterval: 15_000,
  });

  const { data: openTabs = [] } = useQuery({
    queryKey: [TABS_QUERY_KEY, compId, siteId],
    queryFn: () => restaurantOperationsService.getOpenTabs(compId, siteId),
    enabled: !!compId && !!siteId && tabsListOpen,
  });

  const stationCodeRef = useRef(stationCode);
  useEffect(() => {
    stationCodeRef.current = stationCode;
  }, [stationCode]);

  useSignalRHub(
    "/kds",
    {
      KotCreated: () => queryClient.invalidateQueries({ queryKey: [KOTS_QUERY_KEY, compId, siteId] }),
      KotStatusChanged: () => queryClient.invalidateQueries({ queryKey: [KOTS_QUERY_KEY, compId, siteId] }),
    },
    (connection) => {
      void connection.invoke("JoinKitchen", compId, siteId, stationCodeRef.current).catch(() => {});
    },
  );

  const advanceStatus = useMutation({
    mutationFn: async ({ docNo, status }: { docNo: number; status: KotStatus }) => {
      const kot = await kotService.get(compId, siteId, docNo);
      const dto = kotDtoToUpdateInput(kot);
      dto.kotStatus = status;
      dto.details = dto.details.map((d) => ({ ...d, itemStatus: status === "SERVED" ? "SERVED" : status === "READY" ? "READY" : "PREPARING" }));
      return kotService.update(compId, siteId, userName, docNo, dto);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KOTS_QUERY_KEY, compId, siteId] }),
  });

  const openTabMutation = useMutation({
    mutationFn: () =>
      restaurantOperationsService.openTab(compId, siteId, {
        customerName: customerName || null,
        userName,
      }),
    onSuccess: (kot) => {
      toast({ title: tBar("tabOpened") });
      setOpenTabDialog(false);
      setCustomerName("");
      queryClient.invalidateQueries({ queryKey: [TABS_QUERY_KEY, compId, siteId] });
      router.push(`/pos/tabs/${encodeURIComponent(kot.tabCode!)}`);
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  const visibleKots = kots.filter((k) => k.details.some((d) => d.kitchenCode === stationCode));
  const openKots = visibleKots.filter((k) => k.kotStatus === "OPEN");
  const preparingKots = visibleKots.filter((k) => k.kotStatus === "PREPARING");
  const readyKots = visibleKots.filter((k) => k.kotStatus === "READY");

  function handleAdvance(docNo: number, status: KotStatus) {
    advanceStatus.mutate({ docNo, status });
  }

  return (
    <div className="flex h-full flex-col gap-4 bg-slate-950 p-4 text-slate-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Martini className="h-5 w-5" />
          <h1 className="text-lg font-semibold">{station?.kitchenName ?? stationCode}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-slate-700 bg-slate-900 text-slate-50" onClick={() => router.push("/pos/sale")}>
            <Receipt className="me-1 h-4 w-4" />
            {tBar("newCounterSale")}
          </Button>
          <Button variant="outline" size="sm" className="border-slate-700 bg-slate-900 text-slate-50" onClick={() => setTabsListOpen(true)}>
            {tBar("viewTabs")}
          </Button>
          <Button size="sm" onClick={() => setOpenTabDialog(true)}>
            <Plus className="me-1 h-4 w-4" />
            {tBar("openTab")}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-x-auto">
        <KdsColumn status="OPEN" kots={openKots} onAdvance={handleAdvance} />
        <KdsColumn status="PREPARING" kots={preparingKots} onAdvance={handleAdvance} />
        <KdsColumn status="READY" kots={readyKots} onAdvance={handleAdvance} />
      </div>

      <Dialog open={openTabDialog} onOpenChange={setOpenTabDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{tBar("openTab")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label>{tBar("customerName")}</Label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenTabDialog(false)}>
              {tc("cancel")}
            </Button>
            <Button disabled={openTabMutation.isPending} onClick={() => openTabMutation.mutate()}>
              {tBar("openTab")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={tabsListOpen} onOpenChange={setTabsListOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tBar("viewTabs")}</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {openTabs.length === 0 && <p className="text-sm text-muted-foreground">{tBar("noOpenTabs")}</p>}
            {openTabs.map((tab: OpenTabEntry) => (
              <button
                key={tab.tabCode}
                type="button"
                className="flex w-full items-center justify-between rounded-md border p-2 text-start text-sm hover:bg-muted"
                onClick={() => {
                  setTabsListOpen(false);
                  router.push(`/pos/tabs/${encodeURIComponent(tab.tabCode)}`);
                }}
              >
                <div>
                  <p className="font-medium">{tab.tabCode}</p>
                  {tab.customerName && <p className="text-xs text-muted-foreground">{tab.customerName}</p>}
                </div>
                <span className="tabular-nums">{formatMoney(tab.runningTotal, currency, locale)}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
