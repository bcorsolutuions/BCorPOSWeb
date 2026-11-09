import { createCrudService } from "../crud-service-factory";
import type { Item, Customer, Supplier } from "@/types/masters";
import type { ItemFormValues, CustomerFormValues, SupplierFormValues } from "@/schemas/masters.schema";

export const itemService = createCrudService<Item, ItemFormValues>("/inventory/products");
export const customerService = createCrudService<Customer, CustomerFormValues>("/crm/customers");
export const supplierService = createCrudService<Supplier, SupplierFormValues>(
  "/purchase/suppliers",
);
