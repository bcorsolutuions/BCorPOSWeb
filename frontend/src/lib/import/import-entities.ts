// Registry of everything the Import Data page can import. To add another
// master (Customers, Suppliers, ...): add a config here AND a matching
// IMasterImporter on the backend (BCorDFWebApi/Service/Import) with the same
// `key` — the page, template download, validation preview and results table
// are all driven by this config and need no other change.

export interface ImportColumn {
  /** Exact header used in the template and sent to the API. */
  key: string;
  required?: boolean;
  /** Value shown in the template's example row. */
  example: string;
  /** What to enter — shown in the on-page column guide. */
  description: string;
  /** Other header spellings accepted when reading a file (matched ignoring case/spaces/punctuation). */
  aliases?: string[];
}

export interface ImportEntityConfig {
  /** Backend importer key: POST api/Import/{compId}/{key}. */
  key: string;
  /** i18n key (namespace "import") for the entity name. */
  labelKey: string;
  /** i18n key (namespace "import") for the one-line explanation. */
  descriptionKey: string;
  columns: ImportColumn[];
  /** Show the "create missing categories and units" option (only meaningful where rows reference them). */
  supportsCreateMissing?: boolean;
  /** Where "see it in the app" links to after an import. */
  listHref: string;
  /** Query keys to refresh after a real import so the master grids show the new rows. */
  invalidateKeys: string[];
}

export const IMPORT_ENTITIES: ImportEntityConfig[] = [
  {
    key: "items",
    labelKey: "entityItems",
    descriptionKey: "entityItemsHint",
    supportsCreateMissing: true,
    listHref: "/masters/items",
    invalidateKeys: ["item-master", "item-master-categories", "item-master-units", "item-category-master"],
    columns: [
      { key: "Code", required: true, example: "SKU-1001", description: "Item code / SKU, up to 15 characters. An existing code is updated.", aliases: ["SKU", "ItemCode"] },
      { key: "Name", required: true, example: "Gel Pen Blue", description: "Item name, up to 150 characters.", aliases: ["ItemName"] },
      { key: "NameArabic", example: "قلم جل أزرق", description: "Arabic name (optional).", aliases: ["NameArb"] },
      { key: "Description", example: "0.5mm gel ink pen", description: "Description, up to 500 characters." },
      { key: "CategoryCode", example: "PEN", description: "Item category code (up to 10). Must be a category without sub categories — use a sub category's code if the main category has them.", aliases: ["Category"] },
      { key: "CategoryName", example: "Pens", description: "Only used when the category code doesn't exist yet and 'create missing' is on." },
      { key: "UnitCode", required: true, example: "PCS", description: "Base unit code (up to 5). Required for a new item.", aliases: ["Unit", "BaseUnit"] },
      { key: "UnitName", example: "Pieces", description: "Only used when the unit code doesn't exist yet and 'create missing' is on." },
      { key: "Barcode", example: "6291000000011", description: "Barcode, up to 50 characters. Must not be used by another item or unit.", aliases: ["BarCode"] },
      { key: "PluCode", example: "", description: "PLU for weighed items.", aliases: ["PLU"] },
      { key: "IsWeighted", example: "N", description: "Y if sold by weight, otherwise N.", aliases: ["Weighted"] },
      { key: "TaxCode", example: "VAT", description: "Tax code from Tax Master; the rate is taken from it.", aliases: ["Tax"] },
      { key: "TagPrice", example: "1.500", description: "Tag price (optional)." },
      { key: "RetailPrice", example: "1.250", description: "Retail price — the price POS bills at.", aliases: ["SellingPrice", "Price"] },
      { key: "WholesalePrice", example: "1.000", description: "Wholesale price (optional).", aliases: ["RetailPrice2"] },
      { key: "Active", example: "Y", description: "Y or N. Blank keeps the current value (new items are active)." },
    ],
  },
  {
    key: "item-categories",
    labelKey: "entityCategories",
    descriptionKey: "entityCategoriesHint",
    listHref: "/masters/item-categories",
    invalidateKeys: ["item-category-master", "item-master-categories"],
    columns: [
      { key: "Code", required: true, example: "PEN", description: "Category code, up to 10 characters. An existing code is updated." },
      { key: "Name", required: true, example: "Pens", description: "Category name, up to 100 characters." },
      { key: "NameArabic", example: "أقلام", description: "Arabic name (optional).", aliases: ["NameArb"] },
      { key: "Description", example: "Writing instruments", description: "Description (optional)." },
      { key: "ParentCode", example: "", description: "Code of the main category this is a sub category of. Leave blank for a main category. The parent must be a main category.", aliases: ["Parent", "ParentCategory"] },
      { key: "Active", example: "Y", description: "Y or N. Blank keeps the current value (new categories are active)." },
    ],
  },
  {
    key: "units",
    labelKey: "entityUnits",
    descriptionKey: "entityUnitsHint",
    listHref: "/masters/units",
    invalidateKeys: ["unit-master", "item-master-units"],
    columns: [
      { key: "Code", required: true, example: "PCS", description: "Unit code, up to 5 characters. An existing code is updated." },
      { key: "Name", required: true, example: "Pieces", description: "Unit name, up to 25 characters." },
      { key: "Abbreviation", example: "pcs", description: "Abbreviation (optional)." },
      { key: "Active", example: "Y", description: "Y or N. Blank keeps the current value (new units are active)." },
    ],
  },
  {
    key: "item-uoms",
    labelKey: "entityItemUoms",
    descriptionKey: "entityItemUomsHint",
    supportsCreateMissing: true,
    listHref: "/masters/items",
    invalidateKeys: ["item-master"],
    columns: [
      { key: "ItemCode", required: true, example: "SKU-1001", description: "Code of an existing item — import the item first.", aliases: ["Code", "SKU"] },
      { key: "UnitCode", required: true, example: "BOX", description: "The alternate unit's code (up to 5). Must differ from the item's base unit.", aliases: ["Unit"] },
      { key: "UnitName", example: "Box", description: "Only used when the unit code doesn't exist yet and 'create missing' is on." },
      { key: "ConversionFactor", required: true, example: "12", description: "How many base units are in this unit (e.g. 12 pieces in a box). Required for a new row.", aliases: ["Factor", "Conversion"] },
      { key: "Barcode", example: "6291000000028", description: "This unit's own barcode (optional, up to 25).", aliases: ["BarCode"] },
      { key: "TagPrice", example: "18.000", description: "Tag price for this unit (optional)." },
      { key: "RetailPrice", example: "15.000", description: "Retail price for this unit (optional).", aliases: ["SellingPrice", "Price"] },
      { key: "WholesalePrice", example: "12.000", description: "Wholesale price for this unit (optional).", aliases: ["RetailPrice2"] },
    ],
  },
];

