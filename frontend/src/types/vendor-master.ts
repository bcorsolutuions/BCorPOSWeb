// Real Vendor (Supplier) Master types — camelCase, matching BCorDFWebApi's
// actual VendorMasterController/VendorMasterDto (see
// D:\Works\BCorApi\PowerDFWebApi\Dto\Masters\VendorMasterDto.cs). Deliberately
// separate from the fictional `Supplier`/`supplierService` in types/masters.ts +
// masters-service.ts. Mirrors types/customer-master.ts's pattern exactly —
// VendorMaster has the same shape (~40 fields + 3 child detail collections:
// OpBillsDets, PaymentDetails, ProductDetails). This type only surfaces the
// subset the admin grid/form actually edits — vendor-master-service.ts
// preserves everything else (including detail collections) on every update.
//
// `VendorCatCode` is browsable via VendorCategoryMaster below (VendorCatMasterController).
export interface VendorMaster {
  id: string;
  code: string;
  vendorName: string;
  vendorNameArb?: string | null;
  vendorCatCode?: string | null;
  mobile1?: string | null;
  email?: string | null;
  taxRegisterNo?: string | null;
  creditPeriod?: number | null;
  compID: string;
  siteID: string;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
  active: boolean;
}

// Real Vendor Category Master — BCorDFWebApi's VendorCatMasterController
// (api/VendorCatMaster/{compId}), keyed by (CompID, Code), Models/Masters
// namespace — same shape/pattern as CustomerCatMaster.
export interface VendorCategoryMaster {
  code: string;
  vendorCatName: string;
  parentCode?: string | null;
  glCode?: string | null;
  remarks?: string | null;
  compID: string;
  siteID: string;
  active: boolean;
}
