/**
 * Column rules for the Global Catalogue Excel import.
 *
 * The import accepts exactly the fields the Add Product form has. A sheet with any other column
 * (salary, price, stock, ...) is refused as a whole, so unrelated spreadsheets never get imported.
 * The admin backend re-checks the same rules (bulkImportProducts).
 */

export type ImportField =
  | 'name' | 'itemCode' | 'category' | 'productType' | 'description' | 'quotationLimit'
  | 'size' | 'brand' | 'material' | 'grade' | 'colour' | 'warranty' | 'manufacturer' | 'unit' | 'application' | 'standard';

export interface ImportColumn {
  field: ImportField;
  /** Heading used in the template and in messages. */
  header: string;
  required: boolean;
  /** Other headings accepted for this column (compared after normalising). */
  aliases: string[];
  maxLength: number;
  /** Attribute key stored on the product, matching what Add Product saves. */
  attributeKey?: string;
  help: string;
  example: string;
}

export const IMPORT_COLUMNS: ImportColumn[] = [
  { field: 'name', header: 'Product Name', required: true, aliases: ['name', 'product', 'item name', 'product title'], maxLength: 200, help: 'Name shown in the catalogue.', example: 'Ball Bearing 6204 ZZ' },
  { field: 'category', header: 'Category', required: true, aliases: ['product category', 'category name'], maxLength: 100, help: 'An existing category name or code. A new name creates a new category.', example: 'Automobile & Auto Parts' },
  { field: 'productType', header: 'Product Type', required: true, aliases: ['type', 'item type'], maxLength: 100, help: 'Product type within the category.', example: 'Bearing' },
  { field: 'itemCode', header: 'Item Code', required: false, aliases: ['sku', 'code', 'product code', 'sku item code', 'item no', 'item number'], maxLength: 100, help: 'Optional unique code. An existing code gets "-E" added.', example: 'BRG-6204-ZZ' },
  { field: 'description', header: 'Description', required: false, aliases: ['product description', 'details'], maxLength: 5000, help: 'Optional product description.', example: 'Deep groove ball bearing with metal shields.' },
  { field: 'quotationLimit', header: 'Quotation Limit', required: false, aliases: ['quote limit', 'quotation qty', 'quotation quantity', 'quotation min qty'], maxLength: 10, help: 'Optional whole number. Orders of this quantity or more go through quotation.', example: '100' },
  { field: 'size', header: 'Size', required: false, aliases: ['dimensions'], maxLength: 200, attributeKey: 'Size', help: 'Optional.', example: '20 x 47 x 14 mm' },
  { field: 'brand', header: 'Brand', required: false, aliases: ['brand name'], maxLength: 200, attributeKey: 'Brand', help: 'Optional.', example: 'SKF' },
  { field: 'material', header: 'Material', required: false, aliases: [], maxLength: 200, attributeKey: 'material', help: 'Optional.', example: 'Chrome steel' },
  { field: 'grade', header: 'Grade', required: false, aliases: [], maxLength: 200, attributeKey: 'grade', help: 'Optional.', example: 'ABEC-1' },
  { field: 'colour', header: 'Colour', required: false, aliases: ['color'], maxLength: 200, attributeKey: 'Colour', help: 'Optional.', example: 'Silver' },
  { field: 'warranty', header: 'Warranty / Guarantee', required: false, aliases: ['warranty', 'guarantee', 'warranty guarantee'], maxLength: 200, attributeKey: 'Warranty / Guarantee', help: 'Optional.', example: '6 months' },
  { field: 'manufacturer', header: 'Manufacturer', required: false, aliases: ['make', 'manufactured by'], maxLength: 200, attributeKey: 'Manufacturer', help: 'Optional.', example: 'SKF India Ltd' },
  { field: 'unit', header: 'Unit', required: false, aliases: ['uom', 'unit of measure', 'unit of measurement'], maxLength: 50, attributeKey: 'Unit', help: 'Optional. Defaults to "nos" like Add Product.', example: 'nos' },
  { field: 'application', header: 'Application', required: false, aliases: ['applications', 'use'], maxLength: 200, attributeKey: 'application', help: 'Optional.', example: 'Electric motors, pumps' },
  { field: 'standard', header: 'Standard', required: false, aliases: ['standards'], maxLength: 200, attributeKey: 'standard', help: 'Optional.', example: 'ISO 15' },
];

export const MAX_IMPORT_ROWS = 5000;
export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
export const DEFAULT_UNIT = 'nos';

