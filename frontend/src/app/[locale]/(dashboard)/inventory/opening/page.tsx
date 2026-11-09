"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ChevronLeft, ChevronRight, FileUp, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { inventoryOpeningService, type OpeningLineCheck, type OpeningValidationBody } from "@/lib/api/services/inventory-opening-service";
import { itemMasterService } from "@/lib/api/services/item-master-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { OpeningImportDialog } from "@/components/inventory/opening-import-dialog";
import { ItemSearchCell, numberCellClass } from "@/components/shared/item-search-cell";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataGridWrapper } from "@/components/shared/data-grid-wrapper";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { usePermission } from "@/hooks/use-permission";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { enterMovesToNextField } from "@/lib/prevent-enter-submit";
import { cn, formatMoney, newUuid } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useCurrencyStore } from "@/stores/currency-store";
import type { ItemMaster } from "@/types/item-master";

interface Line {
  key: string;
  /** Present on lines that already exist on the saved document (kept so an edit updates them instead of re-creating). */
  id?: string;
  rowID?: number;
  code: string;
  name: string;
  barCode: string;
  unit: string;
  qty: string;
  cost: string;
  remarks: string;
}

const PAGE_SIZE = 100;
const today = () => new Date().toISOString().slice(0, 10);
const num = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};
const keyOf = (l: { code: string; unit: string }) => `${l.code.trim().toUpperCase()}|${l.unit.trim().toUpperCase()}`;
const emptyLine = (): Line => ({ key: newUuid(), code: "", name: "", barCode: "", unit: "", qty: "", cost: "", remarks: "" });

