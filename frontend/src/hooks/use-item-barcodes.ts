"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { itemMasterService } from "@/lib/api/services/item-master-service";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Item code -> barcode, so every screen/print that shows an item name can show its barcode too.
 * Document lines (PO, GRN, invoices...) only carry the item code and name, never the barcode — the Item
 * Master has it. Shares react-query's ["items-lookup", compId] cache with the document pages, which already
 * load the item list for their pickers, so using this adds no extra request there.
 */
export function useItemBarcodes(): (itemCode?: string | null) => string {
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const { data } = useQuery({
    queryKey: ["items-lookup", compId],
    queryFn: () => itemMasterService.list(),
    enabled: !!compId,
  });
  const byCode = useMemo(() => new Map((data?.items ?? []).map((i) => [i.code, i.barCode ?? ""])), [data]);
  return (itemCode) => (itemCode ? (byCode.get(itemCode) ?? "") : "");
}
