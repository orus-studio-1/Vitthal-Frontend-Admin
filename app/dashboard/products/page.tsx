'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, Package2, ShieldAlert, Trash2, XCircle } from 'lucide-react';
import DashboardLayout from '../../../components/dashboard-layout';
import { extractApiError, productAPI } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { Product } from '../../../lib/types';

export default function ProductsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchProducts() {
    try {
      setLoading(true);
      setError('');
      const response = await productAPI.getAll();
      setProducts(response.data.data);
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
    try {
      await productAPI.delete(id);
      await fetchProducts();
    } catch (deleteError) {
      setError(extractApiError(deleteError, 'Failed to delete product'));
    }
  };

  const handleReview = async (id: string, decision: 'approved' | 'rejected') => {
    try {
      await productAPI.review(id, decision);
      await fetchProducts();
    } catch (reviewError) {
      setError(extractApiError(reviewError, `Failed to ${decision} product`));
    }
  };

  if (authLoading || !isAuthenticated) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100"><Loader2 className="h-8 w-8 animate-spin text-blue-700" /></div>;
  }

  const vendorProducts = products.filter((product) => product.creator_role === 'vendor' || Boolean(product.created_by_user_id) || Boolean(product.created_by_vendor_id));
  const adminProducts = products.filter((product) => !vendorProducts.some((vendorProduct) => vendorProduct.id === product.id));
  const pendingVendorProducts = vendorProducts.filter((product) => product.approval_status === 'pending');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        <section className="space-y-6">
          <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[0_12px_32px_rgba(96,82,62,0.08)] backdrop-blur-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Vendor product approvals</h2>
                <p className="text-sm text-slate-500">Review new vendor-created catalogue entries before they reach buyers.</p>
              </div>
              <div className="rounded-2xl bg-[rgba(204,178,122,0.16)] px-4 py-2 font-mono text-xs uppercase tracking-[0.25em] text-[#5a544a]">{pendingVendorProducts.length} pending</div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-700" /></div>
            ) : pendingVendorProducts.length ? (
              <div className="space-y-4">
                {pendingVendorProducts.map((product) => (
                  <article key={product.id} className="rounded-[1.45rem] border border-[var(--border)] bg-[rgba(255,255,255,0.55)] p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900">{product.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">{product.creator_vendor_name || product.creator_name || 'Vendor submission'}</p>
                        <p className="mt-3 text-sm text-slate-600">{product.description || 'No description provided.'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleReview(product.id, 'approved')} className="flex items-center gap-2 rounded-2xl border border-emerald-200 px-4 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50">
                          <CheckCircle2 className="h-4 w-4" />
                          Approve
                        </button>
                        <button onClick={() => handleReview(product.id, 'rejected')} className="flex items-center gap-2 rounded-2xl border border-red-200 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50">
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">No vendor products are waiting for approval.</p>
            )}
          </div>

          <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[0_12px_32px_rgba(96,82,62,0.08)] backdrop-blur-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Created products</h2>
                <p className="text-sm text-slate-500">Admin-created products and vendor-created products live together here.</p>
              </div>
              <div className="rounded-2xl bg-[rgba(31,76,69,0.08)] px-4 py-2 font-mono text-xs uppercase tracking-[0.25em] text-[#5a544a]">{products.length} total</div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-700" /></div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-800">
                    <Package2 className="h-4 w-4" />
                    Existing admin-created products
                  </div>
                  <div className="space-y-4">
                    {adminProducts.length ? adminProducts.map((product) => (
                      <article key={product.id} className="rounded-[1.45rem] border border-[var(--border)] bg-[rgba(255,255,255,0.55)] p-5">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div>
                            <div className="flex items-center gap-3">
                              <div className="rounded-2xl bg-[rgba(31,76,69,0.1)] p-3 text-[var(--primary)]"><Package2 className="h-5 w-5" /></div>
                              <div>
                                <h3 className="font-semibold text-slate-900">{product.name}</h3>
                                <p className="mt-1 text-sm text-slate-500">{product.category} • {product.product_type}</p>
                              </div>
                            </div>
                            <p className="mt-4 text-sm text-slate-600">{product.description || 'No description provided.'}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{product.approval_status}</span>
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{product.vendor_count || 0} sellers linked</span>
                              {product.creator_name ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">Created by {product.creator_name}</span> : null}
                            </div>
                          </div>
                          <button onClick={() => handleDelete(product.id)} className="flex items-center gap-2 rounded-2xl border border-red-200 px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </article>
                    )) : <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">No admin products yet.</p>}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-800">
                    <ShieldAlert className="h-4 w-4" />
                    Vendor created
                  </div>
                  <div className="space-y-4">
                    {vendorProducts.length ? vendorProducts.map((product) => (
                      <article key={product.id} className="rounded-[1.45rem] border border-[var(--border)] bg-[rgba(255,255,255,0.55)] p-5">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div>
                            <h3 className="font-semibold text-slate-900">{product.name}</h3>
                            <p className="mt-1 text-sm text-slate-500">{product.creator_vendor_name || product.creator_name || 'Vendor'} • {product.category} • {product.product_type}</p>
                            <p className="mt-3 text-sm text-slate-600">{product.description || 'No description provided.'}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{product.approval_status}</span>
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{product.vendor_count || 0} sellers linked</span>
                              {product.approval_notes ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{product.approval_notes}</span> : null}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {product.approval_status !== 'approved' ? (
                              <button onClick={() => handleReview(product.id, 'approved')} className="flex items-center gap-2 rounded-2xl border border-emerald-200 px-4 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50">
                                <CheckCircle2 className="h-4 w-4" />
                                Approve
                              </button>
                            ) : null}
                            {product.approval_status !== 'rejected' ? (
                              <button onClick={() => handleReview(product.id, 'rejected')} className="flex items-center gap-2 rounded-2xl border border-red-200 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50">
                                <XCircle className="h-4 w-4" />
                                Reject
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    )) : <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">No vendor products yet.</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
