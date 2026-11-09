"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ItemMaster } from "@/types/item-master";

// Plain-text typeahead over Item Master — no Popover/Command primitive exists
// yet in this codebase, so this is a minimal self-contained combobox rather
// than pulling in a new dependency for one field. Shows Code — Name both
// while typing and once a selection is made, satisfying "search and set with
// item code+name" (purchase/invoices and purchase/orders line-item pickers)
// without a separate lookup step.
//
// The results list is portaled to document.body and positioned with
// `fixed` + the input's own getBoundingClientRect(), not rendered inline as
// an absolutely-positioned child. Both call sites live in a table wrapped in
// an `overflow-x-auto` div (needed for horizontal scroll on narrow screens);
// CSS gives that div an implicit `overflow-y: auto` too (only one axis can
// be `visible` if the other isn't), which clips any inline `position:
// absolute` dropdown the moment it extends past the wrapper's bottom edge —
// reported as "item search is not visible". Portaling escapes that
// clipping ancestor entirely, same fix Radix's own Popover uses internally.
export function ItemSearchCell({
  items,
  value,
  onSelect,
  placeholder,
}: {
  items: ItemMaster[];
  value: string;
  onSelect: (item: ItemMaster) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Row highlighted with the arrow keys; -1 = none yet (Enter then takes the first match, but only once something was typed).
  const [active, setActive] = useState(-1);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = items.find((i) => i.code === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q ? items.filter(
          (i) =>
            i.code.toLowerCase().includes(q) ||
            i.name.toLowerCase().includes(q) ||
            (i.barCode ?? "").toLowerCase().includes(q),
        ) : items;
    return pool.slice(0, 50);
  }, [items, query]);

  function openDropdown() {
    const r = inputRef.current?.getBoundingClientRect();
    if (r) setRect({ top: r.bottom, left: r.left, width: r.width });
    setOpen(true);
  }

  // Keep the dropdown glued to the input if the dialog content scrolls
  // while it's open (the input itself doesn't move otherwise).
  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      const r = inputRef.current?.getBoundingClientRect();
      if (r) setRect({ top: r.bottom, left: r.left, width: r.width });
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={open ? query : selected ? `${selected.code} — ${selected.name}${selected.barCode ? ` · ${selected.barCode}` : ""}` : ""}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(-1);
          openDropdown();
        }}
        onFocus={() => {
          setQuery("");
          setActive(-1);
          openDropdown();
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!open) openDropdown();
            const last = filtered.length - 1;
            setActive((a) => (e.key === "ArrowDown" ? Math.min(a + 1, last) : Math.max(a - 1, 0)));
          } else if (e.key === "Escape" && open) {
            e.stopPropagation(); // close the list, not the surrounding dialog
            setOpen(false);
          } else if (e.key === "Enter" && open) {
            // Choose the highlighted row (or the first match of what was typed). The Enter then carries on to the form, which
            // moves the cursor to the next field.
            const pick = filtered[active >= 0 ? active : query.trim() ? 0 : -1];
            if (pick) {
              onSelect(pick);
              setQuery("");
            }
            setOpen(false);
          }
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open &&
        rect &&
        createPortal(
          <div
            // z-[100], not z-50 — the Dialog this cell normally lives inside
            // is itself a z-50 fixed/portaled element, so at equal z-index
            // the winner is just whichever portal committed to document.body
            // last (DOM-order tiebreak, not guaranteed in this direction).
            //
            // pointer-events: auto is load-bearing, not decorative — Radix
            // Dialog sets `pointer-events: none` on <body> itself while open
            // (its focus-trap mechanism) and only re-enables it inside the
            // Dialog's own content subtree. This portal is a *sibling* of
            // that subtree, so it inherits body's `none` and becomes
            // click-through — visible, z-index correct, but every click
            // falls through to the Dialog underneath. Confirmed via
            // elementFromPoint() during debugging: it resolved to the
            // Dialog's <form>, not this dropdown, despite the dropdown
            // visually being on top.
            className="fixed z-[100] max-h-56 overflow-auto rounded-md border bg-popover shadow-md pointer-events-auto"
            style={{ top: rect.top + 4, left: rect.left, width: Math.max(rect.width, 288) }}
          >
            {filtered.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">{"—"}</p>
            ) : (
              filtered.map((i) => (
                <button
                  type="button"
                  key={i.code}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect(i);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full flex-col items-start px-2 py-1.5 text-start text-sm hover:bg-accent",
                    filtered[active]?.code === i.code && "bg-accent",
                  )}
                  ref={(el) => {
                    if (el && filtered[active]?.code === i.code) el.scrollIntoView({ block: "nearest" });
                  }}
                >
                  <span className="font-medium">
                    {i.code} — {i.name}
                  </span>
                  {i.barCode && <span className="font-mono text-xs text-muted-foreground">{i.barCode}</span>}
                </button>
              ))
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

// The default Input's px-3 padding plus the browser's native number-input
// spin buttons left almost no room for the digits in a narrow table cell —
// reported as "discount % tax % value not visible properly". Tighter
// padding + hiding the spin buttons (still fully usable via keyboard/mouse
// scroll, just no visible arrows) reclaims that space for every numeric
// cell in a compact line-item table.
export const numberCellClass =
  "px-2 text-end [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
