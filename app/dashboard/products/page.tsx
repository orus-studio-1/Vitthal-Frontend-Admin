'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  SlidersHorizontal,
  CheckCircle2,
  Loader2,
  Package2,
  ShieldAlert,
  Trash2,
  XCircle,
  X,
  Edit2,
  Save,
  FileText,
  Image as ImageIcon,
  Store,
  Eye,
  Info,
  Calendar,
  AlertCircle,
  BellRing,
  ArrowUpRight,
  Plus,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  TriangleAlert,
  Download,
  Ban,
} from 'lucide-react';
import DashboardLayout from '../../../components/dashboard-layout';
import { extractApiError, productAPI, type BulkImportResult } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { Product } from '../../../lib/types';
import {
  IMPORT_COLUMNS,
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ROWS,
  parseImportSheet,
  type ImportRow,
  type RowIssue,
} from '../../../lib/product-import';
import { NotionEditor } from '../../../components/notion-editor/NotionEditor';
import { RichDescriptionRenderer } from '../../../components/notion-editor/RichDescriptionRenderer';

// Type for pending vendor listings from /api/products/pending-vendor/all
interface PendingVendorListing {
  vendor_product_id: string;
  price: number | string;
  moq: number;
  stock_quantity: number;
  vendor_product_status: string;
  vendor_product_active: boolean;
  created_at: string;
  product_id: string;
  product_name: string;
  product_description?: string;
  product_approval_status: string;
  vendor_id: string;
  vendor_company_name: string;
  vendor_user_name: string;
  vendor_user_email: string;
  gst_percentage?: number;
}

type EditorRow = { id: string; key: string; value: string };
type VariantEditor = { id: string; persistedId?: string; name: string; sku: string; properties: EditorRow[] };

const editorId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const CATALOG_FIELDS: Array<{ label: string; keys: string[] }> = [
  { label: 'Size', keys: ['size'] },
  { label: 'Brand', keys: ['brand', 'brand_name', 'product_brand'] },
  { label: 'Grade', keys: ['grade'] },
  { label: 'Colour', keys: ['colour', 'color'] },
  { label: 'Warranty / Guarantee', keys: ['warranty', 'warranty_guarantee', 'guarantee'] },
  { label: 'Manufacturer', keys: ['manufacturer', 'manufactured_by'] },
  { label: 'Unit', keys: ['unit', 'uom', 'unit_of_measure'] },
];

function getCatalogValue(product: Product, keys: string[]) {
  const sources: Array<Record<string, unknown>> = [product as unknown as Record<string, unknown>, product.attributes || {}];
  if (product.specifications && !Array.isArray(product.specifications)) sources.push(product.specifications as Record<string, unknown>);
  for (const source of sources) {
    const normalized = Object.fromEntries(Object.entries(source).map(([key, value]) => [key.toLowerCase().replace(/[ _/-]/g, ''), value]));
    for (const key of keys) {
      const value = normalized[key.toLowerCase().replace(/[ _/-]/g, '')];
      if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
    }
  }
  if (Array.isArray(product.specifications)) {
    const spec: any = (product.specifications as any[]).find((entry: any) => keys.some((key: string) => String(entry?.key || entry?.spec_key || '').toLowerCase().replace(/[ _/-]/g, '') === key.toLowerCase().replace(/[ _/-]/g, '')));
    if (spec && (spec.value || spec.spec_value)) return String(spec.value || spec.spec_value).trim();
  }
  return '—';
}

