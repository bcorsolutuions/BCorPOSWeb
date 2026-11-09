"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { setMenuService } from "@/lib/api/services/set-menu-service";
import { useCurrencyStore } from "@/stores/currency-store";
import { useLocale } from "next-intl";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { formatDate, formatMoney } from "@/lib/utils";

// Set Menu admin screen — list/search only; row click opens the dedicated
// /restaurant/set-menu/[id] edit page, "New" opens .../new. Deliberately
// NOT built on CrudDataGridPage, same reasoning as gift-vouchers/page.tsx:
// the nested Group -> GroupItem editor doesn't fit that component's
// single-level renderExtra slot. See kind-crafting-hamming.md.
export default function SetMenuListPage() {
  const t = useTranslations("setMenu");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const currency = useCurrencyStore((s) => s.currencyCode);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data } = useQuery({
    queryKey: ["set-menu-master"],
    queryFn: () => setMenuService.list(),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (setMenu: NonNullable<typeof data>["items"][number]) =>
      setMenuService.update(setMenu.code, {
        code: setMenu.code,
        siteId: setMenu.siteID,
        setMenuName: setMenu.setMenuName,
        setMenuNameArb: setMenu.setMenuNameArb ?? "",
        description: setMenu.description ?? "",
        menuCode: setMenu.menuCode ?? "",
        sellingPrice: setMenu.sellingPrice,
        taxCode: setMenu.taxCode ?? "",
        taxPercent: setMenu.taxPercent ?? undefined,
        validFrom: setMenu.validFrom ?? "",
        validTo: setMenu.validTo ?? "",
        startTime: setMenu.startTime ?? "",
        endTime: setMenu.endTime ?? "",
        availableDays: setMenu.availableDays ?? "",
        allowDiscount: setMenu.allowDiscount,
        remarks: setMenu.remarks ?? "",
        active: !setMenu.active,
        groups: setMenu.groups.map((g) => ({
          id: g.id,
          groupCode: g.groupCode,
          groupName: g.groupName,
          groupNameArb: g.groupNameArb ?? "",
          sequence: g.sequence,
          minSelection: g.minSelection,
          maxSelection: g.maxSelection,
          isRequired: g.isRequired,
          displayOrder: g.displayOrder,
          active: g.active,
          items: g.items.map((i) => ({
            id: i.id,
            menuCode: i.menuCode,
            unitCode: i.unitCode ?? "",
            additionalPrice: i.additionalPrice,
            isDefault: i.isDefault,
            displayOrder: i.displayOrder,
            active: i.active,
          })),
        })),
      }),
    onSuccess: () => {
      toast({ title: tc("saveSuccess") });
      queryClient.invalidateQueries({ queryKey: ["set-menu-master"] });
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  const items = (data?.items ?? []).filter(
    (s) => !search || s.setMenuName.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4 overflow-y-auto p-4">
      <PageHeader
        title={t("setMenuList")}
        description={t("setMenuDesc")}
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => router.push("/restaurant/set-menu/new")}>
            <Plus className="h-3.5 w-3.5" />
            {tc("add")}
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tc("search")} className="max-w-sm" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("code")}</TableHead>
                <TableHead>{t("setMenuName")}</TableHead>
                <TableHead className="text-end">{t("sellingPrice")}</TableHead>
                <TableHead>{t("validFrom")}</TableHead>
                <TableHead>{t("validTo")}</TableHead>
                <TableHead>{tc("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    {tc("noData")}
                  </TableCell>
                </TableRow>
              )}
              {items.map((s) => (
                <TableRow key={s.code} className="cursor-pointer hover:bg-accent" onClick={() => router.push(`/restaurant/set-menu/${encodeURIComponent(s.code)}`)}>
                  <TableCell className="font-medium">{s.code}</TableCell>
                  <TableCell>{s.setMenuName}</TableCell>
                  <TableCell className="text-end tabular-nums">{formatMoney(s.sellingPrice, currency, locale)}</TableCell>
                  <TableCell>{s.validFrom ? formatDate(s.validFrom, locale) : "-"}</TableCell>
                  <TableCell>{s.validTo ? formatDate(s.validTo, locale) : "-"}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Switch checked={s.active} onCheckedChange={() => toggleActiveMutation.mutate(s)} />
                      <Badge variant={s.active ? "default" : "secondary"}>{s.active ? tc("active") : tc("inactive")}</Badge>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