export default function InventoryOpeningPage() {
  const t = useTranslations("inventoryOpening");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { toast } = useToast();
  const { can } = usePermission();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const currency = useCurrencyStore((s) => s.currencyCode);
  const compId = user?.compId ?? "";
  const userName = user?.userName ?? "";
  const canEdit = can(PERMISSIONS.INVENTORY_ADJUST_STOCK);

  const [siteId, setSiteId] = useState("");
  const { data: sites = [] } = useQuery({ queryKey: ["sites-lookup", compId], queryFn: () => posLookupService.getSites(compId), enabled: !!compId });
  useEffect(() => {
    if (!siteId && sites[0]) setSiteId(sites[0].siteID);
  }, [sites, siteId]);

  const { data: openings = [], isLoading: listLoading } = useQuery({
    queryKey: ["inventory-openings", compId, siteId],
    queryFn: () => inventoryOpeningService.list(compId, siteId),
    enabled: !!compId && !!siteId,
  });
  const { data: locations = [] } = useQuery({
    queryKey: ["opening-locations", compId, siteId],
    queryFn: () => inventoryOpeningService.locations(compId, siteId),
    enabled: !!compId && !!siteId,
  });
  const { data: itemsResult } = useQuery({ queryKey: ["items-lookup", compId], queryFn: () => itemMasterService.list(), enabled: !!compId });
  const items = useMemo(() => itemsResult?.items ?? [], [itemsResult]);
  const itemByCode = useMemo(() => new Map(items.map((i) => [i.code.toUpperCase(), i])), [items]);
  const itemByBarcode = useMemo(() => new Map(items.filter((i) => i.barCode).map((i) => [(i.barCode as string).toUpperCase(), i])), [items]);

  // ── dialog / document state ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [docNo, setDocNo] = useState<number | null>(null);
  const [refNo, setRefNo] = useState("");
  const [docDt, setDocDt] = useState(today());
  const [location, setLocation] = useState("");
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [posted, setPosted] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"save" | "post" | "delete" | null>(null);
  const [serverErrors, setServerErrors] = useState<Map<number, string[]>>(new Map());
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("");
  const [quickAdd, setQuickAdd] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [confirmPost, setConfirmPost] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const readOnly = posted || !canEdit;

  function toLine(d: { id?: string; rowID?: number; inventoryCode: string; barCode?: string | null; unitCode?: string | null; qty: number; unitCost?: number | null; remarks?: string | null }): Line {
    const item = itemByCode.get(d.inventoryCode.toUpperCase());
    return {
      key: newUuid(),
      id: d.id,
      rowID: d.rowID,
      code: d.inventoryCode,
      name: item?.name ?? "",
      barCode: d.barCode ?? item?.barCode ?? "",
      unit: d.unitCode ?? "",
      qty: String(d.qty),
      cost: d.unitCost != null ? String(d.unitCost) : "",
      remarks: d.remarks ?? "",
    };
  }

  function resetForm() {
    setDocNo(null);
    setRefNo("");
    setDocDt(today());
    setLocation(locations.find((l) => l.code === "MAIN")?.code ?? locations[0]?.code ?? "");
    setRemarks("");
    setLines([]);
    setPosted(false);
    setDirty(false);
    setServerErrors(new Map());
    setHeaderError(null);
    setPage(0);
    setFilter("");
    setQuickAdd("");
  }

  function openNew() {
    resetForm();
    setDialogOpen(true);
  }

  async function openExisting(no: number) {
    resetForm();
    setDocNo(no);
    setDialogOpen(true);
    try {
      const doc = await inventoryOpeningService.get(compId, siteId, no);
      setRefNo(doc.refNo ?? "");
      setDocDt(doc.docDt.slice(0, 10));
      setLocation(doc.location);
      setRemarks(doc.remarks ?? "");
      setPosted(doc.posted === true);
      setLines(doc.details.map(toLine));
      setDirty(false);
    } catch {
      toast({ variant: "destructive", title: tc("errorGeneric") });
      setDialogOpen(false);
    }
  }

  // Names arrive after the item list does; fill them in without marking the document changed.
  useEffect(() => {
    if (items.length === 0) return;
    setLines((prev) => (prev.some((l) => l.code && !l.name) ? prev.map((l) => (l.code && !l.name ? { ...l, name: itemByCode.get(l.code.toUpperCase())?.name ?? "" } : l)) : prev));
  }, [items, itemByCode]);

  function touch() {
    setDirty(true);
    setServerErrors(new Map());
    setHeaderError(null);
  }
  function patchLine(key: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    touch();
  }
  function pickItem(key: string, item: ItemMaster) {
    patchLine(key, { code: item.code, name: item.name, barCode: item.barCode ?? "", unit: item.unitCode ?? "", cost: lines.find((l) => l.key === key)?.cost || (item.costPrice ? String(item.costPrice) : "") });
  }
  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
    touch();
  }
  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
    setPage(Math.floor(lines.length / PAGE_SIZE));
    touch();
  }
  function handleQuickAdd() {
    const q = quickAdd.trim().toUpperCase();
    if (!q) return;
    const item = itemByCode.get(q) ?? itemByBarcode.get(q);
    if (!item) {
      toast({ variant: "destructive", title: t("quickNotFound", { code: quickAdd.trim() }) });
      return;
    }
    if (lines.some((l) => l.code.toUpperCase() === item.code.toUpperCase())) {
      toast({ variant: "destructive", title: t("quickAlreadyAdded", { code: item.code }) });
      return;
    }
    setLines((prev) => [...prev, { ...emptyLine(), code: item.code, name: item.name, barCode: item.barCode ?? "", unit: item.unitCode ?? "", cost: item.costPrice ? String(item.costPrice) : "" }]);
    setQuickAdd("");
    setPage(Math.floor(lines.length / PAGE_SIZE));
    touch();
  }

  function applyImport(checked: OpeningLineCheck[], replace: boolean) {
    const added = checked.map((c) =>
      toLine({ inventoryCode: c.inventoryCode, barCode: c.barCode, unitCode: c.unitCode, qty: c.qty, unitCost: c.unitCost, remarks: c.remarks }),
    );
    setLines((prev) => (replace ? added : [...prev, ...added]));
    setPage(0);
    touch();
    toast({ title: t("importAdded", { count: added.length }) });
  }

  // ── save / post / delete ──
  function buildDto() {
    return {
      docDt,
      location,
      remarks: remarks || undefined,
      details: lines.map((l) => ({
        id: l.id,
        rowID: l.rowID,
        inventoryCode: l.code.trim(),
        unitCode: l.unit || null,
        qty: num(l.qty),
        unitCost: l.cost.trim() === "" ? null : num(l.cost),
        remarks: l.remarks || null,
      })),
    };
  }

  /** Returns the saved document's number, or null when the save was refused (errors are shown on the form). */
  async function save(): Promise<number | null> {
    if (!location) {
      setHeaderError(t("chooseLocation"));
      return null;
    }
    if (lines.length === 0) {
      setHeaderError(t("noLinesError"));
      return null;
    }
    try {
      const dto = buildDto();
      const saved = docNo == null ? await inventoryOpeningService.create(compId, siteId, userName, dto) : await inventoryOpeningService.update(compId, siteId, userName, docNo, dto);
      setDocNo(saved.docNo);
      setRefNo(saved.refNo ?? "");
      setLines(saved.details.map(toLine));
      setDirty(false);
      setServerErrors(new Map());
      setHeaderError(null);
      queryClient.invalidateQueries({ queryKey: ["inventory-openings", compId, siteId] });
      return saved.docNo;
    } catch (err) {
      showError(err);
      return null;
    }
  }

  function showError(err: unknown) {
    const body = (err as { response?: { data?: OpeningValidationBody } })?.response?.data;
    if (body?.lines && body.lines.length > 0) {
      setServerErrors(new Map(body.lines.map((l) => [l.row, l.errors])));
      setHeaderError(body.locationError ?? body.message);
      // jump to the first row that needs fixing
      const first = Math.min(...body.lines.map((l) => l.row));
      if (Number.isFinite(first)) setPage(Math.floor((first - 1) / PAGE_SIZE));
    } else {
      setHeaderError(body?.locationError ?? body?.message ?? null);
      toast({ variant: "destructive", title: body?.message || tc("errorGeneric") });
    }
  }

  async function handleSave() {
    setBusy("save");
    const no = await save();
    setBusy(null);
    if (no != null) toast({ title: tc("saveSuccess") });
  }

  async function handlePost() {
    setConfirmPost(false);
    setBusy("post");
    try {
      let no = docNo;
      if (no == null || dirty) {
        no = await save();
        if (no == null) return;
      }
      const done = await inventoryOpeningService.post(compId, siteId, no);
      setPosted(true);
      setLines(done.details.map(toLine));
      queryClient.invalidateQueries({ queryKey: ["inventory-openings", compId, siteId] });
      queryClient.invalidateQueries({ queryKey: ["stock-lookup"] });
      toast({ title: t("postedToast") });
    } catch (err) {
      showError(err);
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (docNo == null) return;
    setConfirmDelete(false);
    setBusy("delete");
    try {
      await inventoryOpeningService.remove(compId, siteId, userName, docNo);
      queryClient.invalidateQueries({ queryKey: ["inventory-openings", compId, siteId] });
      toast({ title: tc("deleteSuccess") });
      setDialogOpen(false);
    } catch {
      toast({ variant: "destructive", title: tc("errorGeneric") });
    } finally {
      setBusy(null);
    }
  }

  // ── derived ──
  const totals = useMemo(() => {
    let qty = 0;
    let amount = 0;
    for (const l of lines) {
      qty += num(l.qty);
      amount += num(l.qty) * num(l.cost);
    }
    return { qty, amount };
  }, [lines]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const indexed = lines.map((l, i) => ({ l, i }));
    return q ? indexed.filter(({ l }) => l.code.toLowerCase().includes(q) || l.name.toLowerCase().includes(q) || l.barCode.toLowerCase().includes(q)) : indexed;
  }, [lines, filter]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const existingKeys = useMemo(() => new Set(lines.filter((l) => l.code).map(keyOf)), [lines]);
  const dupKeys = useMemo(() => {
    const seen = new Set<string>();
    const dup = new Set<string>();
    for (const l of lines) {
      if (!l.code) continue;
      const k = keyOf({ code: l.code, unit: l.unit });
      if (seen.has(k)) dup.add(k);
      seen.add(k);
    }
    return dup;
  }, [lines]);

  function lineProblems(l: Line, index: number): string[] {
    const out = [...(serverErrors.get(index + 1) ?? [])];
    if (out.length > 0) return out;
    if (readOnly) return out;
    if (l.code.trim() && items.length > 0 && !itemByCode.has(l.code.trim().toUpperCase())) out.push(t("unknownItem"));
    if (l.code.trim() && dupKeys.has(keyOf({ code: l.code, unit: l.unit }))) out.push(t("duplicateLine"));
    if (l.code.trim() && !(num(l.qty) > 0)) out.push(t("qtyRequired"));
    return out;
  }
  const problemCount = lines.reduce((n, l, i) => n + (lineProblems(l, i).length > 0 ? 1 : 0), 0);

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <div className="flex items-center gap-2">
            <Select value={siteId} onValueChange={setSiteId}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={t("branch")} />
              </SelectTrigger>
              <SelectContent>
                {sites.map((s) => (
                  <SelectItem key={s.siteID} value={s.siteID}>
                    {s.siteName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canEdit && (
              <Button onClick={openNew} disabled={!siteId}>
                <Plus className="me-1 h-4 w-4" />
                {tc("add")}
              </Button>
            )}
          </div>
        }
      />

      <div className="min-h-0 flex-1">
        <DataGridWrapper
          keyExpr="docNo"
          dataSource={openings}
          loading={listLoading}
          onRowClick={(row) => openExisting(row.docNo as number)}
          columns={[
            { dataField: "docNo", captionKey: "inventoryOpening.docNo", width: 100 },
            { dataField: "refNo", captionKey: "inventoryOpening.refNo", width: 150 },
            { dataField: "docDt", captionKey: "inventoryOpening.date", dataType: "date", width: 130 },
            { dataField: "location", captionKey: "inventoryOpening.location", width: 110 },
            { dataField: "lineCount", captionKey: "inventoryOpening.lines", dataType: "number", width: 90 },
            { dataField: "totalQty", captionKey: "inventoryOpening.totalQty", dataType: "number", width: 120 },
            { dataField: "totalAmount", captionKey: "inventoryOpening.totalAmount", dataType: "number", width: 130 },
            {
              dataField: "posted",
              captionKey: "inventoryOpening.status",
              width: 110,
              cellRender: (cell) => <Badge variant={cell.data.posted ? "success" : "secondary"}>{cell.data.posted ? t("posted") : t("draft")}</Badge>,
            },
            { dataField: "remarks", captionKey: "inventoryOpening.remarks" },
          ]}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => !busy && setDialogOpen(o)}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {t("title")}
              {docNo != null && <Badge variant={posted ? "success" : "secondary"}>{posted ? t("posted") : t("draft")}</Badge>}
            </DialogTitle>
          </DialogHeader>

          <form className="space-y-4" onKeyDown={enterMovesToNextField} onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs">{t("docNo")}</Label>
                <Input readOnly value={docNo ?? t("auto")} className="bg-muted" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("refNo")}</Label>
                <Input readOnly value={refNo || t("auto")} className="bg-muted" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("date")}</Label>
                <Input type="date" value={docDt} readOnly={readOnly} className={readOnly ? "bg-muted" : undefined} onChange={(e) => { setDocDt(e.target.value); touch(); }} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("location")}</Label>
                <Select value={location} onValueChange={(v) => { setLocation(v); touch(); }} disabled={readOnly}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("chooseLocation")} />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => (
                      <SelectItem key={l.code} value={l.code}>
                        {l.code} — {l.name}
                      </SelectItem>
                    ))}
                    {location && !locations.some((l) => l.code === location) && <SelectItem value={location}>{location}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("remarks")}</Label>
              <Input value={remarks} readOnly={readOnly} className={readOnly ? "bg-muted" : undefined} maxLength={500} onChange={(e) => { setRemarks(e.target.value); touch(); }} />
            </div>

            {headerError && (
              <p className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {headerError}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {!readOnly && (
                <>
                  <div className="relative">
                    <Search className="pointer-events-none absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={quickAdd}
                      onChange={(e) => setQuickAdd(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleQuickAdd();
                        }
                      }}
                      placeholder={t("quickAddPlaceholder")}
                      className="h-9 w-64 ps-8"
                    />
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addLine}>
                    <Plus className="me-1 h-4 w-4" />
                    {t("addLine")}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setImportOpen(true)} disabled={!location}>
                    <FileUp className="me-1 h-4 w-4" />
                    {t("import")}
                  </Button>
                </>
              )}
              <div className="relative ms-auto">
                <Search className="pointer-events-none absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={filter} onChange={(e) => { setFilter(e.target.value); setPage(0); }} placeholder={t("filterPlaceholder")} className="h-9 w-56 ps-8" />
              </div>
            </div>

            <div className="max-h-[46vh] overflow-auto rounded-md border">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="sticky top-0 z-10 bg-muted">
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="w-12 px-2 py-2 text-start font-medium">#</th>
                    <th className="w-72 px-2 py-2 text-start font-medium">{t("item")}</th>
                    <th className="w-32 px-2 py-2 text-start font-medium">{t("code")}</th>
                    <th className="w-36 px-2 py-2 text-start font-medium">{t("barcode")}</th>
                    <th className="w-20 px-2 py-2 text-start font-medium">{t("unit")}</th>
                    <th className="w-28 px-2 py-2 text-start font-medium">{t("qty")}</th>
                    <th className="w-28 px-2 py-2 text-start font-medium">{t("cost")}</th>
                    <th className="w-28 px-2 py-2 text-end font-medium">{t("amount")}</th>
                    {!readOnly && <th className="w-10 px-2 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-2 py-8 text-center text-sm text-muted-foreground">
                        {lines.length === 0 ? t("noLines") : t("noMatch")}
                      </td>
                    </tr>
                  )}
                  {visible.map(({ l, i }) => {
                    const problems = lineProblems(l, i);
                    return (
                      <tr key={l.key} className={cn("border-b align-top last:border-0", problems.length > 0 && "bg-destructive/5")}>
                        <td className="px-2 py-1.5 text-xs tabular-nums text-muted-foreground">{i + 1}</td>
                        <td className="px-2 py-1.5">
                          {readOnly || l.id ? (
                            <Input readOnly value={l.name || l.code} className="bg-muted" />
                          ) : (
                            <ItemSearchCell items={items} value={l.code} onSelect={(item) => pickItem(l.key, item)} placeholder={t("searchItem")} />
                          )}
                          {problems.length > 0 && <p className="mt-1 text-xs text-destructive">{problems.join(" ")}</p>}
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            value={l.code}
                            readOnly={readOnly}
                            className={cn("font-mono text-xs", readOnly && "bg-muted", problems.length > 0 && "border-destructive")}
                            onChange={(e) => {
                              const code = e.target.value;
                              const item = itemByCode.get(code.trim().toUpperCase());
                              patchLine(l.key, { code, name: item?.name ?? "", barCode: item?.barCode ?? "", unit: item?.unitCode ?? l.unit, cost: l.cost || (item?.costPrice ? String(item.costPrice) : "") });
                            }}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input readOnly value={l.barCode} className="bg-muted font-mono text-xs" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input value={l.unit} readOnly={readOnly} className={cn(readOnly && "bg-muted")} onChange={(e) => patchLine(l.key, { unit: e.target.value.toUpperCase() })} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="number" min="0" step="any" value={l.qty} readOnly={readOnly} className={cn(numberCellClass, readOnly && "bg-muted")} onChange={(e) => patchLine(l.key, { qty: e.target.value })} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="number" min="0" step="any" value={l.cost} readOnly={readOnly} className={cn(numberCellClass, readOnly && "bg-muted")} onChange={(e) => patchLine(l.key, { cost: e.target.value })} />
                        </td>
                        <td className="px-2 py-1.5 text-end align-middle font-medium tabular-nums">{formatMoney(num(l.qty) * num(l.cost), currency, locale)}</td>
                        {!readOnly && (
                          <td className="px-1 py-1.5 text-center">
                            <button type="button" onClick={() => removeLine(l.key)} className="rounded p-1.5 text-muted-foreground hover:text-destructive" aria-label={tc("delete")}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                {pageCount > 1 && (
                  <>
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} aria-label={t("prevPage")}>
                      <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                    </Button>
                    <span className="tabular-nums">{safePage + 1} / {pageCount}</span>
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)} aria-label={t("nextPage")}>
                      <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                    </Button>
                  </>
                )}
                {problemCount > 0 && !readOnly && (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    {t("linesWithProblems", { count: problemCount })}
                  </span>
                )}
              </div>
              <div className="flex gap-6">
                <span>
                  <span className="text-muted-foreground">{t("lines")}: </span>
                  <span className="font-semibold tabular-nums">{lines.length}</span>
                </span>
                <span>
                  <span className="text-muted-foreground">{t("totalQty")}: </span>
                  <span className="font-semibold tabular-nums">{totals.qty.toLocaleString(locale, { maximumFractionDigits: 3 })}</span>
                </span>
                <span>
                  <span className="text-muted-foreground">{t("totalAmount")}: </span>
                  <span className="font-semibold tabular-nums">{formatMoney(totals.amount, currency, locale)}</span>
                </span>
              </div>
            </div>

            {posted && <p className="text-sm text-muted-foreground">{t("postedReadOnly")}</p>}

            <DialogFooter>
              {!posted && docNo != null && canEdit && (
                <Button type="button" variant="destructive" className="me-auto" disabled={!!busy} onClick={() => setConfirmDelete(true)}>
                  {tc("delete")}
                </Button>
              )}
              <Button type="button" variant="outline" disabled={!!busy} onClick={() => setDialogOpen(false)}>
                {tc("close")}
              </Button>
              {!readOnly && (
                <>
                  <Button type="button" variant="outline" disabled={!!busy || !dirty} onClick={handleSave}>
                    {busy === "save" && <Loader2 className="me-1 h-4 w-4 animate-spin" />}
                    {tc("save")}
                  </Button>
                  <Button type="button" disabled={!!busy || lines.length === 0} onClick={() => setConfirmPost(true)}>
                    {busy === "post" && <Loader2 className="me-1 h-4 w-4 animate-spin" />}
                    {t("post")}
                  </Button>
                </>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <OpeningImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        compId={compId}
        siteId={siteId}
        location={location}
        existingKeys={existingKeys}
        onAdd={applyImport}
      />

      <ConfirmDialog
        open={confirmPost}
        onOpenChange={setConfirmPost}
        title={t("postConfirmTitle")}
        description={t("postConfirmBody", { count: lines.length, location })}
        confirmLabel={t("post")}
        destructive={false}
        onConfirm={handlePost}
      />
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} loading={busy === "delete"} onConfirm={handleDelete} />
    </div>
  );
}