/** Headings people often add that do not belong in the catalogue, with the reason shown to the admin. */
const KNOWN_NON_CATALOGUE: Array<{ match: RegExp; reason: string }> = [
  { match: /^(price|mrp|rate|cost|selling price|unit price|amount|discount|discounted price)$/, reason: 'prices are set by each vendor when they list the product' },
  { match: /^(stock|stock quantity|quantity|qty|inventory|moq|minimum order quantity)$/, reason: 'stock and order quantities are set by each vendor' },
  { match: /^(gst|gst percentage|gst rate|tax|tax rate)$/, reason: 'GST is set by each vendor on their listing' },
  { match: /^(vendor|vendor name|supplier|seller)$/, reason: 'vendors attach themselves to catalogue products from the vendor portal' },
  { match: /^(image|images|image url|photo|picture)$/, reason: 'images are uploaded from the product drawer, not through the import' },
];

/** Lowercase, drop "*", "(required)/(optional)" notes and punctuation, collapse spaces. */
export function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\((required|optional|mandatory)\)/g, ' ')
    .replace(/[*]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const HEADER_LOOKUP = new Map<string, ImportColumn>();
for (const column of IMPORT_COLUMNS) {
  for (const name of [column.header, ...column.aliases]) HEADER_LOOKUP.set(normalizeHeader(name), column);
}

export interface ImportRow {
  sourceRow: number;
  name: string;
  itemCode: string;
  category: string;
  productType: string;
  description: string;
  quotationLimit: number | null;
  attributes: Record<string, string>;
}

export interface RowIssue {
  row: number;
  name: string;
  problems: string[];
}

export type ParseResult =
  | { ok: false; title: string; message: string; details?: string[] }
  | {
      ok: true;
      sheetName: string;
      columns: ImportColumn[];
      rows: ImportRow[];
      invalid: RowIssue[];
      warnings: string[];
    };

const SUPPORTED_LIST = IMPORT_COLUMNS.map((c) => c.header).join(', ');

/**
 * Validate the heading row and every data row of a sheet read with
 * XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false }).
 */
export function parseImportSheet(raw: unknown[][], sheetName: string): ParseResult {
  const firstRowIndex = raw.findIndex((r) => Array.isArray(r) && r.some((cell) => String(cell ?? '').trim() !== ''));
  if (firstRowIndex === -1) {
    return { ok: false, title: 'The sheet is empty', message: `"${sheetName}" has no headings or data. Download the template and fill in your products.` };
  }

  const headerCells = (raw[firstRowIndex] as unknown[]).map((cell) => String(cell ?? '').trim());
  const dataRows = raw.slice(firstRowIndex + 1);
  const width = Math.max(headerCells.length, ...dataRows.map((r) => (Array.isArray(r) ? r.length : 0)));

  const columnAt: Array<ImportColumn | null> = [];
  const unknown: string[] = [];
  const notCatalogue: string[] = [];
  const duplicates: string[] = [];
  const unnamedWithData: number[] = [];
  const seen = new Map<ImportField, string>();

  for (let c = 0; c < width; c++) {
    const heading = headerCells[c] ?? '';
    if (!heading) {
      columnAt[c] = null;
      if (dataRows.some((r) => Array.isArray(r) && String(r[c] ?? '').trim() !== '')) unnamedWithData.push(c);
      continue;
    }
    const column = HEADER_LOOKUP.get(normalizeHeader(heading));
    if (!column) {
      columnAt[c] = null;
      const known = KNOWN_NON_CATALOGUE.find((k) => k.match.test(normalizeHeader(heading)));
      if (known) notCatalogue.push(`"${heading}": ${known.reason}`);
      else unknown.push(heading);
      continue;
    }
    if (seen.has(column.field)) {
      duplicates.push(`"${heading}" (same as "${seen.get(column.field)}")`);
      columnAt[c] = null;
      continue;
    }
    seen.set(column.field, heading);
    columnAt[c] = column;
  }

  const missingRequired = IMPORT_COLUMNS.filter((c) => c.required && !seen.has(c.field)).map((c) => c.header);
  const recognised = seen.size;
  const columnLetter = (index: number) => {
    let n = index + 1, s = '';
    while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
    return s;
  };

  // Mostly unrelated headings: this is not a product file at all (e.g. a salary sheet).
  if (recognised < 2 || (missingRequired.length > 0 && unknown.length + notCatalogue.length >= recognised)) {
    return {
      ok: false,
      title: 'This file is not a product catalogue',
      message: `The headings in "${sheetName}" don't match the Global Catalogue format, so nothing can be imported. Use the import template, with headings in the first row.`,
      details: [
        `Headings found: ${headerCells.filter(Boolean).slice(0, 12).join(', ') || '(none)'}${headerCells.filter(Boolean).length > 12 ? ', …' : ''}`,
        `Required headings: ${IMPORT_COLUMNS.filter((c) => c.required).map((c) => c.header).join(', ')}`,
      ],
    };
  }

  const problems: string[] = [];
  if (missingRequired.length) problems.push(`Missing required column${missingRequired.length > 1 ? 's' : ''}: ${missingRequired.join(', ')}.`);
  if (unknown.length) problems.push(`Column${unknown.length > 1 ? 's' : ''} not part of the catalogue: ${unknown.map((h) => `"${h}"`).join(', ')}. Remove ${unknown.length > 1 ? 'them' : 'it'} or rename to a supported heading.`);
  for (const line of notCatalogue) problems.push(`Column ${line}. Remove this column.`);
  if (duplicates.length) problems.push(`Duplicate column${duplicates.length > 1 ? 's' : ''}: ${duplicates.join(', ')}.`);
  if (unnamedWithData.length) problems.push(`Column${unnamedWithData.length > 1 ? 's' : ''} ${unnamedWithData.map(columnLetter).join(', ')} ${unnamedWithData.length > 1 ? 'have' : 'has'} data but no heading.`);

  if (problems.length) {
    const onlyMissing = missingRequired.length > 0 && problems.length === 1;
    return {
      ok: false,
      title: onlyMissing ? 'Required columns are missing' : 'The file has columns the catalogue does not support',
      message: 'Only fields that exist in Add Product can be imported. Fix the columns below and upload again; no products were imported.',
      details: [...problems, `Supported headings: ${SUPPORTED_LIST}.`],
    };
  }

  const rows: ImportRow[] = [];
  const invalid: RowIssue[] = [];
  const codesInFile = new Map<string, number>();
  const warnings: string[] = [];

  dataRows.forEach((cells, i) => {
    if (!Array.isArray(cells) || cells.every((cell) => String(cell ?? '').trim() === '')) return; // blank row
    const sourceRow = firstRowIndex + i + 2; // 1-based Excel row number
    const values: Partial<Record<ImportField, string>> = {};
    columnAt.forEach((column, c) => {
      if (column) values[column.field] = String(cells[c] ?? '').replace(/\s+/g, ' ').trim();
    });
    // Descriptions may keep their line breaks.
    const descIndex = columnAt.findIndex((c) => c?.field === 'description');
    if (descIndex !== -1) values.description = String(cells[descIndex] ?? '').trim();

    const rowProblems: string[] = [];
    for (const column of IMPORT_COLUMNS) {
      const value = values[column.field] ?? '';
      if (column.required && !value) rowProblems.push(`${column.header} is empty`);
      if (value.length > column.maxLength) rowProblems.push(`${column.header} is longer than ${column.maxLength} characters`);
    }

    let quotationLimit: number | null = null;
    if (values.quotationLimit) {
      const n = Number(values.quotationLimit.replace(/,/g, ''));
      if (!Number.isInteger(n) || n < 1) rowProblems.push('Quotation Limit must be a whole number of 1 or more');
      else quotationLimit = n;
    }

    if (rowProblems.length) {
      invalid.push({ row: sourceRow, name: values.name || '(no name)', problems: rowProblems });
      return;
    }

    const attributes: Record<string, string> = {};
    for (const column of IMPORT_COLUMNS) {
      if (column.attributeKey && values[column.field]) attributes[column.attributeKey] = values[column.field] as string;
    }
    if (!attributes.Unit) attributes.Unit = DEFAULT_UNIT;

    const code = (values.itemCode ?? '').toLowerCase();
    if (code) codesInFile.set(code, (codesInFile.get(code) ?? 0) + 1);

    rows.push({
      sourceRow,
      name: values.name as string,
      itemCode: values.itemCode ?? '',
      category: values.category as string,
      productType: values.productType as string,
      description: values.description ?? '',
      quotationLimit,
      attributes,
    });
  });

  if (rows.length + invalid.length > MAX_IMPORT_ROWS) {
    return { ok: false, title: 'Too many rows', message: `The sheet has ${rows.length + invalid.length} product rows. Import at most ${MAX_IMPORT_ROWS} at a time by splitting the file.` };
  }
  if (rows.length === 0 && invalid.length === 0) {
    return { ok: false, title: 'No products found', message: `"${sheetName}" has the right headings but no product rows below them.` };
  }

  const repeated = [...codesInFile.values()].filter((n) => n > 1).length;
  if (repeated) warnings.push(`${repeated} item code${repeated > 1 ? 's appear' : ' appears'} more than once in the file; repeats will get a "-E" suffix.`);

  return { ok: true, sheetName, columns: columnAt.filter((c): c is ImportColumn => !!c), rows, invalid, warnings };
}
