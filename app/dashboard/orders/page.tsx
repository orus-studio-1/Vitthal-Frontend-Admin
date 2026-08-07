'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Loader2, MapPin, Package, Search, ShoppingBag, ShoppingCart, X } from 'lucide-react';
import DashboardLayout from '../../../components/dashboard-layout';
import { extractApiError, orderAPI, productAPI, quotationAPI, vendorAPI } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { CreateVendorQuotationPayload, Order, OrderFormData, OrderProductVendorOption, OrderStatus, Product, Vendor } from '../../../lib/types';
import { downloadCsv, downloadExcel } from '../../../lib/export-utils';

const orderStatuses: OrderStatus[] = [
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
];

const initialForm: OrderFormData = {
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  vendor_id: '',
  product_id: '',
  quantity: '1',
  total_amount: '',
  address_line: '',
  city: '',
  state: '',
  country: 'India',
  pincode: '',
  order_notes: '',
};

export default function OrdersPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productVendors, setProductVendors] = useState<OrderProductVendorOption[]>([]);
  const [form, setForm] = useState<OrderFormData>(initialForm);
  const [productSearch, setProductSearch] = useState('');
  const [orderingProduct, setOrderingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [vendorOptionsLoading, setVendorOptionsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'buy' | 'orders'>('orders');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      const [ordersResponse, vendorsResponse, productsResponse] = await Promise.all([
        orderAPI.getAll(),
        vendorAPI.getAll(),
        productAPI.getAll(),
      ]);
      setOrders(ordersResponse.data.data);
      setVendors(vendorsResponse.data.data.filter((vendor) => vendor.approval_status === 'approved' && vendor.is_active));
      setProducts(productsResponse.data.data.filter((product) => product.approval_status === 'approved' && product.is_active !== false));
    } catch (loadError) {
      setError(extractApiError(loadError, 'Failed to load order data'));
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
        void loadData();
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [authLoading, isAuthenticated, router]);

  const openOrderDetail = async (orderId: string) => {
    try {
      setSelectedOrderId(orderId);
      setDetailLoading(true);
      setDetailError('');
      setOrderDetail(null);
      const response = await orderAPI.getById(orderId);
      setOrderDetail(response.data.data);
    } catch (detailLoadError) {
      setDetailError(extractApiError(detailLoadError, 'Failed to load order details'));
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const orderId = new URLSearchParams(window.location.search).get('orderId');
    if (orderId && isAuthenticated) {
      setActiveTab('orders');
      void openOrderDetail(orderId);
    }
  }, [isAuthenticated]);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) {
      return products;
    }

    return products.filter((product) =>
      [product.name, product.description, product.category, product.product_type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [productSearch, products]);

  const handleOpenCheckout = (product: Product) => {
    setOrderingProduct(product);
    setProductVendors([]);
    setForm((current) => ({
      ...initialForm,
      customer_name: current.customer_name,
      customer_email: current.customer_email,
      customer_phone: current.customer_phone,
      address_line: current.address_line,
      city: current.city,
      state: current.state,
      country: current.country || 'India',
      pincode: current.pincode,
      order_notes: current.order_notes,
      product_id: product.id,
    }));
    setError('');
    void loadProductVendors(product.id);
  };

  const handleCloseCheckout = () => {
    setOrderingProduct(null);
    setProductVendors([]);
    setForm((current) => ({ ...current, product_id: '', vendor_id: '', quantity: '1', total_amount: '' }));
  };

  const loadProductVendors = async (productId: string) => {
    try {
      setVendorOptionsLoading(true);
      const response = await orderAPI.getProductVendors(productId);
      setProductVendors(response.data.data);
    } catch (loadError) {
      setError(extractApiError(loadError, 'Failed to load vendors for this product'));
    } finally {
      setVendorOptionsLoading(false);
    }
  };

  const selectedProductVendor = productVendors.find((vendor) => vendor.id === form.vendor_id) || null;
  const quantityNumber = Number(form.quantity || 0);
  const requiresQuotation = Boolean(
    selectedProductVendor &&
    selectedProductVendor.quotation_enabled &&
    selectedProductVendor.quotation_min_qty !== null &&
    quantityNumber >= selectedProductVendor.quotation_min_qty
  );

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!orderingProduct) {
      setError('Select a product first.');
      return;
    }

    setSubmitting(true);

    try {
      await orderAPI.create({
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        customer_phone: form.customer_phone || undefined,
        vendor_id: form.vendor_id,
        product_id: orderingProduct.id,
        quantity: Number(form.quantity),
        total_amount: Number(form.total_amount),
        address_line: form.address_line,
        city: form.city,
        state: form.state,
        country: form.country,
        pincode: form.pincode,
        order_notes: form.order_notes || undefined,
      });
      setForm(initialForm);
      setOrderingProduct(null);
      setProductVendors([]);
      await loadData();
    } catch (createError) {
      setError(extractApiError(createError, 'Failed to create order'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendQuotation = async () => {
    if (!orderingProduct || !selectedProductVendor) {
      setError('Select a product vendor first.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const payload: CreateVendorQuotationPayload = {
        vendorId: selectedProductVendor.id,
        quotationKind: 'order_request',
        productId: orderingProduct.id,
        title: `${orderingProduct.name} quotation request`,
        quantity: quantityNumber,
        unit: 'units',
        requestNotes: form.order_notes.trim() || undefined,
      };

      if (form.total_amount.trim()) {
        payload.targetPrice = Number(form.total_amount) / quantityNumber;
      }

      await quotationAPI.create(payload);
      setForm(initialForm);
      setOrderingProduct(null);
      setProductVendors([]);
      router.push('/dashboard/quotations');
    } catch (quotationError) {
      setError(extractApiError(quotationError, 'Failed to send quotation request'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: OrderStatus) => {
    try {
      await orderAPI.updateStatus(id, status);
      await loadData();
    } catch (updateError) {
      setError(extractApiError(updateError, 'Failed to update order status'));
    }
  };

  const closeOrderDetail = () => {
    setSelectedOrderId(null);
    setOrderDetail(null);
    setDetailError('');
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('orderId')) {
      router.replace('/dashboard/orders');
    }
  };

  const handleDownloadOrdersCsv = () => {
    const headers = ['Order ID', 'Customer', 'Email', 'Phone', 'Product', 'Vendor', 'Quantity', 'Amount', 'Status', 'Source', 'Address', 'Created At'];
    const rows = orders.map((order) => [
      order.id,
      order.customer_name,
      order.customer_email,
      order.customer_phone || '',
      order.product_name || '',
      order.vendor_name || '',
      order.quantity,
      order.total_amount,
      order.status,
      order.source,
      order.delivery_address || '',
      order.created_at,
    ]);
    downloadCsv(
      'orders.csv',
      headers,
      rows
    );
  };

  const handleDownloadOrdersExcel = () => {
    downloadExcel(
      'orders.xls',
      'Orders',
      ['Order ID', 'Customer', 'Email', 'Phone', 'Product', 'Vendor', 'Quantity', 'Amount', 'Status', 'Source', 'Address', 'Created At'],
      orders.map((order) => [
        order.id,
        order.customer_name,
        order.customer_email,
        order.customer_phone || '',
        order.product_name || '',
        order.vendor_name || '',
        order.quantity,
        order.total_amount,
        order.status,
        order.source,
        order.delivery_address || '',
        order.created_at,
      ])
    );
  };

  if (authLoading || !isAuthenticated) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100"><Loader2 className="h-8 w-8 animate-spin text-blue-700" /></div>;
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Order Management</h1>
          <p className="text-sm text-slate-500">Place direct orders on behalf of clients or manage incoming customer orders.</p>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between gap-4 rounded-3xl bg-slate-100 p-1.5 max-w-md">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-all ${
            activeTab === 'orders'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          Orders Directory
        </button>
        <button
          onClick={() => setActiveTab('buy')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-all ${
            activeTab === 'buy'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          Buy Products (Catalog)
        </button>
      </div>

      {activeTab === 'buy' ? (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-700"><ShoppingBag className="h-5 w-5" /></div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Buy products</h2>
              <p className="text-sm text-slate-500">Search approved catalogue items and start an admin order directly from the product cards.</p>
            </div>
          </div>

          <div className="mb-5">
            <label className="form-label">Search products</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="form-input pl-11"
                placeholder="Search by product name, category, type, or description"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
              />
            </div>
          </div>

          {error ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-700" /></div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.length ? filteredProducts.map((product) => (
                <article key={product.id} className="rounded-[1.45rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                        {(product.category || 'General').toUpperCase()}
                      </div>
                      <h2 className="mt-3 text-lg font-semibold text-slate-900">{product.name}</h2>
                      <p className="mt-1 text-sm text-slate-500">{product.product_type || 'General product type'}</p>
                    </div>
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {product.vendor_count || 0} sellers
                    </div>
                  </div>

                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
                    {product.description || 'No description provided for this product yet.'}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                      {product.approval_status}
                    </span>
                    {product.creator_vendor_name ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                        Vendor: {product.creator_vendor_name}
                      </span>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenCheckout(product)}
                    className="mt-5 w-full rounded-2xl bg-blue-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-800"
                  >
                    Buy now
                  </button>
                </article>
              )) : (
                <p className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">No products matched your search.</p>
              )}
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Orders</h2>
              <p className="text-sm text-slate-500">Client checkout orders, admin orders, and vendor orders all show here.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadOrdersCsv}
                disabled={!orders.length}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                CSV
              </button>
              <button
                type="button"
                onClick={handleDownloadOrdersExcel}
                disabled={!orders.length}
                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Excel
              </button>
              <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">{orders.length} orders</div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-700" /></div>
          ) : (
            <div className="space-y-4">
              {orders.length ? orders.map((order) => (
                <article key={order.id} onClick={() => void openOrderDetail(order.id)} className="cursor-pointer rounded-2xl border border-slate-200 p-5 transition-colors hover:border-blue-300 hover:bg-blue-50/20">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-blue-50 p-3 text-blue-700"><ShoppingCart className="h-5 w-5" /></div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{order.customer_name}</h3>
                          <p className="text-sm text-slate-500">
                            <span className="font-medium text-slate-700">{order.product_name || 'Unknown product'}</span> • Supplied by <span className="font-medium text-slate-700">{order.vendor_name || 'Unknown vendor'}</span>
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                        <p><span className="text-slate-400">Amount:</span> <span className="font-semibold text-slate-900">Rs. {Number(order.total_amount).toFixed(2)}</span></p>
                        <p>•</p>
                        <p><span className="text-slate-400">Qty:</span> <span className="font-semibold text-slate-900">{order.quantity}</span></p>
                        <p>•</p>
                        <p><span className="text-slate-400">Ordered:</span> <span className="font-medium text-slate-900">{new Date(order.created_at).toLocaleDateString()}</span></p>
                      </div>
                      <p className="mt-2 text-sm text-slate-500"><span className="text-slate-400">Shipping Address:</span> {order.delivery_address || 'No delivery address yet.'}</p>
                      <div className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-700">{order.source} order</div>
                    </div>
                    <div className="min-w-[240px] border-t border-slate-100 pt-4 lg:border-t-0 lg:pt-0">
                      <label className="form-label">Status</label>
                      <select className="form-input" value={order.status} onClick={(event) => event.stopPropagation()} onChange={(event) => handleStatusUpdate(order.id, event.target.value as OrderStatus)}>
                        {orderStatuses.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
                      </select>
                    </div>
                  </div>
                </article>
              )) : <p className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">No orders found.</p>}
            </div>
          )}
        </section>
      )}

      {orderingProduct ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.3em] text-blue-600">Checkout</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">{orderingProduct.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{orderingProduct.category || 'General'} • {orderingProduct.product_type || 'General product type'}</p>
              </div>
              <button type="button" onClick={handleCloseCheckout} className="rounded-2xl border border-slate-200 p-3 text-slate-500 hover:bg-slate-50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6 rounded-[1.4rem] bg-slate-50 p-4 text-sm text-slate-600">
              {orderingProduct.description || 'No description provided for this product yet.'}
            </div>

            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="form-label">Customer name</label>
                  <input className="form-input" value={form.customer_name} onChange={(event) => setForm({ ...form, customer_name: event.target.value })} required />
                </div>
                <div>
                  <label className="form-label">Customer email</label>
                  <input type="email" className="form-input" value={form.customer_email} onChange={(event) => setForm({ ...form, customer_email: event.target.value })} required />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="form-label">Customer phone</label>
                  <input className="form-input" value={form.customer_phone} onChange={(event) => setForm({ ...form, customer_phone: event.target.value })} />
                </div>
                <div>
                  <label className="form-label">Quantity</label>
                  <input type="number" min="1" className="form-input" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} required />
                </div>
                <div>
                  <label className="form-label">Total amount</label>
                  <input type="number" min="0" step="0.01" className="form-input" value={form.total_amount} onChange={(event) => setForm({ ...form, total_amount: event.target.value })} required={!requiresQuotation} />
                </div>
              </div>

                <div>
                  <label className="form-label">Vendor</label>
                  <select className="form-input" value={form.vendor_id} onChange={(event) => setForm({ ...form, vendor_id: event.target.value })} required>
                    <option value="">Select vendor</option>
                    {productVendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.company_name}</option>)}
                  </select>
                  {vendorOptionsLoading ? <p className="mt-2 text-xs text-slate-500">Loading product vendors...</p> : null}
                  {!vendorOptionsLoading && orderingProduct && !productVendors.length ? <p className="mt-2 text-xs text-red-600">No active approved vendors list this product.</p> : null}
                  {selectedProductVendor?.quotation_enabled && selectedProductVendor.quotation_min_qty !== null ? (
                    <p className="mt-2 text-xs text-amber-700">Quotation required for {selectedProductVendor.quotation_min_qty}+ units from this vendor.</p>
                  ) : null}
                </div>

              <div>
                <label className="form-label">Address line</label>
                <textarea className="form-input min-h-24" value={form.address_line} onChange={(event) => setForm({ ...form, address_line: event.target.value })} required />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="form-label">City</label>
                  <input className="form-input" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} required />
                </div>
                <div>
                  <label className="form-label">State</label>
                  <input className="form-input" value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} required />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="form-label">Country</label>
                  <input className="form-input" value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} required />
                </div>
                <div>
                  <label className="form-label">Pincode</label>
                  <input className="form-input" value={form.pincode} onChange={(event) => setForm({ ...form, pincode: event.target.value })} required />
                </div>
              </div>

              <div>
                <label className="form-label">Order notes</label>
                <textarea className="form-input min-h-24" value={form.order_notes} onChange={(event) => setForm({ ...form, order_notes: event.target.value })} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={handleCloseCheckout} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                {requiresQuotation ? (
                  <button type="button" onClick={() => void handleSendQuotation()} disabled={submitting || !selectedProductVendor} className="rounded-2xl bg-blue-700 px-5 py-3 text-sm font-medium text-white disabled:opacity-60">
                    {submitting ? 'Sending...' : 'Send quotation'}
                  </button>
                ) : (
                  <button type="submit" disabled={submitting || !selectedProductVendor} className="rounded-2xl bg-blue-700 px-5 py-3 text-sm font-medium text-white disabled:opacity-60">
                    {submitting ? 'Creating...' : 'Place order'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {selectedOrderId ? (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={closeOrderDetail} aria-label="Close order details" />
          <div className="absolute inset-y-0 right-0 flex max-w-full pl-6">
            <div className="flex h-full w-screen max-w-3xl flex-col bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-blue-600">Order detail</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">#{selectedOrderId.slice(0, 8)}</h2>
                </div>
                <button onClick={closeOrderDetail} className="rounded-2xl border border-slate-200 p-3 text-slate-500 hover:bg-slate-50">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {detailLoading ? (
                  <div className="flex h-full min-h-[360px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-700" /></div>
                ) : detailError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{detailError}</div>
                ) : orderDetail ? (
                  <div className="space-y-6">
                    <section className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status</p>
                        <p className="mt-2 text-lg font-bold capitalize text-slate-900">{orderDetail.status?.replaceAll('_', ' ')}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Payment</p>
                        <p className="mt-2 text-lg font-bold capitalize text-slate-900">{orderDetail.payment_status || 'pending'}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Amount</p>
                        <p className="mt-2 text-lg font-bold text-emerald-700">₹{Number(orderDetail.total_amount || 0).toLocaleString('en-IN')}</p>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 p-5">
                      <h3 className="font-semibold text-slate-900">Customer and delivery</h3>
                      <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
                        <div className="space-y-1 text-slate-600">
                          <p className="font-medium text-slate-900">{orderDetail.customer_name}</p>
                          <p>{orderDetail.customer_email}</p>
                          <p>{orderDetail.customer_phone || 'No phone'}</p>
                        </div>
                        <div className="flex gap-2 text-slate-600">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                          <p>{orderDetail.address_line}, {orderDetail.city}, {orderDetail.state}, {orderDetail.country} - {orderDetail.pincode}</p>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 p-5">
                      <h3 className="font-semibold text-slate-900">Items</h3>
                      <div className="mt-4 divide-y divide-slate-100">
                        {(orderDetail.items || []).map((item: any, index: number) => (
                          <div key={`${item.product_id}-${index}`} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                              {item.image_url ? <img src={item.image_url} alt={item.product_name} className="h-full w-full object-cover" /> : <Package className="h-6 w-6 text-slate-300" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold text-slate-900">{item.product_name}</p>
                              <p className="text-sm text-slate-500">Qty {item.quantity} • ₹{Number(item.price || 0).toLocaleString('en-IN')} each</p>
                            </div>
                            <p className="font-semibold text-slate-900">₹{Number((item.price || 0) * (item.quantity || 0)).toLocaleString('en-IN')}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 p-5">
                      <h3 className="font-semibold text-slate-900">Tracking timeline</h3>
                      <div className="mt-5 border-l border-slate-200 pl-5">
                        {([...(orderDetail.fulfillment_tracking || []), ...(orderDetail.status_history || [])].length
                          ? [...(orderDetail.fulfillment_tracking || []), ...(orderDetail.status_history || [])]
                              .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                              .map((history: any, index: number) => (
                                <div key={history.id || index} className="relative pb-6 last:pb-0">
                                  <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-blue-700 ring-4 ring-blue-50" />
                                  <p className="font-semibold capitalize text-slate-900">{String(history.status).replaceAll('_', ' ')}</p>
                                  <p className="mt-1 text-sm text-slate-500">{history.note || 'Status updated.'}</p>
                                  {history.fulfillment_center || history.city ? (
                                    <p className="mt-1 text-xs text-slate-400">{[history.fulfillment_center, history.city, history.state, history.country].filter(Boolean).join(', ')}</p>
                                  ) : null}
                                  <p className="mt-1 text-xs text-slate-400">{new Date(history.created_at).toLocaleString('en-IN')}</p>
                                </div>
                              ))
                          : <p className="text-sm text-slate-500">No tracking events recorded yet.</p>)}
                      </div>
                    </section>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
