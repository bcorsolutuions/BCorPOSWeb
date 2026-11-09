// Real Customer Master types — camelCase, matching BCorDFWebApi's actual
// CustomerMasterController/CustomerMasterDto (see
// D:\Works\BCorApi\PowerDFWebApi\Dto\Masters\CustomerMasterDto.cs). Deliberately
// separate from the fictional `Customer`/`customerService` in types/masters.ts +
// masters-service.ts. Mirrors types/item-master.ts's pattern.
//
// Note: the real CustomerMasterDto has ~50 address/delivery/tax fields plus
// three child detail collections (ContactsDetails, CreditDetails, OpBillsDets).
// This type only surfaces the subset the admin grid/form actually edits —
// customer-master-service.ts preserves the rest (including detail collections)
// on every update so nothing gets silently dropped. See that file's comment.
export interface CustomerMaster {
  id: string;
  code: string;
  custName: string;
  custNameArabic?: string | null;
  custCatCode?: string | null;
  mobile1?: string | null;
  telephone1?: string | null;
  email?: string | null;
  creditLimit?: number | null;
  compID: string;
  siteID: string;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
  active: boolean;
}

// Real Customer Category Master — BCorDFWebApi's CustomerCatMasterController
// (api/CustomerCatMaster/{compId}), keyed by (CompID, Code), Models/Masters
// namespace. Confirmed live via user-provided curl against
// api/CustomerCatMaster/{compId}.
//
// Note: there's a second, separate "CustomerCategories" entity (api/CustomerCategories,
// Models/VanSales/Service/MobVans) with a simpler shape (Name, Description,
// DiscountPercentage) — mirrors the ItemCategory pattern. Both tables physically
// exist in the DB, but the user's live curl confirmed CustomerCatMaster (this
// one) is the one actually in use — don't confuse the two.
export interface CustomerCategoryMaster {
  code: string;
  custCatName: string;
  custCatNameArb?: string | null;
  parentCode?: string | null;
  glCode?: string | null;
  remarks?: string | null;
  compID: string;
  siteID: string;
  active: boolean;
}