export function getImportEntity(key: string | null | undefined): ImportEntityConfig {
  return (IMPORT_ENTITIES.find((e) => e.key === key) ?? IMPORT_ENTITIES[0]) as ImportEntityConfig;
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Maps each file header to a template column (by key or alias, ignoring case/spaces/punctuation). */
export function matchColumns(
  config: ImportEntityConfig,
  headers: string[],
): { indexByKey: Record<string, number>; unknownHeaders: string[]; missingRequired: string[] } {
  const lookup = new Map<string, string>();
  for (const col of config.columns) {
    lookup.set(normalize(col.key), col.key);
    for (const alias of col.aliases ?? []) {
      if (!lookup.has(normalize(alias))) lookup.set(normalize(alias), col.key);
    }
  }

  const indexByKey: Record<string, number> = {};
  const unknownHeaders: string[] = [];
  headers.forEach((h, i) => {
    if (!h.trim()) return;
    const key = lookup.get(normalize(h));
    if (key && !(key in indexByKey)) indexByKey[key] = i;
    else if (!key) unknownHeaders.push(h.trim());
  });

  const missingRequired = config.columns.filter((c) => c.required && !(c.key in indexByKey)).map((c) => c.key);
  return { indexByKey, unknownHeaders, missingRequired };
}

/** Header + example rows. Example rows start with "#", which the reader ignores, so leaving them in the file is harmless. */
export function templateRows(config: ImportEntityConfig): string[][] {
  const headers = config.columns.map((c) => c.key);
  const example = config.columns.map((c, i) => (i === 0 ? `#${c.example}` : c.example));
  return [headers, example];
}
