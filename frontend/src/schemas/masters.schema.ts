import { z } from "zod";

export const itemSchema = z.object({
  sku: z.string().min(1, "validation.required"),
  barcode: z.string().min(1, "validation.required"),
  nameEn: z.string().min(1, "validation.required"),
  nameAr: z.string().min(1, "validation.required"),
  categoryId: z.string().min(1, "validation.required"),
  unitOfMeasure: z.string().min(1, "validation.required"),
  costPrice: z.coerce.number().min(0, "validation.mustBeZeroOrMore"),
  sellingPrice: z.coerce.number().min(0, "validation.mustBeZeroOrMore"),
  taxRuleId: z.string().min(1, "validation.required"),
  isWeighted: z.boolean().default(false),
  isBatchTracked: z.boolean().default(false),
  isSerialTracked: z.boolean().default(false),
  reorderLevel: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  status: z.enum(["Active", "Inactive"]).default("Active"),
});
export type ItemFormValues = z.infer<typeof itemSchema>;

// One alternate unit-of-measure row on Item Master (e.g. "Box = 12 PCS") —
// backs the uoms field array below, itself the pre-existing InventoryMaster
// UOMs detail collection (`uoMs` on the API). `id` is absent for a row just
// added in the UI and present for one loaded from an existing item; see
// item-master-service.ts's buildPayload for how that's turned back into
// insert-vs-update on save.
// A blank price box means "not set" (stored as NULL), not 0 — z.coerce alone
// would turn "" into 0, so blanks are turned into undefined first.
const optionalPrice = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
);

export const itemUomSchema = z.object({
  id: z.string().optional(),
  unitCode: z.string().min(1, "validation.required"),
  conversionFactor: z.coerce.number().gt(0, "validation.mustBePositive"),
  barCode: z.string().optional(),
  tagPrice: optionalPrice,
  retailPrice: optionalPrice,
  // Stored in the RetailPrice2 column (see InventoryMasterUOM.RetailPrice2).
  wholesalePrice: optionalPrice,
});
export type ItemUomFormValues = z.infer<typeof itemUomSchema>;

// One supplier row on Item Master (InventoryMaster's VendorDetails
// collection). `id` follows the same insert-vs-update rule as the UOM rows.
export const itemVendorSchema = z.object({
  id: z.string().optional(),
  vendorCode: z.string().min(1, "validation.required"),
  unitCode: z.string().optional(),
  price: optionalPrice,
  vendorItemRef: z.string().optional(),
  vendorItemName: z.string().optional(),
  vendorItemNameArb: z.string().optional(),
  remarks: z.string().optional(),
  remarksArb: z.string().optional(),
});
export type ItemVendorFormValues = z.infer<typeof itemVendorSchema>;

// Real Item Master form — backs masters/items/page.tsx against
// BCorDFWebApi's actual ItemsController (see types/item-master.ts).
// No `taxRate` field: Tax Code is picked from Tax Master (see taxMasterSchema
// below) and the rate is resolved from there at save time, not typed here —
// see item-master-service.ts's resolveTaxRate.
export const itemMasterSchema = z.object({
  code: z.string().min(1, "validation.required"),
  name: z.string().min(1, "validation.required"),
  description: z.string().optional(),
  categoryCode: z.string().optional(),
  unitCode: z.string().optional(),
  barCode: z.string().optional(),
  // `price` is the Retail Price (InventoryMaster.RetailPrice) — the price POS
  // bills at. Tag Price and Wholesale Price (RetailPrice2) are optional.
  price: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  tagPrice: optionalPrice,
  wholesalePrice: optionalPrice,
  costPrice: optionalPrice,
  brandCode: z.string().max(20).optional(),
  taxCode: z.string().optional(),
  siteId: z.string().min(1, "validation.required"),
  active: z.boolean().default(true),
  isWeighted: z.boolean().default(false),
  pluCode: z.string().optional(),
  uoms: z.array(itemUomSchema).default([]),
  vendors: z.array(itemVendorSchema).default([]),
});
export type ItemMasterFormValues = z.infer<typeof itemMasterSchema>;

// Real Item Category Master form — backs masters/item-categories/page.tsx
// against BCorDFWebApi's actual ItemCategoriesController (see
// types/item-master.ts's ItemCategoryMaster). Previously only a read-only
// dropdown lookup on Item Master — this is the actual CRUD screen to add one.
export const itemCategorySchema = z.object({
  code: z.string().min(1, "validation.required"),
  name: z.string().min(1, "validation.required"),
  description: z.string().optional(),
  parentCode: z.string().optional(),
  // GL Master codes ("__none__" = none chosen).
  inventoryGlCode: z.string().optional(),
  costGlCode: z.string().optional(),
  salesGlCode: z.string().optional(),
  // Carried through unchanged (see item-category-service buildPayload).
  glCode: z.string().optional(),
  salesGlCode2: z.string().optional(),
  costGlCode2: z.string().optional(),
  siteId: z.string().min(1, "validation.required"),
  active: z.boolean().default(true),
});
export type ItemCategoryFormValues = z.infer<typeof itemCategorySchema>;

// Real Tax Master form — backs masters/tax-codes/page.tsx against
// BCorDFWebApi's actual TaxMasterController (see types/item-master.ts's
// TaxMaster). Item Master's Tax Code dropdown reads this list; there is no
// manual tax-rate entry anywhere else in the app anymore.
export const taxMasterSchema = z.object({
  code: z.string().min(1, "validation.required"),
  taxName: z.string().min(1, "validation.required"),
  taxRate: z.coerce.number().min(0, "validation.mustBeZeroOrMore").max(100, "validation.mustBeZeroOrMore").default(0),
  siteId: z.string().min(1, "validation.required"),
  active: z.boolean().default(true),
});
export type TaxMasterFormValues = z.infer<typeof taxMasterSchema>;

