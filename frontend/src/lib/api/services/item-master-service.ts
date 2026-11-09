import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import { taxMasterService } from "@/lib/api/services/tax-master-service";
import type { ItemCostStock, ItemMaster } from "@/types/item-master";
import type { ItemMasterFormValues } from "@/schemas/masters.schema";

// Real BCorDFWebApi InventoryMasterController — a much richer master (~80
// fields, built for a concrete/RMC-batching-plant business line) reused here
// as Item Master's actual backing store, per explicit instruction to stop
// using Items/ItemCategory and use InventoryMaster/InventoryCatMaster
// instead. /api/Items itself is left fully intact and untouched — just no
// longer called from here. Only the handful of retail-relevant fields below
// are read/written; every other InventoryMaster field stays null/default.
interface InventoryMasterDto {
  id: string;
  code: string;
  inventoryName: string;
  inventoryDetails?: string | null;
  inventoryCatCode?: string | null;
  unitCode?: string | null;
  barCode?: string | null;
  imageUrl?: string | null;
  tagPrice?: number | null;
  retailPrice?: number | null;
  retailPrice2?: number | null;
  unitCost?: number | null;
  brandCode?: string | null;
  taxCode?: string | null;
  taxRate?: number | null;
  compID: string;
  siteID: string;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
  active: boolean;
  isWeighted: boolean;
  pluCode?: string | null;
  // Pre-existing InventoryMaster detail collection — alternate units with a
  // conversion factor relative to `unitCode` (the base/stocking unit). `id`
  // is a real server Guid here (unlike the master's own `id`/`code` split),
  // since detail rows have no separate business-key code of their own.
  uoMs: {
    id: string;
    unitCode: string;
    convertionFactor: number;
    unitName?: string | null;
    barCode?: string | null;
    tagPrice?: number | null;
    retailPrice?: number | null;
    retailPrice2?: number | null;
  }[];
  // Supplier rows (InventoryMasterVendorDetails). `id` is the row's real Guid.
  vendorDetails?: {
    id: string;
    vendorCode: string;
    unitCode?: string | null;
    price?: number | null;
    vendorItemRef?: string | null;
    vendorItemName?: string | null;
    vendorItemNameArb?: string | null;
    remarks?: string | null;
    remarksArb?: string | null;
  }[];
}

// `id` on ItemMaster is deliberately set to the item's Code (the real,
// stable business key the backend's PUT/DELETE routes address by), not the
// server-generated Guid ID — same convention as every other master.
//
// PUT returns 204 No Content (see MasterController.Update), so `dto` is
// empty on an update response — every field below tolerates that rather
// than throwing, since the caller only actually needs a populated entity
// back from create.
function toItemMaster(dto: InventoryMasterDto): ItemMaster {
  return {
    id: dto.code,
    code: dto.code,
    name: dto.inventoryName,
    description: dto.inventoryDetails,
    categoryCode: dto.inventoryCatCode,
    unitCode: dto.unitCode,
    barCode: dto.barCode,
    imagePath: dto.imageUrl,
    price: dto.retailPrice,
    tagPrice: dto.tagPrice,
    wholesalePrice: dto.retailPrice2,
    costPrice: dto.unitCost,
    brandCode: dto.brandCode,
    taxCode: dto.taxCode,
    taxRate: dto.taxRate,
    compID: dto.compID,
    siteID: dto.siteID,
    lastModifiedBy: dto.lastModifiedBy,
    lastModifiedOn: dto.lastModifiedOn,
    active: dto.active,
    isWeighted: dto.isWeighted,
    pluCode: dto.pluCode,
    uoms: (dto.uoMs ?? []).map((u) => ({
      id: u.id,
      unitCode: u.unitCode,
      conversionFactor: u.convertionFactor,
      unitName: u.unitName,
      barCode: u.barCode,
      tagPrice: u.tagPrice,
      retailPrice: u.retailPrice,
      wholesalePrice: u.retailPrice2,
    })),
    vendors: (dto.vendorDetails ?? []).map((v) => ({
      id: v.id,
      vendorCode: v.vendorCode,
      unitCode: v.unitCode,
      price: v.price,
      vendorItemRef: v.vendorItemRef,
      vendorItemName: v.vendorItemName,
      vendorItemNameArb: v.vendorItemNameArb,
      remarks: v.remarks,
      remarksArb: v.remarksArb,
    })),
  };
}

