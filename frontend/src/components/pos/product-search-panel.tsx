"use client";

import { forwardRef, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Package, Scissors, Layers, Ticket } from "lucide-react";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { serviceLookupService } from "@/lib/api/services/service-lookup-service";
import { comboLookupService } from "@/lib/api/services/combo-lookup-service";
import { useAuthStore } from "@/stores/auth-store";
import { usePosCartStore } from "@/stores/pos-cart-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { useSiteBusinessTypes } from "@/hooks/use-site-business-types";
import { BarcodeScannerInput } from "@/components/pos/barcode-scanner-input";
import { SupermarketScanPanel } from "@/components/pos/supermarket-scan-panel";
import { SelectStaffDialog } from "@/components/pos/select-staff-dialog";
import { SelectComboOptionsDialog } from "@/components/pos/select-combo-options-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MoneyInput } from "@/components/shared/money-input";
import { useToast } from "@/components/ui/use-toast";
import { useCurrencyStore } from "@/stores/currency-store";
import { formatMoney, resolveImageUrl } from "@/lib/utils";
import type { ItemSearchResult } from "@/types/pos-lookups";
import type { ServiceDto } from "@/types/salon";
import type { ComboDetailDto, ComboMasterDto, ResolvedComboComponent } from "@/types/combo";

// A tile in the merged product+service+combo grid — services/combos are
// tagged so they're visually distinguishable and route to their own picker
// flow instead of being added to the cart directly.
type Tile =
  | { kind: "product"; item: ItemSearchResult }
  | { kind: "service"; service: ServiceDto }
  | { kind: "combo"; combo: ComboMasterDto };