// Real Unit Master form — backs masters/units/page.tsx against BCorDFWebApi's
// actual UnitMasterController (see types/item-master.ts's UnitMaster). Was
// previously only a read-only dropdown lookup on Item Master — this is the
// actual CRUD screen to add/edit one, same pattern as Item Category Master.
export const unitMasterSchema = z.object({
  code: z.string().min(1, "validation.required"),
  unitName: z.string().min(1, "validation.required"),
  abbreviation: z.string().optional(),
  siteId: z.string().min(1, "validation.required"),
  active: z.boolean().default(true),
});
export type UnitMasterFormValues = z.infer<typeof unitMasterSchema>;

// Real Customer Master form — backs masters/customers/page.tsx against
// BCorDFWebApi's actual CustomerMasterController (see types/customer-master.ts).
export const customerMasterSchema = z.object({
  // blank = the next automatic customer code (C00001, ...)
  code: z.string().optional(),
  custName: z.string().min(1, "validation.required"),
  custNameArabic: z.string().optional(),
  custCatCode: z.string().optional(),
  mobile1: z.string().optional(),
  email: z.string().email("validation.invalidEmail").optional().or(z.literal("")),
  creditLimit: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  siteId: z.string().min(1, "validation.required"),
  active: z.boolean().default(true),
});
export type CustomerMasterFormValues = z.infer<typeof customerMasterSchema>;

export const customerSchema = z.object({
  code: z.string().min(1, "validation.required"),
  name: z.string().min(1, "validation.required"),
  nameAr: z.string().min(1, "validation.required"),
  phone: z.string().min(6, "validation.tooShort"),
  email: z.string().email("validation.invalidEmail").optional().or(z.literal("")),
  groupId: z.string().optional(),
  creditLimit: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  status: z.enum(["Active", "Inactive"]).default("Active"),
});
export type CustomerFormValues = z.infer<typeof customerSchema>;

// Real Vendor (Supplier) Master form — backs masters/suppliers/page.tsx
// against BCorDFWebApi's actual VendorMasterController (see types/vendor-master.ts).
export const vendorMasterSchema = z.object({
  // blank = the next automatic supplier code (S00001, ...)
  code: z.string().optional(),
  vendorName: z.string().min(1, "validation.required"),
  vendorNameArb: z.string().optional(),
  vendorCatCode: z.string().optional(),
  mobile1: z.string().optional(),
  email: z.string().email("validation.invalidEmail").optional().or(z.literal("")),
  taxRegisterNo: z.string().optional(),
  creditPeriod: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(30),
  siteId: z.string().min(1, "validation.required"),
  active: z.boolean().default(true),
});
export type VendorMasterFormValues = z.infer<typeof vendorMasterSchema>;

// Real Reservation Master form — backs masters/reservations page against
// BCorDFWebApi's actual ReservationMasterController (see types/reservation.ts).
export const reservationSchema = z.object({
  code: z.string().min(1, "validation.required"),
  customerName: z.string().min(1, "validation.required"),
  customerPhone: z.string().min(6, "validation.tooShort"),
  partySize: z.coerce.number().min(1, "validation.required").default(2),
  reservationDateTime: z.string().min(1, "validation.required"),
  durationMinutes: z.coerce.number().min(15, "validation.mustBeZeroOrMore").default(60),
  status: z.enum(["Pending", "Confirmed", "Seated", "Cancelled", "NoShow"]).default("Pending"),
  siteId: z.string().min(1, "validation.required"),
  remarks: z.string().optional(),
});
export type ReservationFormValues = z.infer<typeof reservationSchema>;

export const supplierSchema = z.object({
  code: z.string().min(1, "validation.required"),
  name: z.string().min(1, "validation.required"),
  nameAr: z.string().min(1, "validation.required"),
  phone: z.string().min(6, "validation.tooShort"),
  email: z.string().email("validation.invalidEmail").optional().or(z.literal("")),
  taxRegistrationNo: z.string().optional(),
  paymentTermsDays: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(30),
  status: z.enum(["Active", "Inactive"]).default("Active"),
});
export type SupplierFormValues = z.infer<typeof supplierSchema>;

// Customer / Supplier category masters (CustomerCatMasterController / VendorCatMasterController): a category groups customers or suppliers
// (and can sit under a parent category). The GL account is optional.
export const customerCategorySchema = z.object({
  code: z.string().min(1, "validation.required"),
  custCatName: z.string().min(1, "validation.required"),
  custCatNameArb: z.string().optional(),
  parentCode: z.string().optional(),
  glCode: z.string().optional(),
  remarks: z.string().optional(),
  siteId: z.string().min(1, "validation.required"),
  active: z.boolean().default(true),
});
export type CustomerCategoryFormValues = z.infer<typeof customerCategorySchema>;

export const vendorCategorySchema = z.object({
  code: z.string().min(1, "validation.required"),
  vendorCatName: z.string().min(1, "validation.required"),
  parentCode: z.string().optional(),
  glCode: z.string().optional(),
  remarks: z.string().optional(),
  siteId: z.string().min(1, "validation.required"),
  active: z.boolean().default(true),
});
export type VendorCategoryFormValues = z.infer<typeof vendorCategorySchema>;
