'use client';

import { useState } from 'react';
import { 
  Loader2, 
  TrendingUp, 
  X, 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  FileText, 
  MapPin, 
  CreditCard, 
  Briefcase,
  Layers,
  Percent
} from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'profile' | 'analytics'>('profile');
  const maxRevenue = Math.max(...(data?.analytics.revenueChart.data || [0]), 1);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-6xl rounded-[2rem] border border-slate-200 bg-[#fafafa] shadow-2xl">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 flex flex-col md:flex-row md:items-center justify-between rounded-t-[2rem] border-b border-slate-200 bg-[#fafafa]/95 px-6 py-5 backdrop-blur gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">Vendor view</p>
            <h2 className="text-2xl font-semibold text-slate-900">{vendorName}</h2>
            <p className="text-sm text-slate-500">Inspect the complete registration profile or analytics snapshot below.</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Tab controls */}
            <div className="flex bg-slate-100 p-1 rounded-xl mr-2">
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                  activeTab === 'profile'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Registration Details
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                  activeTab === 'analytics'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Analytics & Activity
              </button>
            </div>

            {activeTab === 'analytics' && (
              <select
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 outline-none"
                value={timeframe}
                onChange={(event) => onTimeframeChange(event.target.value as 'month' | '6months' | 'year')}
              >
                <option value="month">This Month</option>
                <option value="6months">Last 6 Months</option>
                <option value="year">This Year</option>
              </select>
            )}
            <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="space-y-6 p-6">
          {loading && !data ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : data ? (
            activeTab === 'profile' ? (
              /* REGISTRATION PROFILE TAB */
              <div className="grid gap-6 md:grid-cols-2">
                {/* 1. Contact Information Card */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">Contact Information</h3>
                      <p className="text-xs text-slate-500">Primary representative contact info</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 pt-2">
                    <div className="flex items-start gap-3">
                      <Building2 className="h-4 w-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-400">Full Name</p>
                        <p className="text-sm font-semibold text-slate-800">{data.vendor.name || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Mail className="h-4 w-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-400">Email Address</p>
                        <p className="text-sm font-semibold text-slate-800">{data.vendor.email || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Phone className="h-4 w-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-400">Phone Number</p>
                        <p className="text-sm font-semibold text-slate-800">{data.vendor.phone || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Phone className="h-4 w-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-400">Alternative Phone</p>
                        <p className="text-sm font-semibold text-slate-800">{data.vendor.alternative_number || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Layers className="h-4 w-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-400">Designation / Role</p>
                        <p className="text-sm font-semibold text-slate-800">{data.vendor.designation || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Business Overview Card */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">Business Details</h3>
                      <p className="text-xs text-slate-500">Company profile and operations</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-slate-400">Business Type</p>
                        <p className="text-sm font-semibold text-slate-800">{data.vendor.business_type || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Credit Cycle</p>
                        <p className="text-sm font-semibold text-slate-800">{data.vendor.credit_cycle || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Vendor Type</p>
                        {data.vendor.vendor_type ? (
                          <span className={`inline-flex items-center mt-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                            data.vendor.vendor_type === 'service'
                              ? 'bg-violet-50 border-violet-200 text-violet-700'
                              : data.vendor.vendor_type === 'both'
                              ? 'bg-teal-50 border-teal-200 text-teal-700'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          }`}>
                            {data.vendor.vendor_type === 'service' ? '🔧 Service' : data.vendor.vendor_type === 'both' ? '📦🔧 Both' : '📦 Product'}
                          </span>
                        ) : (
                          <p className="text-sm font-semibold text-slate-800">N/A</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Globe className="h-4 w-4 text-slate-400 mt-0.5" />
                      <div className="flex-1 overflow-hidden">
                        <p className="text-xs text-slate-400">Company Website</p>
                        {data.vendor.company_website ? (
                          <a
                            href={data.vendor.company_website.startsWith('http') ? data.vendor.company_website : `https://${data.vendor.company_website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold text-blue-600 hover:underline truncate block"
                          >
                            {data.vendor.company_website}
                          </a>
                        ) : (
                          <p className="text-sm font-semibold text-slate-800">N/A</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">Business Description</p>
                      <p className="text-sm text-slate-600 mt-1 bg-slate-50 p-3 rounded-2xl border border-slate-100 max-h-32 overflow-y-auto whitespace-pre-line leading-relaxed">
                        {data.vendor.business_description || 'No description provided.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Compliance & Financial Card */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">Financial & Compliance</h3>
                      <p className="text-xs text-slate-500">GST, certificate, and commission setup</p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-400">GST Number</p>
                        <p className="text-sm font-semibold text-slate-800">{data.vendor.gst_number || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">GST Certificate</p>
                        {data.vendor.gst_certificate_link ? (
                          <a
                            href={data.vendor.gst_certificate_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 transition mt-1"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            View Certificate
                          </a>
                        ) : (
                          <p className="text-sm font-semibold text-slate-800">Not uploaded</p>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                      <p className="text-xs text-slate-400">Vendor Signature</p>
                      {data.vendor.vendor_signature_image_link ? (
                        <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                          <img
                            src={data.vendor.vendor_signature_image_link}
                            alt="Vendor signature"
                            className="h-28 w-full object-contain bg-white"
                          />
                        </div>
                      ) : (
                        <p className="mt-1 text-sm font-semibold text-red-600">Not uploaded</p>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <div className="flex items-center gap-2 mb-2 text-slate-700 font-medium text-xs">
                        <Percent className="h-4 w-4 text-slate-400" />
                        Commission Range
                      </div>
                      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div>
                          <p className="text-[10px] text-slate-400">Min Commission</p>
                          <p className="text-sm font-bold text-slate-800">
                            {data.vendor.minimum_commision_percentage !== null ? `${data.vendor.minimum_commision_percentage}%` : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Max Commission</p>
                          <p className="text-sm font-bold text-slate-800">
                            {data.vendor.maximum_commision_percentage !== null ? `${data.vendor.maximum_commision_percentage}%` : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Product Categories Badge List */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <div className="rounded-2xl bg-purple-50 p-3 text-purple-700">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">Product Categories</h3>
                      <p className="text-xs text-slate-500">Categories this vendor deals in</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    {data.vendor.categories && data.vendor.categories.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {data.vendor.categories.map((cat: any) => (
                          <span 
                            key={cat.code} 
                            className="px-3.5 py-2 rounded-2xl text-xs font-semibold bg-purple-50 border border-purple-200/50 text-purple-700"
                          >
                            {cat.label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-2xl text-center">No categories selected.</p>
                    )}
                  </div>
                </div>

                {/* 5. Address Details Card (Full-width spanning) */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 md:col-span-2">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <div className="rounded-2xl bg-red-50 p-3 text-red-700">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">Registered Address</h3>
                      <p className="text-xs text-slate-500">Physical office or warehouse location</p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 pt-2">
                    <div>
                      <p className="text-xs text-slate-400">Street Address</p>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">{data.vendor.address || 'N/A'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-400">City</p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{data.vendor.city || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">State</p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{data.vendor.state || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-400">Country</p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{data.vendor.country || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Pincode</p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{data.vendor.pincode || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ANALYTICS & ACTIVITY TAB */
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
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
