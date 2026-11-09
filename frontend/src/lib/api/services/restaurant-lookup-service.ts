import { apiClient } from "../axios-client";
import type {
  CaptainDto,
  DiningTypeDto,
  FloorDto,
  KitchenDto,
  MenuCategoryDto,
  MenuItemDto,
  MenuSubCategoryDto,
  ModifierDto,
  ModifierGroupDto,
  OrderTypeDto,
  RestaurantTableDto,
  TableSectionDto,
  WaiterDto,
} from "@/types/restaurant";

// Read-only master lookups for the restaurant module, backed by
// BCorDFWebApi's generic MasterController<> per entity. Entities keyed
// (CompID, SiteID, Code) use the site-scoped GET added in
// RestaurantTableMasterController/FloorMasterController/etc (see
// D:\Works\BCorApi\PowerDFWebApi\Controllers\Masters\*.cs) — the generic
// GET /{compId} ignores SiteID and would mix sites together for these.
// Entities keyed (CompID, Code) only (Waiter/Captain/OrderType/DiningType/
// Modifier/ModifierGroup) use the plain GET /{compId}.
export const restaurantLookupService = {
  getFloors: async (compId: string, siteId: string): Promise<FloorDto[]> => {
    const { data } = await apiClient.get<FloorDto[]>(`/FloorMaster/${compId}/site/${siteId}`);
    return data;
  },

  getSections: async (compId: string, siteId: string): Promise<TableSectionDto[]> => {
    const { data } = await apiClient.get<TableSectionDto[]>(`/TableSectionMaster/${compId}/site/${siteId}`);
    return data;
  },

  getTables: async (compId: string, siteId: string): Promise<RestaurantTableDto[]> => {
    const { data } = await apiClient.get<RestaurantTableDto[]>(`/RestaurantTableMaster/${compId}/site/${siteId}`);
    return data;
  },

  getKitchens: async (compId: string, siteId: string): Promise<KitchenDto[]> => {
    const { data } = await apiClient.get<KitchenDto[]>(`/KitchenMaster/${compId}/site/${siteId}`);
    return data;
  },

  getMenuCategories: async (compId: string, siteId: string): Promise<MenuCategoryDto[]> => {
    const { data } = await apiClient.get<MenuCategoryDto[]>(`/MenuCategoryMaster/${compId}/site/${siteId}`);
    return data;
  },

  getMenuSubCategories: async (compId: string, siteId: string): Promise<MenuSubCategoryDto[]> => {
    const { data } = await apiClient.get<MenuSubCategoryDto[]>(`/MenuSubCategoryMaster/${compId}/site/${siteId}`);
    return data;
  },

  getMenuItems: async (compId: string, siteId: string): Promise<MenuItemDto[]> => {
    const { data } = await apiClient.get<MenuItemDto[]>(`/MenuMaster/${compId}/site/${siteId}`);
    return data;
  },

  getModifierGroups: async (compId: string): Promise<ModifierGroupDto[]> => {
    const { data } = await apiClient.get<ModifierGroupDto[]>(`/ModifierGroupMaster/${compId}`);
    return data;
  },

  getModifiers: async (compId: string): Promise<ModifierDto[]> => {
    const { data } = await apiClient.get<ModifierDto[]>(`/ModifierMaster/${compId}`);
    return data;
  },

  getWaiters: async (compId: string): Promise<WaiterDto[]> => {
    const { data } = await apiClient.get<WaiterDto[]>(`/WaiterMaster/${compId}`);
    return data;
  },

  getCaptains: async (compId: string): Promise<CaptainDto[]> => {
    const { data } = await apiClient.get<CaptainDto[]>(`/CaptainMaster/${compId}`);
    return data;
  },

  getOrderTypes: async (compId: string): Promise<OrderTypeDto[]> => {
    const { data } = await apiClient.get<OrderTypeDto[]>(`/OrderTypeMaster/${compId}`);
    return data;
  },

  getDiningTypes: async (compId: string): Promise<DiningTypeDto[]> => {
    const { data } = await apiClient.get<DiningTypeDto[]>(`/DiningTypeMaster/${compId}`);
    return data;
  },
};
