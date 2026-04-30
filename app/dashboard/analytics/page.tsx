'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Loader2, TrendingUp } from 'lucide-react';
import DashboardLayout from '../../../components/dashboard-layout';
import { adminAPI, extractApiError } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { AnalyticsData } from '../../../lib/types';

const periods = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

export default function AnalyticsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [period, setPeriod] = useState('30');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchAnalytics(selectedPeriod: string) {
    try {
      setLoading(true);
      setError('');
      const response = await adminAPI.getAnalytics(selectedPeriod);
      setData(response.data.data);
    } catch (analyticsError) {
      setError(extractApiError(analyticsError, 'Failed to load analytics'));
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
        void fetchAnalytics(period);
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [authLoading, isAuthenticated, period, router]);

  if (authLoading || !isAuthenticated) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100"><Loader2 className="h-8 w-8 animate-spin text-blue-700" /></div>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="flex flex-col gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Analytics</h1>
            <p className="text-sm text-slate-500">Revenue, top products, top vendors, and status trends.</p>
          </div>
          <div className="min-w-48">
            <label className="form-label">Filter period</label>
            <select
              className="form-input"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            >
              {periods.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        {loading ? (
          <div className="flex items-center justify-center rounded-[1.75rem] border border-slate-200 bg-white py-20 shadow-sm"><Loader2 className="h-8 w-8 animate-spin text-blue-700" /></div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Top products</h2>
                <BarChart3 className="h-5 w-5 text-slate-400" />
              </div>
              <div className="space-y-3">
                {data?.topProducts.length ? data.topProducts.map((product) => (
                  <div key={product.product_id} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <p className="font-medium text-slate-900">{product.product?.name || 'Unknown product'}</p>
                    <p className="mt-1 text-slate-500">Orders: {product._count.product_id} • Revenue: ${Number(product._sum.total_amount || 0).toFixed(2)}</p>
                  </div>
                )) : <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">No product analytics yet.</p>}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Top vendors</h2>
                <TrendingUp className="h-5 w-5 text-slate-400" />
              </div>
              <div className="space-y-3">
                {data?.topVendors.length ? data.topVendors.map((vendor) => (
                  <div key={vendor.vendor_id} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <p className="font-medium text-slate-900">{vendor.vendor?.name || 'Unknown vendor'}</p>
                    <p className="mt-1 text-slate-500">Orders: {vendor._count.vendor_id} • Revenue: ${Number(vendor._sum.total_amount || 0).toFixed(2)}</p>
                  </div>
                )) : <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">No vendor analytics yet.</p>}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Delivered orders over time</h2>
                <span className="text-sm text-slate-500">{data?.period}</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {data?.ordersOverTime.length ? data.ordersOverTime.map((point) => (
                  <div key={point.date} className="rounded-2xl bg-slate-50 px-4 py-4">
                    <p className="text-sm font-medium text-slate-900">{new Date(point.date).toLocaleDateString()}</p>
                    <p className="mt-2 text-sm text-slate-500">Orders: {Number(point.count)}</p>
                    <p className="text-sm text-slate-500">Revenue: ${Number(point.revenue).toFixed(2)}</p>
                  </div>
                )) : <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500 xl:col-span-4">No delivered order trend data available.</p>}
              </div>
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
