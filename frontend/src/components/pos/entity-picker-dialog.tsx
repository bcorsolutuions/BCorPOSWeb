"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export interface EntityPickerItem {
  key: string;
  label: string;
  subLabel?: string;
  disabled?: boolean;
  disabledReason?: string;
}

/** Generic search-and-pick list, reused for Customer selection, Salesman selection, and (return bill) original-item lookup. */
export function EntityPickerDialog({
  open,
  onOpenChange,
  title,
  searchPlaceholder,
  items,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  searchPlaceholder: string;
  items: EntityPickerItem[];
  onSelect: (key: string) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((i) => i.label.toLowerCase().includes(q) || i.subLabel?.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchPlaceholder} className="ps-9" autoFocus />
        </div>

        <div className="max-h-72 space-y-1 overflow-y-auto">
          {filtered.map((item) => (
            <button
              key={item.key}
              disabled={item.disabled}
              onClick={() => {
                onSelect(item.key);
                onOpenChange(false);
              }}
              className="flex w-full flex-col items-start rounded-md border p-2 text-start text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="font-medium">{item.label}</span>
              {(item.subLabel || item.disabledReason) && (
                <span className="text-xs text-muted-foreground">{item.disabledReason ?? item.subLabel}</span>
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