function CatalogAttributeGrid({ product, wide = false }: { product: Product; wide?: boolean }) {
  return (
    <div className={`grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:grid-cols-3 ${wide ? 'lg:grid-cols-4' : ''}`}>
      {CATALOG_FIELDS.map(({ label, keys }) => (
        <div key={label} className="min-w-0">
          <p className="text-[10px] text-slate-500">{label}</p>
          <p className="truncate text-xs font-semibold text-slate-800">{getCatalogValue(product, keys)}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Excel import ────────────────────────────────────────────────────────────
type ImportResult = BulkImportResult;

/** SHA-256 of the file bytes, used by the server to refuse a file that was already imported. */
async function fingerprintFile(buffer: ArrayBuffer): Promise<string | null> {
  try {
    if (typeof crypto === 'undefined' || !crypto.subtle) return null;
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

function toImportPayload(rows: ImportRow[]) {
  return rows.map((r) => ({
    sourceRow: r.sourceRow,
    name: r.name,
    itemCode: r.itemCode || null,
    category: r.category,
    productType: r.productType,
    description: r.description,
    quotationLimit: r.quotationLimit,
    attributes: r.attributes,
  }));
}

interface ImportProblem {
  title: string;
  message: string;
  details?: string[];
}

const IMPORT_TEMPLATE_NAME = 'global-catalogue-import-template.xlsx';

async function downloadImportTemplate() {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const headers = IMPORT_COLUMNS.map((c) => (c.required ? `${c.header} *` : c.header));
  const products = XLSX.utils.aoa_to_sheet([headers]);
  products['!cols'] = IMPORT_COLUMNS.map((c) => ({ wch: Math.max(14, c.header.length + 4) }));
  XLSX.utils.book_append_sheet(wb, products, 'Products');

  const guide = XLSX.utils.aoa_to_sheet([
    ['Global Catalogue import guide'],
    ['Fill in the "Products" sheet: one product per row, headings in row 1. Columns marked * are required.'],
    ['Only the columns below are accepted. A file with any other column (e.g. Price, Stock, Salary) is refused.'],
    [],
    ['Column', 'Required', 'What to enter', 'Example'],
    ...IMPORT_COLUMNS.map((c) => [c.header, c.required ? 'Yes' : 'No', c.help, c.example]),
  ]);
  guide['!cols'] = [{ wch: 24 }, { wch: 10 }, { wch: 70 }, { wch: 32 }];
  XLSX.utils.book_append_sheet(wb, guide, 'Instructions');

  XLSX.writeFile(wb, IMPORT_TEMPLATE_NAME);
}

function ImportProblemBox({ problem }: { problem: ImportProblem }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 shrink-0 rounded-xl bg-white border border-red-100 flex items-center justify-center">
          <Ban className="h-4 w-4 text-red-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-red-800">{problem.title}</p>
          <p className="text-xs text-red-700 mt-0.5">{problem.message}</p>
          {problem.details && problem.details.length > 0 && (
            <ul className="mt-2.5 space-y-1.5">
              {problem.details.map((line) => (
                <li key={line} className="flex items-start gap-2 text-xs text-red-800">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-red-400" />
                  <span className="min-w-0 break-words">{line}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── BulkImportModal ────────────────────────────────────────────────────────
function BulkImportModal({
  onClose,
  onSuccess,
  knownCategories,
}: {
  onClose: () => void;
  onSuccess: () => void;
  knownCategories: Array<{ code?: string; label?: string }>;
}) {
  const [step, setStep] = useState<'pick' | 'preview' | 'importing' | 'done'>('pick');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [invalidRows, setInvalidRows] = useState<RowIssue[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [usedColumns, setUsedColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [previewTab, setPreviewTab] = useState<'ready' | 'existing' | 'issues'>('ready');
  const [fileHash, setFileHash] = useState<string | null>(null);
  // Server dry run: exactly what the import would do, including duplicates already in the catalogue.
  const [serverCheck, setServerCheck] = useState<ImportResult | null>(null);
  const [serverCheckFailed, setServerCheckFailed] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [problem, setProblem] = useState<ImportProblem | null>(null);
  const [importError, setImportError] = useState('');
  const [progress, setProgress] = useState(0);
  const [checking, setChecking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const knownCategoryKeys = new Set(
    knownCategories.flatMap((c) => [c.code, c.label]).filter(Boolean).map((v) => String(v).trim().toLowerCase())
  );

  const parseExcel = useCallback(async (file: File) => {
    setProblem(null);
    setImportError('');

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'xlsx' && extension !== 'xls') {
      setProblem({
        title: 'Unsupported file type',
        message: `"${file.name}" is not an Excel workbook. Upload a .xlsx or .xls file based on the import template.`,
      });
      return;
    }
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      setProblem({
        title: 'File is too large',
        message: `The file is ${(file.size / 1024 / 1024).toFixed(1)} MB. Upload at most 5 MB, or split it into smaller files.`,
      });
      return;
    }

    setChecking(true);
    try {
      // Loaded on demand to keep the page bundle small.
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      let wb;
      try {
        wb = XLSX.read(buffer, { type: 'array' });
      } catch {
        setProblem({
          title: 'The file could not be read',
          message: 'It may be damaged or password-protected. Open it in Excel, save it again as .xlsx and retry.',
        });
        return;
      }

      // The template keeps products on a "Products" sheet; otherwise the first sheet is used.
      const chosen = wb.SheetNames.find((n) => n.trim().toLowerCase() === 'products') ?? wb.SheetNames[0];
      if (!chosen) {
        setProblem({ title: 'The workbook has no sheets', message: 'Download the template and fill in your products.' });
        return;
      }
      const raw = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[chosen], { header: 1, defval: '', raw: false, blankrows: true });
      const parsed = parseImportSheet(raw, chosen);

      if (!parsed.ok) {
        setProblem({ title: parsed.title, message: parsed.message, details: parsed.details });
        return;
      }

      // Check against the catalogue before showing the preview (nothing is saved).
      const hash = await fingerprintFile(buffer);
      let check: ImportResult | null = null;
      let checkFailed = false;
      if (parsed.rows.length > 0) {
        try {
          const res = await productAPI.bulkImport(toImportPayload(parsed.rows), { fileHash: hash, fileName: file.name, dryRun: true });
          check = res.data.data;
        } catch (err) {
          const data = (err as { response?: { status?: number; data?: { message?: string; data?: { duplicateFile?: boolean } } } }).response;
          if (data?.status === 409 && data.data?.data?.duplicateFile) {
            setProblem({
              title: 'This file has already been imported',
              message: data.data.message || 'This exact file was imported before. Importing it again would create duplicates.',
              details: ['To add more products, put only the new rows in a file and upload that.'],
            });
            return;
          }
          checkFailed = true;
        }
      }

      setFileHash(hash);
      setServerCheck(check);
      setServerCheckFailed(checkFailed);
      setRows(parsed.rows);
      setInvalidRows(parsed.invalid);
      setWarnings(parsed.warnings);
      setUsedColumns(parsed.columns.map((c) => c.header));
      setFileName(file.name);
      setSheetName(chosen);
      setPreviewTab(parsed.rows.length === 0 ? 'issues' : check && check.imported === 0 && check.skipped > 0 ? 'existing' : 'ready');
      setStep('preview');
    } catch (err) {
      console.error(err);
      setProblem({ title: 'The file could not be checked', message: 'Something went wrong while reading the file. Please try again.' });
    } finally {
      setChecking(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void parseExcel(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void parseExcel(file);
  };

  const resetToPick = () => {
    setStep('pick');
    setRows([]);
    setInvalidRows([]);
    setWarnings([]);
    setFileName('');
    setImportError('');
    setServerCheck(null);
    setServerCheckFailed(false);
    setFileHash(null);
  };

  const handleImport = async () => {
    setStep('importing');
    setProgress(-1); // indeterminate while waiting for the server
    setImportError('');
    try {
      const res = await productAPI.bulkImport(toImportPayload(rows), { fileHash, fileName });
      setProgress(100);
      setResult(res.data.data);
      setStep('done');
    } catch (err) {
      setImportError(extractApiError(err, 'Import failed. Please check your data and try again.'));
      setStep('preview');
    }
  };

  const categoryBreakdown = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1;
    return acc;
  }, {});
  const newCategories = serverCheck?.createdCategories
    ?? Object.keys(categoryBreakdown).filter((c) => !knownCategoryKeys.has(c.trim().toLowerCase()));
  const skippedRowNumbers = new Set((serverCheck?.skippedRows ?? []).map((s) => s.row));
  const serverErrorRows = (serverCheck?.errors ?? []).filter((e) => !invalidRows.some((i) => i.row === e.row));
  const serverErrorNumbers = new Set(serverErrorRows.map((e) => e.row));
  const readyRows = rows.filter((r) => !skippedRowNumbers.has(r.sourceRow) && !serverErrorNumbers.has(r.sourceRow));
  const problemRows: RowIssue[] = [
    ...invalidRows,
    ...serverErrorRows.map((e) => ({ row: e.row, name: e.name, problems: [e.reason] })),
  ].sort((a, b) => a.row - b.row);
  const existingRows = serverCheck?.skippedRows ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Import from Excel</h2>
              <p className="text-xs text-slate-500">
                {step === 'pick' && 'Upload a product catalogue file based on the import template'}
                {step === 'preview' && `${fileName} · sheet "${sheetName}"`}
                {step === 'importing' && 'Importing products to the Global Catalogue...'}
                {step === 'done' && 'Import complete'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6">

          {/* STEP 1: File picker */}
          {step === 'pick' && (
            <div className="space-y-4">
              {problem && <ImportProblemBox problem={problem} />}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => !checking && fileInputRef.current?.click()}
                className={`group flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-10 transition-all duration-200 ${
                  checking ? 'cursor-wait opacity-70' : 'cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40'
                }`}
              >
                <div className="h-16 w-16 rounded-2xl bg-white border border-slate-200 group-hover:border-emerald-200 shadow-sm flex items-center justify-center transition">
                  {checking ? (
                    <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-8 w-8 text-slate-400 group-hover:text-emerald-500 transition" />
                  )}
                </div>
                <div className="text-center">
                  <p className="font-semibold text-slate-700">{checking ? 'Checking the file...' : 'Drop your Excel file here'}</p>
                  <p className="text-xs text-slate-400 mt-1">or click to browse · .xlsx or .xls · up to {MAX_IMPORT_ROWS.toLocaleString()} products, 5 MB</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Accepted columns</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Only these fields from Add Product can be imported. Files with any other column are refused.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void downloadImportTemplate()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700 transition"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download template
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {IMPORT_COLUMNS.map((c) => (
                    <span
                      key={c.field}
                      className={`text-[11px] font-semibold rounded-full px-2.5 py-1 border ${
                        c.required ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {c.header}{c.required ? ' *' : ''}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-slate-400">* required. Prices, stock and GST are set by vendors, not in the catalogue.</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}

          {/* STEP 2: Preview */}
          {step === 'preview' && (
            <div className="space-y-5">
              {importError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {importError}
                </div>
              )}

              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>
                  File format verified. Columns used: <strong>{usedColumns.join(', ')}</strong>
                </span>
              </div>

              {serverCheckFailed && (
                <p className="flex items-center gap-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Couldn&apos;t check this file against the catalogue right now. Products that already exist will still be skipped during the import.
                </p>
              )}

              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-center">
                  <p className="text-2xl font-black text-emerald-700">{readyRows.length}</p>
                  <p className="text-xs text-emerald-600 font-semibold mt-0.5">New Products</p>
                </div>
                <div className={`rounded-2xl p-4 text-center border ${existingRows.length ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                  <p className={`text-2xl font-black ${existingRows.length ? 'text-amber-700' : 'text-slate-400'}`}>{existingRows.length}</p>
                  <p className={`text-xs font-semibold mt-0.5 ${existingRows.length ? 'text-amber-700' : 'text-slate-500'}`}>Already in Catalogue</p>
                </div>
                <div className={`rounded-2xl p-4 text-center border ${problemRows.length ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                  <p className={`text-2xl font-black ${problemRows.length ? 'text-red-700' : 'text-slate-400'}`}>{problemRows.length}</p>
                  <p className={`text-xs font-semibold mt-0.5 ${problemRows.length ? 'text-red-600' : 'text-slate-500'}`}>Rows with Problems</p>
                </div>
                <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 text-center">
                  <p className="text-2xl font-black text-blue-700">{Object.keys(categoryBreakdown).length}</p>
                  <p className="text-xs text-blue-600 font-semibold mt-0.5">Categories</p>
                </div>
              </div>

              {/* Category breakdown */}
              {rows.length > 0 && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Category Breakdown</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(categoryBreakdown).map(([cat, count]) => {
                      const isNew = newCategories.includes(cat);
                      return (
                        <span
                          key={cat}
                          className={`text-xs font-semibold border rounded-full px-3 py-1 ${
                            isNew ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          {cat} <span className={isNew ? 'text-amber-500' : 'text-slate-400'}>({count})</span>
                          {isNew && <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide">New</span>}
                        </span>
                      );
                    })}
                  </div>
                  {newCategories.length > 0 && (
                    <p className="mt-3 text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                      {newCategories.length} categor{newCategories.length > 1 ? 'ies' : 'y'} will be <strong>created</strong> with 0% commission.
                      No vendor has {newCategories.length > 1 ? 'them' : 'it'} yet, so vendors must request access before listing these products.
                    </p>
                  )}
                </div>
              )}

              {warnings.map((w) => (
                <p key={w} className="flex items-center gap-2 text-[11px] text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-slate-400" /> {w}
                </p>
              ))}

              {/* Tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewTab('ready')}
                  className={`rounded-xl px-4 py-2 text-xs font-bold border transition ${
                    previewTab === 'ready' ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  New ({readyRows.length})
                </button>
                <button
                  onClick={() => setPreviewTab('existing')}
                  disabled={existingRows.length === 0}
                  className={`rounded-xl px-4 py-2 text-xs font-bold border transition disabled:opacity-40 ${
                    previewTab === 'existing' ? 'bg-amber-600 border-amber-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Already in Catalogue ({existingRows.length})
                </button>
                <button
                  onClick={() => setPreviewTab('issues')}
                  disabled={problemRows.length === 0}
                  className={`rounded-xl px-4 py-2 text-xs font-bold border transition disabled:opacity-40 ${
                    previewTab === 'issues' ? 'bg-red-600 border-red-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Problems ({problemRows.length})
                </button>
              </div>

              {previewTab === 'ready' ? (
                readyRows.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">
                    {existingRows.length > 0 && problemRows.length === 0
                      ? 'Every product in this file is already in the catalogue. There is nothing new to import.'
                      : 'No new products to import. Fix the problems in the file and upload it again.'}
                  </p>
                ) : (
                  <div className="rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto max-h-80">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0">
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">Row</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">Item Code</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">Product Name</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">Category</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">Type</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">Brand</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">Quote Limit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {readyRows.map((row) => (
                            <tr key={row.sourceRow} className="hover:bg-slate-50 transition">
                              <td className="px-4 py-2.5 text-slate-400 font-mono">{row.sourceRow}</td>
                              <td className="px-4 py-2.5 font-mono text-slate-600">{row.itemCode || '—'}</td>
                              <td className="px-4 py-2.5 font-semibold text-slate-900 max-w-[200px] truncate">{row.name}</td>
                              <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{row.category}</td>
                              <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{row.productType}</td>
                              <td className="px-4 py-2.5 text-slate-500">{row.attributes.Brand || '—'}</td>
                              <td className="px-4 py-2.5 text-slate-500">{row.quotationLimit ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              ) : previewTab === 'existing' ? (
                <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3 space-y-2 max-h-80 overflow-y-auto">
                  {existingRows.map((item) => (
                    <div key={item.row} className="flex items-start gap-3 text-xs rounded-xl bg-white border border-amber-100 px-3 py-2.5">
                      <span className="font-mono font-bold text-amber-600 shrink-0">Row {item.row}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                        <p className="text-amber-800 mt-0.5">{item.reason}</p>
                        {item.existingName && (
                          <p className="text-slate-500 mt-0.5">
                            Existing product: <span className="font-semibold text-slate-700">{item.existingName}</span>
                            {item.existingItemCode ? <span className="font-mono"> · {item.existingItemCode}</span> : null}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-red-100 bg-red-50/60 p-3 space-y-2 max-h-80 overflow-y-auto">
                  {problemRows.map((issue) => (
                    <div key={issue.row} className="flex items-start gap-3 text-xs rounded-xl bg-white border border-red-100 px-3 py-2.5">
                      <span className="font-mono font-bold text-red-500 shrink-0">Row {issue.row}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{issue.name}</p>
                        <p className="text-red-600 mt-0.5">{issue.problems.join(' · ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(problemRows.length > 0 || existingRows.length > 0) && readyRows.length > 0 && (
                <p className="text-[11px] text-slate-500">
                  Only the {readyRows.length} new product{readyRows.length > 1 ? 's are' : ' is'} imported. Products already in the catalogue are never added twice;
                  rows with problems are skipped and can be fixed and imported later.
                </p>
              )}
            </div>
          )}

          {/* STEP 3: Importing (progress) */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-6">
              <div className="relative h-20 w-20">
                <svg className="animate-spin h-20 w-20 text-emerald-100" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                </svg>
                <svg className="absolute inset-0 animate-spin h-20 w-20 text-emerald-500" viewBox="0 0 24 24" fill="none" style={{ animationDuration: '0.8s' }}>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <FileSpreadsheet className="absolute inset-0 m-auto h-8 w-8 text-emerald-600" />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-800 text-lg">Importing {readyRows.length} products...</p>
                <p className="text-sm text-slate-500 mt-1">Sending to server — this takes a moment over remote DB</p>
              </div>
              <div className="w-full max-w-sm">
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  {progress === 100 ? (
                    // Fully complete
                    <div className="h-full w-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" />
                  ) : (
                    // Indeterminate shimmer — moves continuously while waiting
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500"
                      style={{
                        width: '45%',
                        animation: 'indeterminate-bar 1.4s ease-in-out infinite',
                        backgroundSize: '200% 100%',
                      }}
                    />
                  )}
                </div>
                <p className="text-xs text-center text-slate-400 mt-2">
                  {progress === 100 ? 'Done!' : 'Processing...'}
                </p>
              </div>
              {/* Inject keyframes for the indeterminate animation */}
              <style>{`
                @keyframes indeterminate-bar {
                  0%   { transform: translateX(-100%); width: 45%; }
                  50%  { width: 60%; }
                  100% { transform: translateX(260%); width: 45%; }
                }
              `}</style>
            </div>
          )}

          {/* STEP 4: Result */}
          {step === 'done' && result && (
            <div className="space-y-5">
              {/* Result summary */}
              <div className={`rounded-2xl p-5 border ${
                result.failed === 0
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-amber-50 border-amber-200'
              }`}>
                <div className="flex items-center gap-3 mb-3">
                  {result.failed === 0 ? (
                    <CheckCircle className="h-7 w-7 text-emerald-500" />
                  ) : (
                    <TriangleAlert className="h-7 w-7 text-amber-500" />
                  )}
                  <div>
                    <p className={`font-bold text-lg ${
                      result.failed === 0 ? 'text-emerald-700' : 'text-amber-700'
                    }`}>
                      {result.failed > 0
                        ? 'Import partially complete'
                        : result.skipped > 0
                          ? 'New products imported'
                          : 'All products imported!'}
                    </p>
                    <p className="text-sm text-slate-600">
                      <span className="font-bold text-emerald-700">{result.imported}</span> imported successfully
                      {result.skipped > 0 && (
                        <>, <span className="font-bold text-amber-700">{result.skipped}</span> already in the catalogue</>
                      )}
                      {result.failed > 0 && (
                        <>, <span className="font-bold text-red-600">{result.failed}</span> failed</>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {(result.createdCategories?.length || result.skipped > 0) ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs text-slate-700">
                  {result.createdCategories && result.createdCategories.length > 0 && (
                    <p><span className="font-bold">New categories created:</span> {result.createdCategories.join(', ')}</p>
                  )}
                  {result.skipped > 0 && (
                    <div>
                      <p className="font-bold mb-1">Not added because they are already in the catalogue ({result.skipped}):</p>
                      <div className="max-h-32 overflow-y-auto space-y-0.5">
                        {result.skippedRows.map((s) => (
                          <p key={s.row}><span className="font-mono text-slate-500">Row {s.row}</span> · {s.name} · <span className="text-slate-500">{s.reason}</span></p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                Imported products are live in the Global Catalogue and vendors can list them right away.
                They show on the client portal once an approved vendor has listed them, same as products added by hand.
              </p>

              {/* Error list */}
              {result.errors.length > 0 && (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                  <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-3">Failed Rows</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {result.errors.map((err) => (
                      <div key={err.row} className="flex items-start gap-2 text-xs rounded-xl bg-white border border-red-100 px-3 py-2">
                        <span className="font-mono text-red-500 shrink-0">Row {err.row}</span>
                        <span className="font-semibold text-slate-700 shrink-0">{err.name}</span>
                        <span className="text-red-600 min-w-0">{err.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-slate-100 bg-slate-50/50">
          {step === 'preview' ? (
            <button
              onClick={resetToPick}
              className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition"
            >
              ← Pick different file
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            {(step === 'pick' || step === 'preview') && (
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
            )}
            {step === 'preview' && (
              <button
                onClick={handleImport}
                disabled={readyRows.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="h-4 w-4" />
                {readyRows.length === rows.length && problemRows.length === 0
                  ? `Import All ${readyRows.length} Products`
                  : `Import ${readyRows.length} New Product${readyRows.length === 1 ? '' : 's'}`}
              </button>
            )}
            {step === 'done' && (
              <button
                onClick={() => { onSuccess(); onClose(); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold shadow-md transition"
              >
                <CheckCircle2 className="h-4 w-4" />
                Done — View Products
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [showImportModal, setShowImportModal] = useState(false);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [pendingListings, setPendingListings] = useState<PendingVendorListing[]>([]);
  const [pendingVariants, setPendingVariants] = useState<any[]>([]);
  const [pendingModifications, setPendingModifications] = useState<any[]>([]);
  const [pendingDeletions, setPendingDeletions] = useState<any[]>([]);
  const [pendingImages, setPendingImages] = useState<any[]>([]);
  const [categoriesOptions, setCategoriesOptions] = useState<any[]>([]);
  const [productTypes, setProductTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return; // wait for auth before loading dropdowns
    async function loadCats() {
      try {
        const response = await productAPI.getCategories();
        if (response.data?.data) {
          setCategoriesOptions(response.data.data);
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    }
    async function loadTypes() {
      try {
        const response = await productAPI.getProductTypes();
        if (response.data?.data) {
          setProductTypes(response.data.data);
        }
      } catch (err) {
        console.error("Failed to load product types:", err);
      }
    }
    loadCats();
    loadTypes();
  }, [isAuthenticated]);

  // Selected product / details drawer states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Edit form states
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editProductType, setEditProductType] = useState('');
  const [editAttributes, setEditAttributes] = useState<{ id: string; key: string; value: string; }[]>([]);
  const [editItemCode, setEditItemCode] = useState('');
  const [editQuotationLimit, setEditQuotationLimit] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [specificationDrafts, setSpecificationDrafts] = useState<EditorRow[]>([]);
  const [variantDrafts, setVariantDrafts] = useState<VariantEditor[]>([]);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mutationBusy, setMutationBusy] = useState('');
  const mediaInputRef = useRef<HTMLInputElement | null>(null);

  const hydrateEditor = (product: Product) => {
    setEditName(product.name || '');
    setEditDescription(product.description || '');
    setEditCategory(product.category || '');
    setEditProductType(product.product_type || '');
    setEditItemCode(product.item_code || '');
    setEditQuotationLimit(product.quotation_limit ? String(product.quotation_limit) : '');
    setEditIsActive(product.is_active !== false);
    const editAttributeValues = { ...(product.attributes || {}) } as Record<string, unknown>;
    CATALOG_FIELDS.forEach(({ label, keys }) => {
      const value = getCatalogValue(product, keys);
      if (value !== '—' && !Object.keys(editAttributeValues).some((key) => key.toLowerCase().replace(/[ _/-]/g, '') === label.toLowerCase().replace(/[ _/-]/g, ''))) {
        editAttributeValues[label] = value;
      }
    });
    setEditAttributes(Object.entries(editAttributeValues).map(([key, value]) => ({
      id: editorId('attr'), key, value: String(value ?? ''),
    })));
    setSpecificationDrafts((product.detailed_specifications || []).map((spec) => ({
      id: spec.id, key: spec.spec_key, value: spec.spec_value || '',
    })));
    setVariantDrafts((product.variants || []).map((variant) => ({
      id: variant.id,
      persistedId: variant.id,
      name: variant.name || '',
      sku: variant.sku || '',
      properties: Object.entries(variant.properties || {}).map(([key, value]) => ({
        id: editorId('variant-property'), key, value: String(value ?? ''),
      })),
    })));
  };

  async function fetchProducts() {
    try {
      setLoading(true);
      setError('');
      
      // Fetch products, pending listings, and pending variants in parallel
      const [productsRes, listingsRes, variantsRes, modificationsRes, deletionsRes, imagesRes] = await Promise.all([
        productAPI.getAll(),
        productAPI.getPendingVendorProducts(),
        productAPI.getPendingVariants(),
        productAPI.getPendingModifications().catch(() => ({ data: { data: [] } })),
        productAPI.getPendingDeletions().catch(() => ({ data: { data: [] } })),
        productAPI.getPendingImages().catch(() => ({ data: { data: [] } }))
      ]);
      
      setProducts(productsRes.data.data);
      setPendingListings(listingsRes.data.data || []);
      setPendingVariants(variantsRes.data.data || []);
      setPendingModifications(modificationsRes.data?.data || []);
      setPendingDeletions(deletionsRes.data?.data || []);
      setPendingImages(imagesRes.data?.data || []);
    } catch (productsError) {
      setError(extractApiError(productsError, 'Failed to load products'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (isAuthenticated) {
      const timer = window.setTimeout(() => {
        void fetchProducts();
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [authLoading, isAuthenticated, router]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product? All vendor listings, images, and specifications for it will also be deleted.')) {
      return;
    }
    try {
      await productAPI.delete(id);
      setIsDrawerOpen(false);
      await fetchProducts();
    } catch (deleteError) {
      setError(extractApiError(deleteError, 'Failed to delete product'));
    }
  };

  const handleReview = async (id: string, decision: 'approved' | 'rejected') => {
    try {
      setError('');
      await productAPI.review(id, decision);
      if (selectedProduct?.id === id) {
        await handleRefreshDrawer(id);
      } else {
        await fetchProducts();
      }
    } catch (reviewError) {
      setError(extractApiError(reviewError, `Failed to ${decision} product`));
    }
  };

  // Drawer interactions
  const handleOpenDrawer = async (product: Product) => {
    try {
      setError('');
      setSelectedProduct(product);
      setIsDrawerOpen(true);
      setDrawerLoading(true);
      setEditMode(false);

      hydrateEditor(product);

      const response = await productAPI.getById(product.id);
      const fetchedProduct = response.data.data;
      setSelectedProduct(fetchedProduct);
      hydrateEditor(fetchedProduct);
    } catch (err) {
      setError(extractApiError(err, 'Failed to load product details'));
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleRefreshDrawer = async (id: string) => {
    try {
      const response = await productAPI.getById(id);
      setSelectedProduct(response.data.data);
      hydrateEditor(response.data.data);
      await fetchProducts();
    } catch (err) {
      setError(extractApiError(err, 'Failed to refresh product details'));
    }
  };

  const handleSaveDetails = async () => {
    if (!selectedProduct) return;
    try {
      setDrawerLoading(true);

      const attributesPayload: Record<string, string> = {};
      editAttributes.forEach((attr) => {
        const k = attr.key.trim();
        if (k) {
          attributesPayload[k] = attr.value.trim();
        }
      });

      await productAPI.update(selectedProduct.id, {
        name: editName,
        description: editDescription,
        category: editCategory,
        productType: editProductType,
        attributes: attributesPayload,
        itemCode: editItemCode.trim() || null,
        quotationLimit: editQuotationLimit ? Number(editQuotationLimit) : null,
        is_active: editIsActive,
      });
      setEditMode(false);
      await handleRefreshDrawer(selectedProduct.id);
    } catch (err) {
      setError(extractApiError(err, 'Failed to update product details'));
    } finally {
      setDrawerLoading(false);
    }
  };

  const saveSpecifications = async () => {
    if (!selectedProduct) return;
    const specifications = specificationDrafts
      .map(({ key, value }) => ({ key: key.trim(), value: value.trim() }))
      .filter(({ key }) => key);
    try {
      setMutationBusy('specifications');
      setError('');
      await productAPI.replaceSpecifications(selectedProduct.id, specifications);
      await handleRefreshDrawer(selectedProduct.id);
    } catch (err) {
      setError(extractApiError(err, 'Failed to update specifications'));
    } finally {
      setMutationBusy('');
    }
  };

  const uploadMedia = async () => {
    if (!selectedProduct || !mediaFiles.length) return;
    try {
      setMutationBusy('media');
      setError('');
      const formData = new FormData();
      formData.append('productId', selectedProduct.id);
      mediaFiles.forEach((file) => formData.append('images', file));
      await productAPI.uploadProductImages(formData);
      setMediaFiles([]);
      if (mediaInputRef.current) mediaInputRef.current.value = '';
      await handleRefreshDrawer(selectedProduct.id);
    } catch (err) {
      setError(extractApiError(err, 'Failed to upload product images'));
    } finally {
      setMutationBusy('');
    }
  };

  const deleteMedia = async (imageId: string) => {
    if (!selectedProduct || !confirm('Delete this image permanently?')) return;
    try {
      setMutationBusy(`image-${imageId}`);
      await productAPI.deleteProductImage(imageId);
      await handleRefreshDrawer(selectedProduct.id);
    } catch (err) {
      setError(extractApiError(err, 'Failed to delete image'));
    } finally {
      setMutationBusy('');
    }
  };

  const makePrimary = async (imageId: string) => {
    if (!selectedProduct) return;
    try {
      setMutationBusy(`image-${imageId}`);
      await productAPI.setPrimaryImage(selectedProduct.id, imageId);
      await handleRefreshDrawer(selectedProduct.id);
    } catch (err) {
      setError(extractApiError(err, 'Failed to set primary image'));
    } finally {
      setMutationBusy('');
    }
  };

  const saveVariant = async (variant: VariantEditor) => {
    if (!selectedProduct) return;
    const properties = Object.fromEntries(variant.properties
      .map(({ key, value }) => [key.trim(), value.trim()])
      .filter(([key]) => key));
    try {
      setMutationBusy(`variant-${variant.id}`);
      if (variant.persistedId) {
        await productAPI.updateProductVariant(variant.persistedId, { name: variant.name.trim() || null, sku: variant.sku.trim() || null, properties });
      } else {
        await productAPI.addProductVariant({ productId: selectedProduct.id, name: variant.name.trim() || null, sku: variant.sku.trim() || null, properties });
      }
      await handleRefreshDrawer(selectedProduct.id);
    } catch (err) {
      setError(extractApiError(err, 'Failed to save variant'));
    } finally {
      setMutationBusy('');
    }
  };

  const deleteVariant = async (variant: VariantEditor) => {
    if (!selectedProduct) return;
    if (!variant.persistedId) {
      setVariantDrafts((current) => current.filter((item) => item.id !== variant.id));
      return;
    }
    if (!confirm('Delete this product variant?')) return;
    try {
      setMutationBusy(`variant-${variant.id}`);
      await productAPI.deleteProductVariant(variant.persistedId);
      await handleRefreshDrawer(selectedProduct.id);
    } catch (err) {
      setError(extractApiError(err, 'Failed to delete variant'));
    } finally {
      setMutationBusy('');
    }
  };

  const handleReviewImage = async (imageId: string, decision: 'approved' | 'rejected') => {
    if (!selectedProduct) return;
    try {
      await productAPI.reviewImage(imageId, decision);
      await handleRefreshDrawer(selectedProduct.id);
    } catch (err) {
      setError(extractApiError(err, `Failed to ${decision} image`));
    }
  };

  const handleReviewVendorProduct = async (vpId: string, decision: 'approved' | 'rejected') => {
    try {
      await productAPI.reviewVendorProduct(vpId, decision);
      if (selectedProduct) {
        await handleRefreshDrawer(selectedProduct.id);
      } else {
        await fetchProducts();
      }
    } catch (err) {
      setError(extractApiError(err, `Failed to ${decision} vendor listing`));
    }
  };

  
  const handleReviewModification = async (id: string, decision: 'approved' | 'rejected') => {
    try {
      setError('');
      await productAPI.reviewPendingModification(id, decision);
      await fetchProducts();
    } catch (reviewError) {
      setError(extractApiError(reviewError, `Failed to ${decision} product modification`));
    }
  };

  const handleReviewDeletion = async (id: string, decision: 'approved' | 'rejected') => {
    if (decision === 'approved' && !confirm('Delete this vendor listing? This cannot be undone.')) return;
    try {
      setError('');
      await productAPI.reviewPendingDeletion(id, decision);
      await fetchProducts();
    } catch (reviewError) {
      setError(extractApiError(reviewError, 'Failed to review the deletion request'));
    }
  };

  const handleReviewVariant = async (variantId: string, decision: 'approved' | 'rejected') => {
    try {
      setError('');
      await productAPI.reviewProductVariant(variantId, decision);
      if (selectedProduct) {
        await handleRefreshDrawer(selectedProduct.id);
      } else {
        await fetchProducts();
      }
    } catch (err) {
      setError(extractApiError(err, `Failed to ${decision} variant`));
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
      </div>
    );
  }

  // Segment products
  // Products made by an admin or super admin belong to the admin list, whoever's account it was.
  const isAdminCreated = (product: Product) =>
    !product.created_by_user_id || product.creator_role === 'admin' || product.creator_role === 'super_admin';
  const vendorProducts = products.filter(
    (product) =>
      !isAdminCreated(product) &&
      (product.creator_role === 'vendor' ||
        Boolean(product.created_by_vendor_id) ||
        Boolean(product.created_by_user_id))
  );
  const adminProducts = products.filter(
    (product) => !vendorProducts.some((vp) => vp.id === product.id)
  );
  const pendingVendorProducts = vendorProducts.filter(
    (product) => product.approval_status === 'pending'
  );

  return (
    <>
    <DashboardLayout>
      <div className="relative space-y-6">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {/* 🚨 QUEUE 1: NEW PRODUCT APPROVALS (HIGH PRIORITY) */}
        <section className="rounded-[1.75rem] border border-rose-200 bg-white p-6 shadow-[0_12px_32px_rgba(244,63,94,0.06)] relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 bg-rose-500/5 rounded-full blur-2xl -mr-8 -mt-8" />
          
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">🚨 Product Approval Queue</h2>
                <p className="text-sm text-slate-500">New vendor products awaiting catalog verification.</p>
              </div>
            </div>
            <div className="self-start sm:self-center rounded-full bg-rose-50 border border-rose-200 px-3 py-1 font-mono text-xs font-bold text-rose-700">
              {pendingVendorProducts.length} Awaiting Review
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
            </div>
          ) : pendingVendorProducts.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingVendorProducts.map((product) => (
                <article
                  key={product.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 hover:border-rose-300 hover:bg-white transition-all shadow-xs duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-slate-900 line-clamp-1">{product.name}</h3>
                      <span className="shrink-0 text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-100 rounded-full px-2 py-0.5 uppercase tracking-wider">
                        New Product
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Creator: <span className="font-semibold text-slate-700">{product.creator_vendor_name || product.creator_name || 'Vendor'}</span>
                    </p>
                    <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {product.description || 'No description provided.'}
                    </p>
                    <CatalogAttributeGrid product={product} />
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenDrawer(product)}
                      className="text-xs font-bold text-blue-700 hover:text-blue-900 transition flex items-center gap-1"
                    >
                      Verify Details <ArrowUpRight className="h-4 w-4" />
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReview(product.id, 'approved')}
                        className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition shadow-xs"
                        title="Quick Approve Product"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleReview(product.id, 'rejected')}
                        className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition shadow-xs"
                        title="Quick Reject Product"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-400">
              Clear! No brand new products need approval.
            </p>
          )}
        </section>

        {/* 📢 QUEUE 2: CATALOG LINKING APPROVALS (HIGH PRIORITY) */}
        <section className="rounded-[1.75rem] border border-blue-200 bg-white p-6 shadow-[0_12px_32px_rgba(30,105,188,0.06)] relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 bg-blue-500/5 rounded-full blur-2xl -mr-8 -mt-8" />
          
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">📢 Catalogue Mapping Approvals</h2>
                <p className="text-sm text-slate-500">Vendors trying to sell existing approved catalog products.</p>
              </div>
            </div>
            <div className="self-start sm:self-center rounded-full bg-blue-50 border border-blue-200 px-3 py-1 font-mono text-xs font-bold text-blue-700">
              {pendingListings.length} Awaiting Activation
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : pendingListings.length ? (
            <div className="space-y-3">
              {pendingListings.map((listing) => (
                <article
                  key={listing.vendor_product_id}
                  className="rounded-2xl border border-slate-150 bg-slate-50/50 p-4 hover:border-blue-300 hover:bg-white transition-all shadow-xs duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                        {listing.vendor_company_name}
                      </span>
                      <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5 uppercase tracking-wider">
                        Catalogue Link
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      wants to sell: <span className="text-blue-700 underline cursor-pointer" onClick={() => handleOpenDrawer({ id: listing.product_id } as Product)}>{listing.product_name}</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Seller User: {listing.vendor_user_name} ({listing.vendor_user_email})
                    </p>
                  </div>

                  {/* B2B Specs & Direct Approve actions */}
                  <div className="flex flex-wrap items-center gap-4 self-stretch justify-between lg:justify-end">
                    <div className="grid grid-cols-4 gap-3 bg-white border border-slate-100 rounded-xl p-2.5 text-center text-xs font-medium min-w-[320px]">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-mono">Price</span>
                        <span className="font-bold text-slate-800">₹{listing.price}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-mono">MOQ</span>
                        <span className="font-bold text-slate-800">{listing.moq}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-mono">Stock</span>
                        <span className="font-bold text-slate-800">{listing.stock_quantity}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-mono">GST %</span>
                        <span className="font-bold text-slate-800">
                          {listing.gst_percentage !== null && listing.gst_percentage !== undefined ? `${listing.gst_percentage}%` : '0%'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReviewVendorProduct(listing.vendor_product_id, 'approved')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Activate
                      </button>
                      <button
                        onClick={() => handleReviewVendorProduct(listing.vendor_product_id, 'rejected')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-400">
              Clear! No sellers are waiting for catalog mapping activation.
            </p>
          )}
        </section>

        <section className="rounded-[1.75rem] border border-amber-200 bg-white p-6 shadow-[0_12px_32px_rgba(217,119,6,0.06)]">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Product Edit Approvals</h2>
              <p className="text-sm text-slate-500">Review vendor changes before updated product details become live.</p>
            </div>
            <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-mono text-xs font-bold text-amber-800">{pendingModifications.length} Under Review</div>
          </div>
          {loading ? <div className="flex justify-center py-8"><Loader2 className="h-7 w-7 animate-spin text-amber-600" /></div> : pendingModifications.length ? (
            <div className="space-y-4">
              {pendingModifications.map((request) => {
                const changes = request.pending_modifications || {};
                const fields: Array<[string, unknown, unknown, boolean]> = [
                  ['Product name', changes.current_product_fields?.name, changes.name, Boolean(changes.has_product_field_changes && changes.name !== undefined)],
                  ['Description', changes.current_product_fields?.description, changes.description, Boolean(changes.has_product_field_changes && changes.description !== undefined)],
                  ['Category', changes.current_product_fields?.category, changes.category, Boolean(changes.has_product_field_changes && changes.category !== undefined)],
                  ['Product type', changes.current_product_fields?.product_type, changes.product_type, Boolean(changes.has_product_field_changes && changes.product_type !== undefined)],
                  ['Item code', changes.current_product_fields?.item_code, changes.item_code, Boolean(changes.has_product_field_changes && changes.item_code !== undefined)],
                  ['Price', changes.current_price, changes.price ?? request.pending_price, Boolean(changes.is_price_changed || request.pending_price !== null)],
                  ['MOQ', changes.current_moq, changes.moq, Boolean(changes.is_moq_changed)],
                  ['Stock', changes.current_stock_quantity, changes.stock_quantity, Boolean(changes.is_stock_changed)],
                  ['GST', changes.current_gst_percentage, changes.gst_percentage, Boolean(changes.is_gst_changed)],
                  ['Variant', JSON.stringify(changes.current_variant_properties || {}), JSON.stringify(changes.variant_properties || {}), Boolean(changes.has_variant_changes)],
                ];
                const changedAttributes = Object.keys(changes.attributes || {}).filter((key) => changes.attributes[key] !== changes.current_attributes?.[key]);
                return (
                  <article key={request.vendor_product_id} className="rounded-2xl border border-amber-100 bg-amber-50/30 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900">{request.product_name || 'Product'}{request.variant_sku ? ` · ${request.variant_sku}` : ''}</h3>
                        <p className="mt-1 text-xs text-slate-500">Vendor: {request.vendor_company_name || request.vendor_user_name || 'Vendor'} · {request.vendor_email || ''}</p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">Under Approval</span>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {fields.filter(([, , , changed]) => changed).map(([label, previous, proposed]) => (
                        <div key={label} className="rounded-xl border border-slate-100 bg-white p-3 text-xs">
                          <p className="font-semibold text-slate-500">{label}</p>
                          <p className="mt-1 text-slate-400 line-through">{previous === null || previous === undefined || previous === '' ? '—' : String(previous)}</p>
                          <p className="mt-1 font-semibold text-slate-900">{proposed === null || proposed === undefined || proposed === '' ? '—' : String(proposed)}</p>
                        </div>
                      ))}
                      {changedAttributes.map((key) => (
                        <div key={key} className="rounded-xl border border-slate-100 bg-white p-3 text-xs">
                          <p className="font-semibold capitalize text-slate-500">{key.replace(/_/g, ' ')}</p>
                          <p className="mt-1 text-slate-400 line-through">{String(changes.current_attributes?.[key] ?? '—')}</p>
                          <p className="mt-1 font-semibold text-slate-900">{String(changes.attributes[key] ?? '—')}</p>
                        </div>
                      ))}
                    </div>
                    {changes.has_specification_changes && <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3 text-xs"><p className="font-semibold text-slate-500">Proposed specifications</p><pre className="mt-2 whitespace-pre-wrap text-slate-800">{JSON.stringify(changes.specifications || {}, null, 2)}</pre></div>}
                    <div className="mt-4 flex justify-end gap-2">
                      <button onClick={() => handleReviewModification(request.vendor_product_id, 'rejected')} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"><XCircle className="h-4 w-4" /> Reject</button>
                      <button onClick={() => handleReviewModification(request.vendor_product_id, 'approved')} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"><CheckCircle2 className="h-4 w-4" /> Approve changes</button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">No product edits are waiting for review.</p>}
        </section>

        <section className="rounded-[1.75rem] border border-amber-200 bg-white p-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">New Product Media</h2>
              <p className="text-sm text-slate-500">Images and videos vendors added to live products.</p>
            </div>
            <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-mono text-xs font-bold text-amber-700">{pendingImages.length} Awaiting Review</div>
          </div>
          {pendingImages.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pendingImages.map((image) => (
                <article key={image.id} className="overflow-hidden rounded-xl border border-slate-200">
                  {image.media_type === 'video' ? (
                    <video src={image.image_url} controls className="h-36 w-full bg-slate-900 object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image.image_url} alt={image.product_name} className="h-36 w-full bg-slate-100 object-cover" />
                  )}
                  <div className="space-y-2 p-3">
                    <p className="text-sm font-semibold text-slate-900">{image.product_name}</p>
                    <p className="text-xs text-slate-500">{image.creator_name || image.creator_email || 'Vendor'}</p>
                    <div className="flex gap-2">
                      <button onClick={async () => { try { setError(''); await productAPI.reviewImage(image.id, 'rejected'); await fetchProducts(); } catch (err) { setError(extractApiError(err, 'Failed to reject the image')); } }} className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">Reject</button>
                      <button onClick={async () => { try { setError(''); await productAPI.reviewImage(image.id, 'approved'); await fetchProducts(); } catch (err) { setError(extractApiError(err, 'Failed to approve the image')); } }} className="flex-1 rounded-lg bg-emerald-600 px-2 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">Approve</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No new media.</p>}
        </section>

        <section className="rounded-[1.75rem] border border-red-200 bg-white p-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Product Deletion Requests</h2>
              <p className="text-sm text-slate-500">Listings stay live until you decide. A vendor-created product nobody else sells leaves the catalog.</p>
            </div>
            <div className="rounded-full border border-red-200 bg-red-50 px-3 py-1 font-mono text-xs font-bold text-red-700">{pendingDeletions.length} Awaiting Review</div>
          </div>
          {pendingDeletions.length ? (
            <div className="space-y-3">
              {pendingDeletions.map((request) => (
                <article key={request.id} className="flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      {request.product_name}
                      {Object.keys(request.variant_properties || {}).length ? ` · ${Object.entries(request.variant_properties).map(([key, value]) => `${key}: ${value}`).join(', ')}` : ''}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">Vendor: {request.vendor_company_name || request.vendor_user_name} ({request.vendor_email})</p>
                    <p className="mt-2 text-sm text-slate-700"><span className="font-semibold">Reason:</span> {request.deletion_reason}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => void handleReviewDeletion(request.id, 'rejected')} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Keep Listing</button>
                    <button onClick={() => void handleReviewDeletion(request.id, 'approved')} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700">Approve Deletion</button>
                  </div>
                </article>
              ))}
            </div>
          ) : <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No deletion requests.</p>}
        </section>

        {/* ✨ QUEUE 3: PRODUCT VARIATION APPROVALS (HIGH PRIORITY) */}
        <section className="rounded-[1.75rem] border border-violet-200 bg-white p-6 shadow-[0_12px_32px_rgba(139,92,246,0.06)] relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 bg-violet-500/5 rounded-full blur-2xl -mr-8 -mt-8" />
          
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 border border-violet-100">
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                </span>
                <Package2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">✨ Product Variation Approvals</h2>
                <p className="text-sm text-slate-500">Pending product specifications / variations proposed by vendors.</p>
              </div>
            </div>
            <div className="self-start sm:self-center rounded-full bg-violet-50 border border-violet-200 px-3 py-1 font-mono text-xs font-bold text-violet-700">
              {pendingVariants.length} Awaiting Review
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
          ) : pendingVariants.length ? (
            <div className="space-y-3">
              {pendingVariants.map((variant) => (
                <article
                  key={variant.variant_id}
                  className="rounded-2xl border border-slate-150 bg-slate-50/50 p-4 hover:border-violet-300 hover:bg-white transition-all shadow-xs duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                        {variant.creator_name || 'Vendor'} ({variant.creator_email || 'No Email'})
                      </span>
                      <span className="text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-100 rounded-full px-2 py-0.5 uppercase tracking-wider">
                        New Variant
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      wants to add variation to:{' '}
                      <span
                        className="text-violet-700 underline cursor-pointer"
                        onClick={() => handleOpenDrawer({ id: variant.product_id } as Product)}
                      >
                        {variant.product_name}
                      </span>
                    </h4>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                      <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {Object.entries(variant.properties || {})
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(', ') || 'Default Variant'}
                      </span>
                      {variant.sku && (
                        <span className="text-slate-400 font-mono text-[11px]">
                          SKU: {variant.sku}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReviewVariant(variant.variant_id, 'approved')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReviewVariant(variant.variant_id, 'rejected')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-400">
              Clear! No product variations are awaiting approval.
            </p>
          )}
        </section>

        
        {/* QUEUE 4: PRODUCT MODIFICATION APPROVALS */}
        <section className="rounded-[1.75rem] border border-amber-200 bg-white p-6 shadow-[0_12px_32px_rgba(245,158,11,0.06)] relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 bg-amber-500/5 rounded-full blur-2xl -mr-8 -mt-8" />
          
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">🛠️ Product Modification Approval</h2>
                <p className="text-sm text-slate-500">Pending product specifications / details proposed by vendors.</p>
              </div>
            </div>
            <div className="self-start sm:self-center rounded-full bg-amber-50 border border-amber-200 px-3 py-1 font-mono text-xs font-bold text-amber-700">
              {pendingModifications.length} Awaiting Review
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : pendingModifications.length ? (
            <div className="space-y-3">
              {pendingModifications.map((mod: any) => {
                const mods = mod.pending_modifications || {};
                const proposedPrice = mods.price !== undefined ? mods.price : mod.pending_price;
                const isPriceChanged = proposedPrice !== null && proposedPrice !== undefined && Number(proposedPrice) !== Number(mod.current_price);
                const proposedAttrs = mods.attributes || {};
                const currentAttrs = mods.current_attributes || mod.current_attributes || {};

                const changedAttrsList: Array<{ key: string; current: string; proposed: string }> = [];
                for (const key of ['size', 'brand', 'grade', 'colour', 'warranty', 'manufacturer', 'unit']) {
                  const pVal = proposedAttrs[key];
                  const cVal = currentAttrs[key] || mod[`current_${key}`] || '';
                  if (pVal !== undefined && String(pVal).trim() !== String(cVal).trim()) {
                    changedAttrsList.push({
                      key: key.charAt(0).toUpperCase() + key.slice(1),
                      current: String(cVal || '—'),
                      proposed: String(pVal)
                    });
                  }
                }

                return (
                  <article
                    key={mod.id}
                    className="rounded-2xl border border-slate-150 bg-slate-50/50 p-4 hover:border-amber-300 hover:bg-white transition-all shadow-xs duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                          {mod.vendor_company_name || 'Vendor'}
                        </span>
                        <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 uppercase tracking-wider">
                          Modification Edit
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        wants to modify:{' '}
                        <span
                          className="text-amber-700 underline cursor-pointer"
                          onClick={() => handleOpenDrawer({ id: mod.product_id } as Product)}
                        >
                          {mod.product_name}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-500">
                        Seller: {mod.vendor_user_name || mod.vendor_company_name} ({mod.vendor_email})
                      </p>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {isPriceChanged && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
                            <span className="font-semibold text-emerald-800">Price:</span>
                            <span className="line-through text-slate-400">₹{mod.current_price}</span>
                            <span className="font-bold text-emerald-700">➔ ₹{proposedPrice}</span>
                          </div>
                        )}
                        {changedAttrsList.map((attr) => (
                          <div key={attr.key} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs">
                            <span className="font-semibold text-blue-800">{attr.key}:</span>
                            <span className="line-through text-slate-400">{attr.current}</span>
                            <span className="font-bold text-blue-700">➔ {attr.proposed}</span>
                          </div>
                        ))}
                        {mods.is_moq_changed && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs">
                            <span className="font-semibold text-slate-700">MOQ:</span>
                            <span className="line-through text-slate-400">{mod.current_moq}</span>
                            <span className="font-bold text-slate-800">➔ {mods.moq}</span>
                          </div>
                        )}
                        {mods.is_stock_changed && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs">
                            <span className="font-semibold text-slate-700">Stock:</span>
                            <span className="line-through text-slate-400">{mod.current_stock_quantity}</span>
                            <span className="font-bold text-slate-800">➔ {mods.stock_quantity}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleReviewModification(mod.id, 'approved')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReviewModification(mod.id, 'rejected')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-400">
              Clear! No product modifications are awaiting approval.
            </p>
          )}
        </section>

        {/* Master Catalog List (Lower Priority / Reference) */}
        <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[0_12px_32px_rgba(96,82,62,0.08)] backdrop-blur-sm">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">📚 Global Catalog Registry</h2>
              <p className="text-sm text-slate-500">
                View and edit all products that have been compiled in the global system.
              </p>
            </div>
              <div className="flex items-center gap-3">
                <button
                  id="btn-import-excel"
                  onClick={() => setShowImportModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 text-xs font-bold text-emerald-700 transition"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Import from Excel
                </button>
                <button
                  onClick={() => router.push('/dashboard/products/add')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 px-4 py-2.5 text-xs font-bold text-white shadow-md transition"
                >
                  <Plus className="h-4 w-4" />
                  Add Product
                </button>
                <div className="rounded-2xl bg-slate-100 px-4 py-2 font-mono text-xs uppercase tracking-[0.25em] text-slate-700">
                  {products.length} total products
                </div>
              </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Admin Created */}
              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">
                  <Package2 className="h-4 w-4 text-blue-600" />
                  Admin-Created Master Products ({adminProducts.length})
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {adminProducts.length ? (
                    adminProducts.map((product) => (
                      <article
                        key={product.id}
                        className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 transition"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => handleOpenDrawer(product)}>
                            <h3 className="font-bold text-slate-900 hover:text-blue-700 flex items-center gap-2">
                              {product.name}
                              <Eye className="h-4 w-4 text-slate-400" />
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {categoriesOptions.find(c => c.id === product.category)?.label || product.category || 'Unclassified'} • {product.product_type} • {product.vendor_count || 0} sellers
                            </p>
                            <div className="mt-3"><CatalogAttributeGrid product={product} wide /></div>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <button
                              onClick={() => handleOpenDrawer(product)}
                              className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                            >
                              Open Details
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition"
                              title="Delete catalog entry"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="text-slate-400 text-xs py-4 text-center">No admin master products yet.</p>
                  )}
                </div>
              </div>

              {/* Vendor Created */}
              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  Vendor-Created Master Products ({vendorProducts.length})
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {vendorProducts.length ? (
                    vendorProducts.map((product) => (
                      <article
                        key={product.id}
                        className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 transition"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => handleOpenDrawer(product)}>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-slate-900 hover:text-blue-700 flex items-center gap-2">
                                {product.name}
                                <Eye className="h-4 w-4 text-slate-400" />
                              </h3>
                              <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border ${
                                product.approval_status === 'approved'
                                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                  : product.approval_status === 'rejected'
                                  ? 'bg-red-50 border-red-100 text-red-700'
                                  : 'bg-amber-50 border-amber-100 text-amber-700'
                              }`}>
                                {product.approval_status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Submitted by: <span className="font-semibold text-slate-700">{product.creator_vendor_name || product.creator_name || 'Vendor'}</span> • {categoriesOptions.find(c => c.id === product.category)?.label || product.category || 'Unclassified'} • {product.product_type}
                            </p>
                            <div className="mt-3"><CatalogAttributeGrid product={product} wide /></div>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <button
                              onClick={() => handleOpenDrawer(product)}
                              className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                            >
                              Open Details
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition"
                              title="Delete catalog entry"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="text-slate-400 text-xs py-4 text-center">No vendor master products yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Detail & Verification Drawer */}
      {isDrawerOpen && selectedProduct && (
        <>
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Container */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-slate-50 shadow-2xl overflow-hidden flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Global Catalog Verification
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  {editMode ? 'Edit Product Specifications' : selectedProduct.name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {!editMode && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="p-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 transition hover:text-slate-900 flex items-center gap-1.5 text-xs font-medium"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit Details
                  </button>
                )}
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>
            {error ? (
              <div role="alert" className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {drawerLoading && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-30">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
                </div>
              )}

              {/* Basic Details Section */}
              <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Info className="h-5 w-5 text-blue-600" />
                  <h4 className="font-bold text-slate-900">General Information</h4>
                </div>

                {editMode ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Product Name
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Item Code</label>
                        <input value={editItemCode} onChange={(e) => setEditItemCode(e.target.value)} placeholder="Optional catalog code" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Quotation Limit</label>
                        <input type="number" min="1" value={editQuotationLimit} onChange={(e) => setEditQuotationLimit(e.target.value)} placeholder="No limit" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Description &amp; Specifications
                        </label>
                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          Notion / Sanity Editor
                        </span>
                      </div>
                      <NotionEditor
                        value={editDescription}
                        onChange={setEditDescription}
                        placeholder="Type '/' for commands or start writing product specifications..."
                        minHeight="min-h-[220px]"
                      />
                    </div>

                    <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                      Active in catalog
                      <input type="checkbox" checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} className="h-4 w-4 accent-blue-700" />
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Category
                        </label>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                        >
                          <option value="">Select category...</option>
                          {categoriesOptions.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Product Type
                        </label>
                        <input
                          type="text"
                          list="product-types-list"
                          value={editProductType}
                          onChange={(e) => setEditProductType(e.target.value)}
                          placeholder="Select or enter type..."
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                        />
                        <datalist id="product-types-list">
                          {productTypes.map((type) => (
                            <option key={type} value={type} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Key Properties (Attributes)
                      </label>
                      <div className="space-y-2 bg-slate-55 p-3 rounded-xl border border-slate-200">
                        {editAttributes.map((attr, index) => (
                          <div key={attr.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                            <input
                              type="text"
                              value={attr.key}
                              onChange={(e) => {
                                const newAttrs = [...editAttributes];
                                newAttrs[index].key = e.target.value;
                                setEditAttributes(newAttrs);
                              }}
                              placeholder="Property (e.g. Material)"
                              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                            />
                            {attr.key.trim().toLowerCase() === 'unit' ? (
                              <select
                                value={attr.value}
                                onChange={(e) => {
                                  const newAttrs = [...editAttributes];
                                  newAttrs[index].value = e.target.value;
                                  setEditAttributes(newAttrs);
                                }}
                                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                              >
                                {attr.value && !["nos", "kg", "pack", "Ltr", "Box", "gram", "Ton"].includes(attr.value) ? <option value={attr.value}>{attr.value}</option> : null}
                                {["nos", "kg", "pack", "Ltr", "Box", "gram", "Ton"].map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={attr.value}
                                onChange={(e) => {
                                  const newAttrs = [...editAttributes];
                                  newAttrs[index].value = e.target.value;
                                  setEditAttributes(newAttrs);
                                }}
                                placeholder="Value (e.g. Recycled PP)"
                                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditAttributes(editAttributes.filter((_, i) => i !== index));
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setEditAttributes([
                              ...editAttributes,
                              {
                                id: `attr-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                                key: '',
                                value: '',
                              },
                            ]);
                          }}
                          className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-slate-300 hover:border-blue-500 hover:text-blue-600 rounded-lg text-[10px] font-bold text-slate-600 transition bg-white"
                        >
                          <Plus className="h-3 w-3" /> Add Property
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-3">
                      <button
                        onClick={() => setEditMode(false)}
                        className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 transition text-xs font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveDetails}
                        className="px-4 py-2 bg-blue-700 text-white rounded-xl hover:bg-blue-800 transition text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                      >
                        <Save className="h-4 w-4" />
                        Save Details
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                          Category
                        </span>
                        <p className="font-semibold text-slate-700 capitalize">
                          {categoriesOptions.find(c => c.id === selectedProduct.category)?.label || selectedProduct.category || 'Unclassified'}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                          Type
                        </span>
                        <p className="font-semibold text-slate-700 capitalize">
                          {selectedProduct.product_type || 'Unspecified'}
                        </p>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                        Description &amp; Specifications
                      </span>
                      <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                        <RichDescriptionRenderer content={selectedProduct.description} />
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                        Product Catalog Attributes
                      </span>
                      <div className="mt-2"><CatalogAttributeGrid product={selectedProduct} /></div>
                    </div>
                    {((selectedProduct.attributes && Object.keys(selectedProduct.attributes).length > 0) ||
                      selectedProduct.material ||
                      selectedProduct.grade ||
                      selectedProduct.application ||
                      selectedProduct.standard) && (
                      <div className="pt-2">
                        <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                          Key Properties (Attributes)
                        </span>
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3.5">
                          {selectedProduct.material && (
                            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100 last:border-0">
                              <span className="text-slate-500 font-medium">Material</span>
                              <span className="font-semibold text-slate-700">{selectedProduct.material}</span>
                            </div>
                          )}
                          {selectedProduct.grade && (
                            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100 last:border-0">
                              <span className="text-slate-500 font-medium">Grade</span>
                              <span className="font-semibold text-slate-700">{selectedProduct.grade}</span>
                            </div>
                          )}
                          {selectedProduct.application && (
                            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100 last:border-0">
                              <span className="text-slate-500 font-medium">Application</span>
                              <span className="font-semibold text-slate-700">{selectedProduct.application}</span>
                            </div>
                          )}
                          {selectedProduct.standard && (
                            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100 last:border-0">
                              <span className="text-slate-500 font-medium">Standard</span>
                              <span className="font-semibold text-slate-700">{selectedProduct.standard}</span>
                            </div>
                          )}
                          {selectedProduct.attributes &&
                            Object.entries(selectedProduct.attributes)
                              .filter(([key]) => !["material", "grade", "application", "standard"].includes(key.toLowerCase()))
                              .map(([key, value]) => (
                                <div key={key} className="flex justify-between items-center text-xs py-1 border-b border-slate-100 last:border-0">
                                  <span className="text-slate-500 capitalize">{key.replace(/_/g, " ")}</span>
                                  <span className="font-semibold text-slate-700 text-right max-w-[60%] whitespace-pre-wrap">{String(value)}</span>
                                </div>
                              ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 flex flex-wrap gap-3">
                      <div className="flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500">
                        <Calendar className="h-3.5 w-3.5" />
                        Created: {new Date(selectedProduct.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold capitalize border border-slate-200/50 bg-slate-50">
                        Product Status:{' '}
                        <span className={`ml-1 font-bold ${
                          selectedProduct.approval_status === 'approved'
                            ? 'text-emerald-700'
                            : selectedProduct.approval_status === 'rejected'
                            ? 'text-red-600'
                            : 'text-amber-600'
                        }`}>
                          {selectedProduct.approval_status}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Images Review Section */}
              <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-amber-500" />
                    <h4 className="font-bold text-slate-900">Catalog Media</h4>
                  </div>
                  <span className="text-xs font-mono text-slate-400 uppercase">
                    {selectedProduct.detailed_images?.length || 0} images
                  </span>
                </div>

                <div className="mb-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/40 p-3">
                  <input
                    ref={mediaInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={(event) => setMediaFiles(Array.from(event.target.files || []).slice(0, 5))}
                    className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-semibold file:text-amber-700"
                  />
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-500">JPG, PNG or WEBP · up to 5 MB each · maximum 5 per upload</span>
                    <button type="button" onClick={uploadMedia} disabled={!mediaFiles.length || mutationBusy === 'media'} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">
                      {mutationBusy === 'media' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      Upload {mediaFiles.length || ''}
                    </button>
                  </div>
                </div>

                {selectedProduct.detailed_images?.length ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {selectedProduct.detailed_images.map((img) => (
                      <div
                        key={img.id}
                        className={`group relative rounded-xl overflow-hidden border bg-slate-50 p-1.5 transition duration-200 flex flex-col justify-between ${
                          img.is_primary ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200'
                        }`}
                      >
                        <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-100 bg-white flex items-center justify-center">
                          {img.media_type === 'video' ? (
                            <video
                              src={img.image_url}
                              controls
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              src={img.image_url}
                              alt="Upload preview"
                              className="w-full h-full object-cover"
                            />
                          )}
                          <span className={`absolute bottom-1 right-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                            img.approval_status === 'approved'
                              ? 'bg-emerald-600 text-white'
                              : img.approval_status === 'rejected'
                              ? 'bg-red-600 text-white'
                              : 'bg-amber-500 text-white'
                          }`}>
                            {img.media_type === 'video' ? 'video: ' : ''}{img.approval_status}
                          </span>
                        </div>
                        
                        <div className="mt-2 grid grid-cols-2 gap-1">
                          <button onClick={() => makePrimary(img.id)} disabled={img.is_primary || mutationBusy === `image-${img.id}`} className="col-span-2 py-1 rounded bg-blue-50 text-blue-700 text-[10px] font-bold disabled:opacity-50">
                            {img.is_primary ? 'Primary image' : 'Set as primary'}
                          </button>
                          <button
                            onClick={() => handleReviewImage(img.id, 'approved')}
                            disabled={img.approval_status === 'approved'}
                            className="flex-1 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold transition disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReviewImage(img.id, 'rejected')}
                            disabled={img.approval_status === 'rejected'}
                            className="flex-1 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold transition disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button onClick={() => deleteMedia(img.id)} disabled={mutationBusy === `image-${img.id}`} className="col-span-2 py-1 rounded bg-slate-100 hover:bg-red-50 text-red-600 text-[10px] font-bold disabled:opacity-50">
                            Delete image
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs py-4 text-center">No images uploaded.</p>
                )}
              </section>

              {/* Technical Specifications Section */}
              <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-emerald-500" />
                    <h4 className="font-bold text-slate-900">Technical Specifications</h4>
                  </div>
                  <span className="text-xs font-mono text-slate-400 uppercase">
                    {selectedProduct.detailed_specifications?.length || 0} specs
                  </span>
                </div>

                <div className="space-y-2">
                  {specificationDrafts.map((spec, index) => (
                    <div key={spec.id} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                      <input value={spec.key} onChange={(e) => setSpecificationDrafts((rows) => rows.map((row, i) => i === index ? { ...row, key: e.target.value } : row))} placeholder="Specification" className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                      <input value={spec.value} onChange={(e) => setSpecificationDrafts((rows) => rows.map((row, i) => i === index ? { ...row, value: e.target.value } : row))} placeholder="Value" className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                      <button type="button" onClick={() => setSpecificationDrafts((rows) => rows.filter((_, i) => i !== index))} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                  {!specificationDrafts.length && <p className="py-3 text-center text-xs text-slate-400">No product specifications.</p>}
                  <div className="flex justify-between pt-2">
                    <button type="button" onClick={() => setSpecificationDrafts((rows) => [...rows, { id: editorId('spec'), key: '', value: '' }])} className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold"><Plus className="h-3.5 w-3.5" /> Add specification</button>
                    <button type="button" onClick={saveSpecifications} disabled={mutationBusy === 'specifications'} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{mutationBusy === 'specifications' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save specifications</button>
                  </div>
                </div>
              </section>

              {/* Product Variants Drawer Section */}
              <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Package2 className="h-5 w-5 text-violet-500" />
                    <h4 className="font-bold text-slate-900">Product Variants / Specifications</h4>
                  </div>
                  <span className="text-xs font-mono text-slate-400 uppercase">
                    {selectedProduct.variants?.length || 0} variants
                  </span>
                </div>

                <div className="space-y-4">
                  {variantDrafts.map((variant, variantIndex) => (
                    <div key={variant.id} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Variant Name</label>
                        <input value={variant.name} onChange={(e) => setVariantDrafts((items) => items.map((item, i) => i === variantIndex ? { ...item, name: e.target.value } : item))} placeholder="e.g. Heavy Duty / Large" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">SKU</label>
                        <input value={variant.sku} onChange={(e) => setVariantDrafts((items) => items.map((item, i) => i === variantIndex ? { ...item, sku: e.target.value } : item))} placeholder="Optional unique SKU" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" />
                      </div>
                      <div className="space-y-2">
                        {variant.properties.map((property, propertyIndex) => (
                          <div key={property.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                            <input value={property.key} onChange={(e) => setVariantDrafts((items) => items.map((item, i) => i === variantIndex ? { ...item, properties: item.properties.map((row, j) => j === propertyIndex ? { ...row, key: e.target.value } : row) } : item))} placeholder="Property (e.g. Size)" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" />
                            <input value={property.value} onChange={(e) => setVariantDrafts((items) => items.map((item, i) => i === variantIndex ? { ...item, properties: item.properties.map((row, j) => j === propertyIndex ? { ...row, value: e.target.value } : row) } : item))} placeholder="Value" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" />
                            <button type="button" onClick={() => setVariantDrafts((items) => items.map((item, i) => i === variantIndex ? { ...item, properties: item.properties.filter((_, j) => j !== propertyIndex) } : item))} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap justify-between gap-2">
                        <button type="button" onClick={() => setVariantDrafts((items) => items.map((item, i) => i === variantIndex ? { ...item, properties: [...item.properties, { id: editorId('variant-property'), key: '', value: '' }] } : item))} className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-[10px] font-bold"><Plus className="h-3 w-3" /> Property</button>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => deleteVariant(variant)} disabled={mutationBusy === `variant-${variant.id}`} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600">Delete</button>
                          <button type="button" onClick={() => saveVariant(variant)} disabled={mutationBusy === `variant-${variant.id}`} className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">{mutationBusy === `variant-${variant.id}` && <Loader2 className="h-3 w-3 animate-spin" />} Save variant</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!variantDrafts.length && <p className="py-3 text-center text-xs text-slate-400">No variants configured.</p>}
                  <button type="button" onClick={() => setVariantDrafts((items) => [...items, { id: editorId('variant'), name: '', sku: '', properties: [{ id: editorId('variant-property'), key: '', value: '' }] }])} className="inline-flex items-center gap-1 rounded-lg border border-dashed border-violet-300 px-3 py-2 text-xs font-bold text-violet-700"><Plus className="h-3.5 w-3.5" /> Add variant</button>
                </div>
              </section>

              {/* Linked Vendors Mappings */}
              <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-indigo-500" />
                    <h4 className="font-bold text-slate-900">Linked Seller Listings</h4>
                  </div>
                  <span className="text-xs font-mono text-slate-400 uppercase">
                    {selectedProduct.detailed_vendors?.length || 0} sellers
                  </span>
                </div>

                {selectedProduct.detailed_vendors?.length ? (
                  <div className="space-y-4">
                    {selectedProduct.detailed_vendors.map((vendor) => (
                      <div
                        key={vendor.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-bold text-slate-950 text-sm">
                              {vendor.company_name}
                            </h5>
                            <p className="text-xs text-slate-500">
                              Contact: {vendor.vendor_name} ({vendor.vendor_email})
                            </p>
                          </div>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                            vendor.status === 'active'
                              ? 'bg-emerald-105 text-emerald-800'
                              : vendor.status === 'waiting'
                              ? 'bg-amber-105 text-amber-800'
                              : 'bg-slate-105 text-slate-700'
                          }`}>
                            {vendor.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-2 py-2 border-y border-slate-100 bg-slate-50/50 rounded-lg p-2 text-xs">
                          <div>
                            <span className="text-slate-400 block uppercase font-mono">Price</span>
                            <span className="font-bold text-slate-800">₹{vendor.price}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block uppercase font-mono">MOQ</span>
                            <span className="font-bold text-slate-800">{vendor.moq}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block uppercase font-mono">Stock</span>
                            <span className="font-bold text-slate-800">{vendor.stock_quantity}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block uppercase font-mono">GST %</span>
                            <span className="font-bold text-slate-800">
                              {vendor.gst_percentage !== null && vendor.gst_percentage !== undefined ? `${vendor.gst_percentage}%` : '0%'}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1 justify-end">
                          <button
                            onClick={() => handleReviewVendorProduct(vendor.id, 'approved')}
                            disabled={vendor.status === 'active'}
                            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition disabled:opacity-40 flex items-center gap-1"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approve Listing
                          </button>
                          <button
                            onClick={() => handleReviewVendorProduct(vendor.id, 'rejected')}
                            disabled={vendor.status === 'inactive'}
                            className="px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition disabled:opacity-40"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Deactivate Listing
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs py-4 text-center">No vendors map to this catalogue item.</p>
                )}
              </section>
            </div>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shadow-[0_-4px_16px_rgba(0,0,0,0.02)]">
              <button
                onClick={() => handleDelete(selectedProduct.id)}
                className="px-4 py-3 bg-red-50 text-red-600 border border-red-150 rounded-2xl hover:bg-red-100 transition text-sm font-semibold flex items-center gap-1.5 justify-center"
              >
                <Trash2 className="h-4 w-4" />
                Delete Catalog entry
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => handleReview(selectedProduct.id, 'rejected')}
                  disabled={selectedProduct.approval_status === 'rejected'}
                  className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 rounded-2xl hover:bg-red-100 transition text-sm font-bold disabled:opacity-50"
                >
                  Reject Product
                </button>
                <button
                  onClick={() => handleReview(selectedProduct.id, 'approved')}
                  disabled={selectedProduct.approval_status === 'approved'}
                  className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl transition text-sm font-bold disabled:opacity-50 shadow-md flex items-center gap-1.5 justify-center"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve Product
                </button>
              </div>
            </footer>
          </div>
        </>
      )}
    </DashboardLayout>
      {showImportModal && (
        <BulkImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => { void fetchProducts(); }}
          knownCategories={categoriesOptions}
        />
      )}
    </>
  );
}