export const ProductSearchPanel = forwardRef<HTMLInputElement>(function ProductSearchPanel(_props, searchInputRef) {
  const t = useTranslations("pos");
  const tSalon = useTranslations("salon");
  const tCombo = useTranslations("combo");
  const locale = useLocale();
  const { toast } = useToast();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");
  const currency = useCurrencyStore((s) => s.currencyCode);
  const addItem = usePosCartStore((s) => s.addItem);
  const addServiceLine = usePosCartStore((s) => s.addServiceLine);
  const addComboLine = usePosCartStore((s) => s.addComboLine);
  const addGiftVoucherSaleLine = usePosCartStore((s) => s.addGiftVoucherSaleLine);
  const { hasSalon, isSupermarket } = useSiteBusinessTypes();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [pickingService, setPickingService] = useState<ServiceDto | null>(null);
  const [pickingCombo, setPickingCombo] = useState<ComboMasterDto | null>(null);
  const [sellingVoucher, setSellingVoucher] = useState(false);
  const [voucherAmount, setVoucherAmount] = useState("");

  const { data: results = [] } = useQuery({
    queryKey: ["pos-item-search", compId, query, siteId],
    queryFn: () => posLookupService.searchItems(compId, query || undefined, undefined, undefined, siteId),
    enabled: !!compId && !isSupermarket,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["pos-service-search", compId, query],
    queryFn: () => serviceLookupService.searchServices(compId, query || undefined),
    enabled: !!compId && hasSalon,
  });

  // The whole catalog (a search with nothing typed - the same cache entry as an empty search box), so the category buttons stay the same
  // while typing instead of shrinking to the categories of whatever matched.
  const { data: catalogItems = [] } = useQuery({
    queryKey: ["pos-item-search", compId, "", siteId],
    queryFn: () => posLookupService.searchItems(compId, undefined, undefined, undefined, siteId),
    enabled: !!compId && !isSupermarket,
  });
  const { data: catalogServices = [] } = useQuery({
    queryKey: ["pos-service-search", compId, ""],
    queryFn: () => serviceLookupService.searchServices(compId, undefined),
    enabled: !!compId && hasSalon,
  });

  const { data: staffList = [], isFetched: staffFetched } = useQuery({
    queryKey: ["pos-staff-list", compId],
    queryFn: () => serviceLookupService.getStaff(compId),
    enabled: !!compId && hasSalon,
  });

  // A salon with no staff records has nobody to pick, so the staff form would only be an extra tap:
  // add the service straight to the bill. Only once the list has actually loaded (an empty list while
  // it is still loading must not skip the form).
  function pickService(service: ServiceDto) {
    if (staffFetched && staffList.length === 0) addServiceLine(service, null, 1);
    else setPickingService(service);
  }

  const { data: combos = [] } = useQuery({
    queryKey: ["pos-combo-search", compId, siteId],
    queryFn: () => comboLookupService.search(compId, siteId),
    enabled: !!compId,
  });

  // Combo tiles apply to every business type (a Bakery Combo of plain
  // InventoryMaster items, a Salon Combo of ServiceMaster rows, or a
  // restaurant-style Menu combo) — not gated by isSupermarket/hasSalon.
  // Full, query-unfiltered catalogs so the picker dialog can show a real
  // name for any component regardless of what's currently in the search box.
  const { data: allItems = [] } = useQuery({
    queryKey: ["combo-all-items", compId, siteId],
    queryFn: () => posLookupService.searchItems(compId, undefined, undefined, undefined, siteId),
    enabled: !!compId && combos.length > 0,
  });
  const { data: allServices = [] } = useQuery({
    queryKey: ["combo-all-services", compId],
    queryFn: () => serviceLookupService.searchServices(compId),
    enabled: !!compId && combos.length > 0,
  });

  function resolveComboComponentName(d: ComboDetailDto): string {
    if (d.componentType === "Inventory") return allItems.find((i) => i.code === d.inventoryCode)?.name ?? d.inventoryCode ?? "";
    if (d.componentType === "Service") return allServices.find((s) => s.code === d.serviceCode)?.serviceName ?? d.serviceCode ?? "";
    return d.menuCode ?? "";
  }

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of catalogItems) if (item.categoryCode) set.add(item.categoryCode);
    for (const svc of catalogServices) if (svc.categoryCode) set.add(svc.categoryCode);
    return Array.from(set);
  }, [catalogItems, catalogServices]);

  // Typing a search looks in EVERY category: the category filter only applies while the search box is empty.
  const activeCategory = query.trim() ? null : category;

  const tiles: Tile[] = useMemo(() => {
    const comboTiles: Tile[] = combos
      .filter((c) => !query || c.comboName.toLowerCase().includes(query.toLowerCase()))
      .map((combo) => ({ kind: "combo", combo }));
    const productTiles: Tile[] = results
      .filter((i) => !activeCategory || i.categoryCode === activeCategory)
      .map((item) => ({ kind: "product", item }));
    const serviceTiles: Tile[] = services
      .filter((s) => !activeCategory || s.categoryCode === activeCategory)
      .map((service) => ({ kind: "service", service }));
    return [...comboTiles, ...serviceTiles, ...productTiles];
  }, [results, services, combos, activeCategory, query]);

  function handleAddCombo(combo: ComboMasterDto) {
    const needsPicker = combo.details.some(
      (d) => d.isOptional || (combo.allowItemSubstitution && combo.details.filter((x) => x.groupNo === d.groupNo).length > 1),
    );
    if (needsPicker) {
      setPickingCombo(combo);
      return;
    }
    const resolvedComponents: ResolvedComboComponent[] = combo.details.map((d) => ({
      componentType: d.componentType,
      code: d.componentType === "Inventory" ? d.inventoryCode ?? "" : d.componentType === "Service" ? d.serviceCode ?? "" : d.menuCode ?? "",
      name: resolveComboComponentName(d),
      unitCode: d.unitCode ?? null,
      qty: d.quantity,
      additionalPrice: d.additionalPrice,
      isOptional: d.isOptional,
      selected: true,
      kitchenCode: null,
      groupNo: d.groupNo,
    }));
    addComboLine(combo, resolvedComponents);
  }

  async function handleScan(code: string) {
    const matches = await posLookupService.searchItems(compId, undefined, code, undefined, siteId);
    if (matches[0]) {
      addItem(matches[0]);
      setQuery("");
    } else {
      toast({ title: t("returnNotFound"), variant: "destructive" });
    }
  }

  function handleAdd(item: ItemSearchResult) {
    addItem(item);
  }

  // Supermarket/hypermarket sites get the barcode-first layout instead of
  // the tile grid below — a large SKU catalog doesn't browse well as tiles.
  // Placed after all hooks above (not as an early return at the top of the
  // component) so hook call order stays identical across renders even if
  // `isSupermarket` only resolves to true after the SiteBusinessType query
  // finishes loading.
  if (isSupermarket) {
    return <SupermarketScanPanel ref={searchInputRef} />;
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <BarcodeScannerInput
        ref={searchInputRef}
        value={query}
        onValueChange={(v) => {
          setQuery(v);
          if (v.trim()) setCategory(null); // searching starts from "all categories"
        }}
        onScan={handleScan}
      />

      <Button size="sm" variant="outline" className="w-fit gap-1.5" onClick={() => setSellingVoucher(true)}>
        <Ticket className="h-3.5 w-3.5" />
        {t("sellGiftVoucher")}
      </Button>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={activeCategory === null ? "default" : "outline"} onClick={() => setCategory(null)}>
            {t("allCategories")}
          </Button>
          {categories.map((c) => (
            <Button
              key={c}
              size="sm"
              variant={activeCategory === c ? "default" : "outline"}
              onClick={() => {
                setQuery(""); // picking a category browses it; a search would show every category
                setCategory(c);
              }}
            >
              {c}
            </Button>
          ))}
        </div>
      )}

      <div className="grid flex-1 auto-rows-min content-start items-start grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {tiles.map((tile) =>
          tile.kind === "combo" ? (
            <Card
              key={`c-${tile.combo.code}`}
              role="button"
              tabIndex={0}
              onClick={() => handleAddCombo(tile.combo)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCombo(tile.combo)}
              className="relative flex min-h-[104px] cursor-pointer flex-col items-center justify-between gap-1 p-3 text-center transition-colors hover:border-primary active:scale-[0.98]"
            >
              <Badge variant="secondary" className="absolute end-1.5 top-1.5 gap-1 px-1.5 py-0 text-[10px]">
                <Layers className="h-2.5 w-2.5" />
                {tCombo("combos")}
              </Badge>
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md bg-muted">
                <Layers className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="line-clamp-2 text-sm font-medium">{tile.combo.comboName}</p>
              <p className="text-sm font-semibold tabular-nums text-primary">
                {formatMoney(tile.combo.sellingPrice, currency, locale)}
              </p>
            </Card>
          ) : tile.kind === "product" ? (
            <Card
              key={`p-${tile.item.id}`}
              role="button"
              tabIndex={0}
              onClick={() => handleAdd(tile.item)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd(tile.item)}
              className="flex min-h-[104px] cursor-pointer flex-col items-center justify-between gap-1 p-3 text-center transition-colors hover:border-primary active:scale-[0.98]"
            >
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md bg-muted">
                {resolveImageUrl(tile.item.imagePath) ? (
                  // eslint-disable-next-line @next/next/no-img-element -- backend-served upload
                  <img src={resolveImageUrl(tile.item.imagePath)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <p className="line-clamp-2 text-sm font-medium">{tile.item.name}</p>
              {tile.item.barCode && <p className="truncate font-mono text-[10px] text-muted-foreground">{tile.item.barCode}</p>}
              <p className="text-sm font-semibold tabular-nums text-primary">
                {formatMoney(tile.item.price ?? 0, currency, locale)}
              </p>
            </Card>
          ) : (
            <Card
              key={`s-${tile.service.code}`}
              role="button"
              tabIndex={0}
              onClick={() => pickService(tile.service)}
              onKeyDown={(e) => e.key === "Enter" && pickService(tile.service)}
              className="relative flex min-h-[104px] cursor-pointer flex-col items-center justify-between gap-1 p-3 text-center transition-colors hover:border-primary active:scale-[0.98]"
            >
              <Badge variant="secondary" className="absolute end-1.5 top-1.5 gap-1 px-1.5 py-0 text-[10px]">
                <Scissors className="h-2.5 w-2.5" />
                {tSalon("services")}
              </Badge>
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md bg-muted">
                <Scissors className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="line-clamp-2 text-sm font-medium">{tile.service.serviceName}</p>
              <p className="text-sm font-semibold tabular-nums text-primary">
                {formatMoney(tile.service.rate, currency, locale)}
              </p>
            </Card>
          ),
        )}
        {tiles.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">{t("noProductsFound")}</p>
        )}
      </div>

      <SelectStaffDialog
        service={pickingService}
        staffList={staffList}
        onOpenChange={(open) => !open && setPickingService(null)}
        onConfirm={(staff, quantity) => {
          if (pickingService) addServiceLine(pickingService, staff, quantity);
        }}
      />

      <SelectComboOptionsDialog
        combo={pickingCombo}
        resolveName={resolveComboComponentName}
        onOpenChange={(open) => !open && setPickingCombo(null)}
        onConfirm={(resolvedComponents, quantity) => {
          if (pickingCombo) addComboLine(pickingCombo, resolvedComponents, quantity);
        }}
      />

      <Dialog
        open={sellingVoucher}
        onOpenChange={(open) => {
          setSellingVoucher(open);
          if (!open) setVoucherAmount("");
        }}
      >
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{t("sellGiftVoucher")}</DialogTitle>
          </DialogHeader>
          <MoneyInput
            currency={currency}
            value={voucherAmount}
            onChange={(e) => setVoucherAmount(e.target.value)}
            placeholder={t("giftVoucherAmount")}
            onKeyDown={(e) => {
              if (e.key === "Enter" && Number(voucherAmount) > 0) {
                addGiftVoucherSaleLine(Number(voucherAmount));
                setSellingVoucher(false);
                setVoucherAmount("");
              }
            }}
          />
          <DialogFooter>
            <Button
              disabled={!(Number(voucherAmount) > 0)}
              onClick={() => {
                addGiftVoucherSaleLine(Number(voucherAmount));
                setSellingVoucher(false);
                setVoucherAmount("");
              }}
            >
              {t("addToCart")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});
