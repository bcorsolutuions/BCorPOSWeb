"use client";

import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { comboMasterService, type Combo } from "@/lib/api/services/combo-master-service";
import { useComboFields } from "@/hooks/use-combo-fields";
import { ComboDetailEditor } from "@/components/masters/combo-detail-editor";
import { comboSchema, type ComboFormValues } from "@/schemas/combo-master.schema";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { ComboDetailDto } from "@/types/combo";

function componentCodeOf(d: ComboDetailDto): string {
  return d.componentType === "Inventory" ? d.inventoryCode ?? "" : d.componentType === "Service" ? d.serviceCode ?? "" : d.menuCode ?? "";
}

export default function ComboMasterPage() {
  const fields = useComboFields();

  return (
    <CrudDataGridPage<Combo, ComboFormValues>
      queryKey="combo-master"
      titleKey="combo.comboMaster"
      service={comboMasterService}
      schema={comboSchema}
      fields={fields}
      permission={PERMISSIONS.COMBO_MANAGE}
      createHref="/combos/new"
      defaultValues={{
        code: "",
        siteId: "",
        comboName: "",
        comboNameArb: "",
        menuCode: "",
        categoryCode: "",
        sellingPrice: 0,
        taxCode: "",
        taxPercent: undefined,
        validFrom: "",
        validTo: "",
        allowDiscount: true,
        allowItemSubstitution: false,
        remarks: "",
        active: true,
        details: [],
      }}
      toFormValues={(entity) => ({
        code: entity.code,
        siteId: entity.siteID,
        comboName: entity.comboName,
        comboNameArb: entity.comboNameArb ?? "",
        menuCode: entity.menuCode ?? "",
        categoryCode: entity.categoryCode ?? "",
        sellingPrice: entity.sellingPrice,
        taxCode: entity.taxCode ?? "",
        taxPercent: entity.taxPercent ?? undefined,
        validFrom: entity.validFrom ? entity.validFrom.slice(0, 10) : "",
        validTo: entity.validTo ? entity.validTo.slice(0, 10) : "",
        allowDiscount: entity.allowDiscount,
        allowItemSubstitution: entity.allowItemSubstitution,
        remarks: entity.remarks ?? "",
        active: entity.active,
        details: (entity.details ?? []).map((d) => ({
          id: d.id,
          groupNo: d.groupNo,
          groupName: d.groupName ?? "",
          componentType: d.componentType,
          componentCode: componentCodeOf(d),
          unitCode: d.unitCode ?? "",
          isOptional: d.isOptional,
          quantity: d.quantity,
          minimumSelection: d.minimumSelection,
          maximumSelection: d.maximumSelection,
          additionalPrice: d.additionalPrice,
          isDefault: d.isDefault,
          displayOrder: d.displayOrder,
        })),
      })}
      renderExtra={({ form }) => <ComboDetailEditor form={form} />}
      columns={[
        { dataField: "code", captionKey: "common.code", width: 100 },
        { dataField: "comboName", captionKey: "combo.comboName" },
        { dataField: "sellingPrice", captionKey: "combo.sellingPrice", dataType: "number", width: 120 },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
