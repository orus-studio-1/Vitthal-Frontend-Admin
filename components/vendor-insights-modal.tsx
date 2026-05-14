'use client';

import { Loader2, TrendingUp, X } from 'lucide-react';
import { VendorInsightsData } from '../lib/types';

type Props = {
  vendorName: string;
  timeframe: 'month' | '6months' | 'year';
  data: VendorInsightsData | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  onTimeframeChange: (value: 'month' | '6months' | 'year') => void;
};

function formatCurrency(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value.toFixed(2)}`;
}

function getStatusTone(status: string) {
  const key = status.toLowerCase();
  if (key === 'delivered') return 'bg-emerald-100 text-emerald-700';
  if (key === 'confirmed' || key === 'processing' || key === 'shipped') return 'bg-blue-100 text-blue-700';
  if (key === 'cancelled') return 'bg-red-100 text-red-700';
  return 'bg-amber-100 text-amber-700';
}

export default function VendorInsightsModal({
  vendorName,
  timeframe,
  data,
  loading,
  error,
  onClose,
  onTimeframeChange,
}: Props) {
  const maxRevenue = Math.max(...(data?.analytics.revenueChart.data || [0]), 1);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-6xl rounded-[2rem] border border-slate-200 bg-[#fafafa] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-[2rem] border-b border-slate-200 bg-[#fafafa]/95 px-6 py-5 backdrop-blur">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">Vendor view</p>
            <h2 className="text-2xl font-semibold text-slate-900">{vendorName}</h2>
            <p className="text-sm text-slate-500">Admin can see the same vendor-facing dashboard and analytics snapshot here.</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 outline-none"
              value={timeframe}
              onChange={(event) => onTimeframeChange(event.target.value as 'month' | '6months' | 'year')}
            >
              <option value="month">This Month</option>
              <option value="6months">Last 6 Months</option>
              <option value="year">This Year</option>
            </select>
            <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {loading && !data ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : data ? (
            <>
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">Total revenue</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{formatCurrency(data.dashboard.stats.totalRevenue)}</p>
                </article>
                <article className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">Total orders</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{data.dashboard.stats.totalOrders}</p>
                </article>
                <article className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">Active products</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{data.dashboard.stats.activeProducts}</p>
                </article>
                <article className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">Customers</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{data.dashboard.stats.totalCustomers}</p>
                </article>
              </section>

              <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <article className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Revenue trend</h3>
                      <p className="text-sm text-slate-500">Same revenue timeline the vendor sees on their dashboard.</p>
                    </div>
                    <TrendingUp className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="flex h-64 items-end gap-3">
                    {data.analytics.revenueChart.labels.map((label, index) => {
                      const value = data.analytics.revenueChart.data[index] || 0;
                      const height = `${Math.max((value / maxRevenue) * 100, value > 0 ? 10 : 4)}%`;
                      return (
                        <div key={`${label}-${index}`} className="flex flex-1 flex-col items-center gap-3">
                          <div className="flex h-full w-full items-end rounded-2xl bg-slate-100 px-1 pb-1">
                            <div className="w-full rounded-xl bg-emerald-500/85" style={{ height }} />
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-medium text-slate-700">{label}</p>
                            <p className="text-[11px] text-slate-400">{formatCurrency(value)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>

                <article className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">Analytics KPI</h3>
                  <div className="mt-5 space-y-4">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Total quantity sold</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-900">{data.analytics.kpi.totalQuantity}</p>
                      <p className="mt-1 text-sm text-emerald-700">{data.analytics.kpi.tonnageGrowth >= 0 ? '+' : ''}{data.analytics.kpi.tonnageGrowth}% vs previous period</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Average order value</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-900">{formatCurrency(data.analytics.kpi.avgOrderValue)}</p>
                      <p className="mt-1 text-sm text-emerald-700">{data.analytics.kpi.aovGrowth >= 0 ? '+' : ''}{data.analytics.kpi.aovGrowth}% vs previous period</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Top segment</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-900">{data.analytics.kpi.topSegment?.name || 'N/A'}</p>
                      <p className="mt-1 text-sm text-slate-500">{data.analytics.kpi.topSegment ? `${data.analytics.kpi.topSegment.percentage}% of total volume` : 'No category movement yet'}</p>
                    </div>
                  </div>
                </article>
              </section>

              <section className="grid gap-6 xl:grid-cols-2">
                <article className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">Recent orders</h3>
                  <div className="mt-5 space-y-3">
                    {data.dashboard.recentOrders.length ? data.dashboard.recentOrders.map((order) => (
                      <div key={order.orderId} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium text-slate-900">{order.customerName}</p>
                            <p className="text-sm text-slate-500">{order.productName}</p>
                            <p className="mt-1 text-xs text-slate-400">{new Date(order.date).toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-slate-900">{formatCurrency(order.amount)}</p>
                            <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusTone(order.status)}`}>
                              {order.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    )) : <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">No recent orders yet.</p>}
                  </div>
                </article>

                <article className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">Category distribution</h3>
                  <div className="mt-5 space-y-4">
                    {data.analytics.categoryDistribution.length ? data.analytics.categoryDistribution.map((item) => (
                      <div key={item.name}>
                        <div className="mb-2 flex items-center justify-between text-sm text-slate-700">
                          <span className="font-medium">{item.name}</span>
                          <span>{item.quantity} units • {formatCurrency(item.revenue)}</span>
                        </div>
                        <div className="h-3 rounded-full bg-slate-100">
                          <div className="h-3 rounded-full bg-blue-500" style={{ width: `${Math.max(item.percentage, 4)}%` }} />
                        </div>
                      </div>
                    )) : <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">No category data available.</p>}
                  </div>
                </article>
              </section>

              <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Top selling products</h3>
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="px-3 py-3 font-medium">Product</th>
                        <th className="px-3 py-3 font-medium">Category</th>
                        <th className="px-3 py-3 font-medium">Sales</th>
                        <th className="px-3 py-3 font-medium">Revenue</th>
                        <th className="px-3 py-3 font-medium">Growth</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.analytics.topProducts.length ? data.analytics.topProducts.map((product) => (
                        <tr key={product.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-4 font-medium text-slate-900">{product.name}</td>
                          <td className="px-3 py-4 text-slate-600">{product.category}</td>
                          <td className="px-3 py-4 text-slate-600">{product.sales}</td>
                          <td className="px-3 py-4 text-slate-600">{formatCurrency(product.revenue)}</td>
                          <td className={`px-3 py-4 font-medium ${product.growth >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {product.growth >= 0 ? '+' : ''}{product.growth}%
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="px-3 py-8 text-center text-slate-500">No top-product data available for this period.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
