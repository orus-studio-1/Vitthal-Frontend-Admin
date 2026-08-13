'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
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
  Upload
} from 'lucide-react';
import DashboardLayout from '../../../components/dashboard-layout';
import { extractApiError, productAPI } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { Product } from '../../../lib/types';

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

export default function ProductsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [pendingListings, setPendingListings] = useState<PendingVendorListing[]>([]);
  const [pendingVariants, setPendingVariants] = useState<any[]>([]);
  const [categoriesOptions, setCategoriesOptions] = useState<any[]>([]);
  const [productTypes, setProductTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
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
  }, []);

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
    setEditAttributes(Object.entries(product.attributes || {}).map(([key, value]) => ({
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
      const [productsRes, listingsRes, variantsRes] = await Promise.all([
        productAPI.getAll(),
        productAPI.getPendingVendorProducts(),
        productAPI.getPendingVariants()
      ]);
      
      setProducts(productsRes.data.data);
      setPendingListings(listingsRes.data.data || []);
      setPendingVariants(variantsRes.data.data || []);
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
  const vendorProducts = products.filter(
    (product) =>
      (product.creator_role === 'vendor' ||
        Boolean(product.created_by_vendor_id) ||
        Boolean(product.created_by_user_id)) &&
      product.creator_role !== 'admin'
  );
  const adminProducts = products.filter(
    (product) => !vendorProducts.some((vp) => vp.id === product.id)
  );
  const pendingVendorProducts = vendorProducts.filter(
    (product) => product.approval_status === 'pending'
  );

  return (
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
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="cursor-pointer" onClick={() => handleOpenDrawer(product)}>
                            <h3 className="font-bold text-slate-900 hover:text-blue-700 flex items-center gap-2">
                              {product.name}
                              <Eye className="h-4 w-4 text-slate-400" />
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {categoriesOptions.find(c => c.id === product.category)?.label || product.category || 'Unclassified'} • {product.product_type} • {product.vendor_count || 0} sellers
                            </p>
                          </div>
                          <div className="flex gap-2">
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
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="cursor-pointer" onClick={() => handleOpenDrawer(product)}>
                            <h3 className="font-bold text-slate-900 hover:text-blue-700 flex items-center gap-2">
                              {product.name}
                              <Eye className="h-4 w-4 text-slate-400" />
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Submitted by: <span className="font-semibold text-slate-700">{product.creator_vendor_name || product.creator_name || 'Vendor'}</span> • {categoriesOptions.find(c => c.id === product.category)?.label || product.category || 'Unclassified'} • {product.product_type}
                            </p>
                            <span className={`inline-block rounded-full px-2.5 py-0.5 mt-2 text-[10px] font-bold uppercase border ${
                              product.approval_status === 'approved'
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                : product.approval_status === 'rejected'
                                ? 'bg-red-50 border-red-100 text-red-700'
                                : 'bg-amber-50 border-amber-100 text-amber-700'
                            }`}>
                              {product.approval_status}
                            </span>
                          </div>
                          <div className="flex gap-2">
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
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Description
                      </label>
                      <textarea
                        rows={3}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
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
                        Description
                      </span>
                      <p className="text-slate-600 mt-1 leading-relaxed">
                        {selectedProduct.description || 'No description provided for catalog.'}
                      </p>
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
  );
}
