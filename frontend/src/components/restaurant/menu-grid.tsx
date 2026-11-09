"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Search, UtensilsCrossed, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUploadDialog } from "@/components/shared/image-upload-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useCurrencyStore } from "@/stores/currency-store";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { imageUploadService } from "@/lib/api/services/image-upload-service";
import { cn, formatMoney, resolveImageUrl } from "@/lib/utils";
import type { MenuCategoryDto, MenuItemDto, MenuSubCategoryDto } from "@/types/restaurant";

const ALL_SUB = "__all";
const OTHER_SUB = "__other";

const byDisplayOrder = <T extends { displayOrder: number }>(a: T, b: T) => a.displayOrder - b.displayOrder;

// Main category chips -> sub category chips -> items, plus a search box that
// looks across the whole menu. A menu of several hundred items is never
// rendered at once: the waiter always sees one sub category (or the search
// results), two taps from any item.
export function MenuGrid({
  categories,
  subCategories = [],
  items,
  activeCategory,
  onCategoryChange,
  onSelectItem,
}: {
  categories: MenuCategoryDto[];
  subCategories?: MenuSubCategoryDto[];
  items: MenuItemDto[];
  activeCategory: string | null;
  onCategoryChange: (code: string | null) => void;
  onSelectItem: (item: MenuItemDto) => void;
}) {
  const t = useTranslations("pos");
  const tr = useTranslations("restaurant");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currency = useCurrencyStore((s) => s.currencyCode);
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");
  const [imageDialogItem, setImageDialogItem] = useState<MenuItemDto | null>(null);
  const [search, setSearch] = useState("");
  // The sub selection belongs to one category (picking another category
  // resets it to "All"); remembering which keeps a stale choice from applying
  // if the category changes some other way.
  const [subSelection, setSubSelection] = useState<{ category: string | null; value: string }>({
    category: null,
    value: ALL_SUB,
  });

  const localName = (name: string, nameArb?: string | null) => (locale === "ar" && nameArb ? nameArb : name);

  const visibleCategories = useMemo(
    () => categories.filter((c) => c.active !== false && c.showInPOS !== false).sort(byDisplayOrder),
    [categories],
  );
  // No "All" chip: with a few hundred items that was the whole menu in one
  // scroll. The first category is the starting point; search covers the rest.
  const category =
    activeCategory && visibleCategories.some((c) => c.code === activeCategory)
      ? activeCategory
      : (visibleCategories[0]?.code ?? null);

  const visibleSubs = useMemo(
    () =>
      subCategories
        .filter((s) => s.categoryCode === category && s.active !== false && s.showInPOS !== false)
        .sort(byDisplayOrder),
    [subCategories, category],
  );
  const activeSub = subSelection.category === category ? subSelection.value : ALL_SUB;

  const posItems = useMemo(() => items.filter((i) => i.active !== false && i.showInPOS !== false), [items]);
  const hasOtherItems = useMemo(() => {
    if (visibleSubs.length === 0) return false;
    const codes = new Set(visibleSubs.map((s) => s.code));
    return posItems.some((i) => i.categoryCode === category && (!i.subCategoryCode || !codes.has(i.subCategoryCode)));
  }, [posItems, visibleSubs, category]);

  const menuItemsQueryKey = ["menu-items", compId, siteId];

  const uploadImageMutation = useMutation({
    mutationFn: (file: File) => imageUploadService.uploadMenuItemImage(compId, imageDialogItem!.code, file),
    onSuccess: () => {
      toast({ title: tc("photoUpdated") });
      queryClient.invalidateQueries({ queryKey: menuItemsQueryKey });
    },
    onError: () => toast({ title: tc("errorGeneric"), variant: "destructive" }),
  });

  const removeImageMutation = useMutation({
    mutationFn: () => imageUploadService.deleteMenuItemImage(compId, imageDialogItem!.code),
    onSuccess: () => {
      toast({ title: tc("photoRemoved") });
      queryClient.invalidateQueries({ queryKey: menuItemsQueryKey });
    },
    onError: () => toast({ title: tc("errorGeneric"), variant: "destructive" }),
  });

  const query = search.trim().toLowerCase();
  const visibleItems = useMemo(() => {
    let list: MenuItemDto[];
    if (query) {
      list = posItems.filter(
        (i) =>
          i.menuName.toLowerCase().includes(query) ||
          (i.menuNameArb ?? "").toLowerCase().includes(query) ||
          i.code.toLowerCase().includes(query) ||
          (i.barcode ?? "").toLowerCase().includes(query),
      );
    } else {
      list = posItems.filter((i) => i.categoryCode === category);
      if (visibleSubs.length > 0 && activeSub !== ALL_SUB) {
        const codes = new Set(visibleSubs.map((s) => s.code));
        list = list.filter((i) =>
          activeSub === OTHER_SUB ? !i.subCategoryCode || !codes.has(i.subCategoryCode) : i.subCategoryCode === activeSub,
        );
      }
    }
    return [...list].sort((a, b) => byDisplayOrder(a, b) || a.menuName.localeCompare(b.menuName));
  }, [posItems, query, category, visibleSubs, activeSub]);

  return (
    <div className="flex h-full min-w-0 flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tr("searchMenu")}
          className="h-9 ps-8 pe-8"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute end-2 top-2.5 text-muted-foreground hover:text-foreground"
            aria-label={tr("clearSearch")}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {query ? (
        <p className="text-xs text-muted-foreground">{tr("menuSearchResults", { count: visibleItems.length })}</p>
      ) : (
        <>
          {visibleCategories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {visibleCategories.map((c) => (
                <Button
                  key={c.code}
                  size="sm"
                  variant={category === c.code ? "default" : "outline"}
                  onClick={() => {
                    setSubSelection({ category: c.code, value: ALL_SUB });
                    onCategoryChange(c.code);
                  }}
                >
                  {localName(c.categoryName, c.categoryNameArb)}
                </Button>
              ))}
            </div>
          )}

          {visibleSubs.length > 0 && (
            // One scrolling row: a category such as Alcoholic Drinks has ~27 sub categories.
            <div className="flex gap-2 overflow-x-auto pb-1">
              <Button
                size="sm"
                variant={activeSub === ALL_SUB ? "secondary" : "ghost"}
                className={cn("shrink-0", activeSub === ALL_SUB && "ring-1 ring-primary")}
                onClick={() => setSubSelection({ category, value: ALL_SUB })}
              >
                {tr("allSubCategories")}
              </Button>
              {visibleSubs.map((sub) => (
                <Button
                  key={sub.code}
                  size="sm"
                  variant={activeSub === sub.code ? "secondary" : "ghost"}
                  className={cn("shrink-0", activeSub === sub.code && "ring-1 ring-primary")}
                  onClick={() => setSubSelection({ category, value: sub.code })}
                >
                  {localName(sub.subCategoryName, sub.subCategoryNameArb)}
                </Button>
              ))}
              {hasOtherItems && (
                <Button
                  size="sm"
                  variant={activeSub === OTHER_SUB ? "secondary" : "ghost"}
                  className={cn("shrink-0", activeSub === OTHER_SUB && "ring-1 ring-primary")}
                  onClick={() => setSubSelection({ category, value: OTHER_SUB })}
                >
                  {tr("otherItems")}
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {/* Tiles have a fixed height (h-[148px]); auto-rows-min + content-start/
          items-start keep them at that size at the top-start of the grid —
          without them, CSS Grid's default stretch behavior expands the single
          row of tiles to fill the whole flex-1 container whenever a category
          (or the "less items" case generally) leaves few rows to fill it,
          which is exactly the "abnormal size" reported for a lightly-
          populated category. Matches product-search-panel.tsx's identical
          fix for the same grid shape on the trading/retail POS side. */}
      <div className="grid flex-1 auto-rows-min content-start items-start grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4">
        {visibleItems.map((item) => (
          <Card
            key={item.code}
            role="button"
            tabIndex={0}
            aria-disabled={item.isSoldOut || undefined}
            onClick={() => !item.isSoldOut && onSelectItem(item)}
            onKeyDown={(e) => e.key === "Enter" && !item.isSoldOut && onSelectItem(item)}
            className={cn(
              // Fixed size on purpose: every tile is the same height whatever the
              // name length, so a long name ("DEWARS WHITE LABEL - Double") can
              // never stretch its tile (or the row) taller than its neighbours.
              "relative flex h-[192px] min-w-0 cursor-pointer flex-col items-center gap-1 overflow-hidden p-0 pb-2 text-center transition-colors hover:border-primary active:scale-[0.98]",
              item.isSoldOut && "cursor-not-allowed opacity-50 hover:border-border active:scale-100",
            )}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setImageDialogItem(item);
              }}
              className="absolute end-1 top-1 z-10 rounded-full bg-background/80 p-1 text-muted-foreground hover:text-primary"
              aria-label={tc("uploadPhoto")}
            >
              <Camera className="h-3.5 w-3.5" />
            </button>

            {/* Photo fills the top of the tile; no photo -> the icon on a muted block of the same size. */}
            <div className="flex h-[104px] w-full shrink-0 items-center justify-center overflow-hidden bg-muted">
              {resolveImageUrl(item.imagePath) ? (
                // eslint-disable-next-line @next/next/no-img-element -- backend-served upload
                <img
                  src={resolveImageUrl(item.imagePath)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              ) : (
                <UtensilsCrossed className="h-8 w-8 text-muted-foreground/60" />
              )}
            </div>
            {/* Two lines, always: a shorter name leaves the space empty, a longer one is clipped. */}
            <p
              className="line-clamp-2 mt-1 h-10 w-full shrink-0 break-words px-2 text-sm font-medium leading-5"
              title={localName(item.menuName, item.menuNameArb)}
            >
              {localName(item.menuName, item.menuNameArb)}
            </p>
            {item.isSoldOut && (
              // Floated over the tile so showing it never changes the tile's height.
              <span className="absolute start-1 top-1 z-10 rounded bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-destructive-foreground">
                {tr("menuSoldOut")}
              </span>
            )}
            <p className="mt-auto w-full shrink-0 truncate px-2 text-sm font-semibold tabular-nums text-primary">
              {formatMoney(item.sellingPrice, currency, locale)}
            </p>
          </Card>
        ))}
        {visibleItems.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">{t("noProductsFound")}</p>
        )}
      </div>

      <ImageUploadDialog
        open={!!imageDialogItem}
        onOpenChange={(open) => !open && setImageDialogItem(null)}
        imageUrl={imageDialogItem?.imagePath}
        uploading={uploadImageMutation.isPending || removeImageMutation.isPending}
        onUpload={(file) => uploadImageMutation.mutate(file)}
        onRemove={() => removeImageMutation.mutate()}
      />
    </div>
  );
}
