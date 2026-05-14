'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, CheckCircle2, Eye, Loader2, ToggleLeft, ToggleRight, XCircle } from 'lucide-react';
import DashboardLayout from '../../../components/dashboard-layout';
import VendorInsightsModal from '../../../components/vendor-insights-modal';
import { extractApiError, vendorAPI } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { Vendor, VendorInsightsData } from '../../../lib/types';

export default function VendorsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorInsights, setVendorInsights] = useState<VendorInsightsData | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState('');
  const [timeframe, setTimeframe] = useState<'month' | '6months' | 'year'>('year');

  async function fetchVendors() {
    try {
      setLoading(true);
      setError('');
      const response = await vendorAPI.getAll();
      setVendors(response.data.data);
    } catch (vendorsError) {
      setError(extractApiError(vendorsError, 'Failed to load vendors'));
    } finally {
      setLoading(false);
    }
  }

  async function loadVendorInsights(vendor: Vendor, nextTimeframe: 'month' | '6months' | 'year' = timeframe) {
    try {
      setInsightsLoading(true);
      setInsightsError('');
      const response = await vendorAPI.getInsights(vendor.id, nextTimeframe);
      setVendorInsights(response.data.data);
    } catch (detailsError) {
      setInsightsError(extractApiError(detailsError, 'Failed to load vendor analytics'));
    } finally {
      setInsightsLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (isAuthenticated) {
      const timer = window.setTimeout(() => {
        void fetchVendors();
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (selectedVendor) {
      void loadVendorInsights(selectedVendor, timeframe);
    }
  }, [timeframe]);

  const toggleVendorStatus = async (vendor: Vendor) => {
    try {
      await vendorAPI.updateStatus(vendor.id, { is_active: !vendor.is_active });
      await fetchVendors();
    } catch (updateError) {
      setError(extractApiError(updateError, 'Failed to update vendor status'));
    }
  };

  const reviewVendor = async (vendorId: string, decision: 'approved' | 'rejected') => {
    try {
      await vendorAPI.review(vendorId, decision);
      await fetchVendors();
    } catch (reviewError) {
      setError(extractApiError(reviewError, `Failed to ${decision} vendor`));
    }
  };

  const openVendorView = async (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setVendorInsights(null);
    await loadVendorInsights(vendor, timeframe);
  };

  if (authLoading || !isAuthenticated) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100"><Loader2 className="h-8 w-8 animate-spin text-blue-700" /></div>;
  }

  const pendingVendors = vendors.filter((vendor) => vendor.approval_status === 'pending');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Pending approvals</h1>
              <p className="text-sm text-slate-500">New vendor signups from the frontend arrive here for review.</p>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">{pendingVendors.length} pending</div>
          </div>

          {error ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-700" /></div>
          ) : pendingVendors.length ? (
            <div className="space-y-4">
              {pendingVendors.map((vendor) => (
                <article key={vendor.id} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">{vendor.company_name}</h3>
                      <p className="text-sm text-slate-500">{vendor.name} • {vendor.email}</p>
                      <p className="mt-2 text-sm text-slate-600">{vendor.phone || 'No phone'} {vendor.gst_number ? `• ${vendor.gst_number}` : ''}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => void openVendorView(vendor)} className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                      <button onClick={() => reviewVendor(vendor.id, 'approved')} className="flex items-center gap-2 rounded-2xl border border-emerald-200 px-4 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50">
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </button>
                      <button onClick={() => reviewVendor(vendor.id, 'rejected')} className="flex items-center gap-2 rounded-2xl border border-red-200 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50">
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">No vendors are waiting for approval.</p>
          )}
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Vendor list</h2>
              <p className="text-sm text-slate-500">Use View to inspect the same dashboard analytics the vendor sees in their own account.</p>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">{vendors.length} vendors</div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-700" /></div>
          ) : (
            <div className="space-y-4">
              {vendors.length ? vendors.map((vendor) => (
                <article key={vendor.id} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-blue-50 p-3 text-blue-700"><Building2 className="h-5 w-5" /></div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{vendor.company_name}</h3>
                          <p className="text-sm text-slate-500">{vendor.name} • {vendor.email}</p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-slate-600">{vendor.phone || 'No phone'} {vendor.gst_number ? `• ${vendor.gst_number}` : ''}</p>
                      <p className="mt-2 text-sm text-slate-500">Orders linked: {vendor.order_count || 0}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">{vendor.approval_status}</span>
                        {!vendor.is_active ? <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700">inactive</span> : null}
                        {vendor.is_blocked ? <span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-700">blocked</span> : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => void openVendorView(vendor)} className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                      {vendor.approval_status !== 'approved' ? (
                        <button onClick={() => reviewVendor(vendor.id, 'approved')} className="flex items-center gap-2 rounded-2xl border border-emerald-200 px-4 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50">
                          <CheckCircle2 className="h-4 w-4" />
                          Approve
                        </button>
                      ) : null}
                      {vendor.approval_status !== 'rejected' ? (
                        <button onClick={() => reviewVendor(vendor.id, 'rejected')} className="flex items-center gap-2 rounded-2xl border border-red-200 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50">
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      ) : null}
                      <button onClick={() => toggleVendorStatus(vendor)} className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                        {vendor.is_active ? <ToggleRight className="h-5 w-5 text-emerald-600" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
                        {vendor.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </article>
              )) : <p className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">No vendors available.</p>}
            </div>
          )}
        </section>
      </div>

      {selectedVendor ? (
        <VendorInsightsModal
          vendorName={selectedVendor.company_name}
          timeframe={timeframe}
          data={vendorInsights}
          loading={insightsLoading}
          error={insightsError}
          onClose={() => {
            setSelectedVendor(null);
            setVendorInsights(null);
            setInsightsError('');
          }}
          onTimeframeChange={(value) => setTimeframe(value)}
        />
      ) : null}
    </DashboardLayout>
  );
}
