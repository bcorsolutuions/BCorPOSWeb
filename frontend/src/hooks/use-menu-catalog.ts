import { useQuery } from "@tanstack/react-query";
import { restaurantLookupService } from "@/lib/api/services/restaurant-lookup-service";

// The menu the order screens browse: main categories → sub categories →
// items. Query keys match what each order screen used before, so the cache
// stays shared and MenuGrid's photo upload still invalidates "menu-items".
export function useMenuCatalog(compId: string, siteId: string) {
  const enabled = !!compId && !!siteId;

  const { data: categories = [] } = useQuery({
    queryKey: ["menu-categories", compId, siteId],
    queryFn: () => restaurantLookupService.getMenuCategories(compId, siteId),
    enabled,
  });
  const { data: subCategories = [] } = useQuery({
    queryKey: ["menu-sub-categories", compId, siteId],
    queryFn: () => restaurantLookupService.getMenuSubCategories(compId, siteId),
    enabled,
  });
  const { data: items = [] } = useQuery({
    queryKey: ["menu-items", compId, siteId],
    queryFn: () => restaurantLookupService.getMenuItems(compId, siteId),
    enabled,
  });

  return { categories, subCategories, items };
}
