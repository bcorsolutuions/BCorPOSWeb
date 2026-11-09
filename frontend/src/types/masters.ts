import type { AuditFields, EntityStatus } from "./common";

export interface Item extends AuditFields {
  id: string;
  sku: string;
  barcode: string;
  nameEn: string;
  nameAr: string;
  categoryId: string;
  categoryName?: string;
  unitOfMeasure: string;
  costPrice: number;
  sellingPrice: number;
  taxRuleId: string;
  isWeighted: boolean;
  isBatchTracked: boolean;
  isSerialTracked: boolean;
  reorderLevel: number;
  status: EntityStatus;
}

export interface Customer extends AuditFields {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  phone: string;
  email?: string;
  groupId?: string;
  groupName?: string;
  creditLimit: number;
  loyaltyPoints: number;
  status: EntityStatus;
}

export interface Supplier extends AuditFields {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  phone: string;
  email?: string;
  taxRegistrationNo?: string;
  paymentTermsDays: number;
  status: EntityStatus;
}