// InventoryMaster requires a few fields the Item Master screen doesn't
// expose (its 5 child detail collections, InventoryType) — same
// "withDefaults" pattern used for Promotion/Loyalty masters reusing a richer
// pre-existing backend this session. InventoryType is capped at 5 chars in
// the DB (a construction-industry classification code), hence "ITEM".
function buildPayload(payload: ItemMasterFormValues, compId: string, userName: string, taxRate: number) {
  return {
    code: payload.code,
    compID: compId,
    siteID: payload.siteId,
    active: payload.active,
    lastModifiedBy: userName,
    inventoryName: payload.name,
    inventoryDetails: payload.description || null,
    inventoryCatCode: payload.categoryCode || null,
    unitCode: payload.unitCode || "",
    barCode: payload.barCode || null,
    retailPrice: payload.price,
    tagPrice: payload.tagPrice ?? null,
    retailPrice2: payload.wholesalePrice ?? null,
    unitCost: payload.costPrice ?? null,
    brandCode: payload.brandCode?.trim() || null,
    taxCode: payload.taxCode || "",
    taxRate,
    isWeighted: payload.isWeighted,
    pluCode: payload.pluCode || null,
    inventoryType: "ITEM",
    // `id` present → the backend's detail-sync updates that existing row;
    // absent (a row just added in the UI) → it inserts a new one. Any
    // existing row left out of this array gets deleted — see
    // MasterDetailCollectionHandler.SyncForUpdate.
    uoMs: payload.uoms.map((u) => ({
      id: u.id || undefined,
      unitCode: u.unitCode,
      convertionFactor: u.conversionFactor,
      barCode: u.barCode || null,
      tagPrice: u.tagPrice ?? null,
      retailPrice: u.retailPrice ?? null,
      retailPrice2: u.wholesalePrice ?? null,
    })),
    vendorDetails: payload.vendors.map((v) => ({
      id: v.id || undefined,
      vendorCode: v.vendorCode,
      unitCode: v.unitCode || null,
      price: v.price ?? null,
      vendorItemRef: v.vendorItemRef || null,
      vendorItemName: v.vendorItemName || null,
      vendorItemNameArb: v.vendorItemNameArb || null,
      remarks: v.remarks || null,
      remarksArb: v.remarksArb || null,
    })),
  };
}

// The Update DTO maps every field onto the stored item and treats any detail
// row missing from the body as deleted. The Item Master form only edits a
// handful of fields, so an update starts from the item's current record and
// overlays the form on top — otherwise every save would blank the ~70 other
// InventoryMaster fields (cost, reorder level, GL codes, ...) and delete its
// bin locations, BOM and related items. (Same approach as the menu, vendor
// and customer forms.)
type RawDto = Record<string, unknown>;
function stripDetailRowMeta(row: RawDto): RawDto {
  const { masterID, rowID, ...rest } = row;
  void masterID;
  void rowID;
  return rest;
}

// No manual Tax Rate % input on Item Master anymore — Tax Code is picked
// from Tax Master (see tax-master-service.ts) and the rate is resolved from
// there on every save, so a later rate change in Tax Master is picked up the
// next time the item is edited/re-saved. The resolved value is still
// snapshotted onto InventoryMaster.TaxRate itself (not looked up live at
// billing time) so POS scan/cart/invoice code needs no changes.
async function resolveTaxRate(compId: string, taxCode: string | undefined): Promise<number> {
  if (!taxCode) return 0;
  const taxCodes = await taxMasterService.getTaxCodes(compId);
  return taxCodes.find((t) => t.code === taxCode)?.taxRate ?? 0;
}

export const itemMasterService = {
  list: async (): Promise<{ items: ItemMaster[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<InventoryMasterDto[]>(`/InventoryMaster/${compId}`);
    const items = data.map(toItemMaster);
    return { items, total: items.length };
  },

  create: async (payload: ItemMasterFormValues): Promise<ItemMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const taxRate = await resolveTaxRate(compId, payload.taxCode);
    const { data } = await apiClient.post<InventoryMasterDto>(
      "/InventoryMaster",
      { ...buildPayload(payload, compId, user?.userName ?? "", taxRate), binLocations: [], boMs: [], relatedInventories: [] },
      { headers: { CompID: compId } },
    );
    return toItemMaster(data);
  },

  update: async (code: string, payload: ItemMasterFormValues): Promise<ItemMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const taxRate = await resolveTaxRate(compId, payload.taxCode);
    const { data: current } = await apiClient.get<RawDto>(`/InventoryMaster/${compId}/${code}`);
    const { id, lastModifiedOn, binLocations, boMs, relatedInventories, ...rest } = current;
    void id;
    void lastModifiedOn;
    const { data } = await apiClient.put<InventoryMasterDto>(
      `/InventoryMaster/${code}`,
      {
        ...rest,
        ...buildPayload(payload, compId, user?.userName ?? "", taxRate),
        binLocations: ((binLocations as RawDto[]) ?? []).map(stripDetailRowMeta),
        boMs: ((boMs as RawDto[]) ?? []).map(stripDetailRowMeta),
        relatedInventories: ((relatedInventories as RawDto[]) ?? []).map(stripDetailRowMeta),
      },
      { headers: { CompID: compId } },
    );
    return toItemMaster(data);
  },

  // Stock quantity, average cost and last purchase cost for the Item Master form.
  getCostStock: async (code: string, siteId?: string): Promise<ItemCostStock> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<ItemCostStock>(`/InventoryMaster/${compId}/${encodeURIComponent(code)}/cost-stock`, {
      params: siteId ? { siteId } : undefined,
    });
    return data;
  },

  // On-hand quantity per item at one branch (items with no stock movements are
  // absent — their stock is 0). Backs the Item Master list's Stock column.
  getBranchStock: async (siteId: string): Promise<Record<string, number>> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<{ inventoryCode: string; stockQty: number }[]>(`/InventoryMaster/${compId}/branch-stock`, {
      params: { siteId },
    });
    return Object.fromEntries(data.map((r) => [r.inventoryCode, r.stockQty]));
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/InventoryMaster/${compId}/${code}`, { params: { user: userName } });
  },
};
