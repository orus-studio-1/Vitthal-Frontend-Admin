'use client';

import { Loader2, X } from 'lucide-react';
import { UserDetailsData } from '../lib/types';

type Props = {
  data: UserDetailsData | null;
  loading: boolean;
  error: string;
  onClose: () => void;
};

function formatCurrency(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value.toFixed(2)}`;
}

export default function UserDetailsModal({ data, loading, error, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">User details</p>
            <h2 className="text-2xl font-semibold text-slate-900">{data?.user.name || 'Loading user'}</h2>
          </div>
          <button onClick={onClose} className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {loading && !data ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : data ? (
            <>
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-[1.4rem] bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Role</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{data.user.role}</p>
                </article>
                <article className="rounded-[1.4rem] bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Status</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{data.user.is_active ? 'Active' : 'Inactive'}</p>
                </article>
                <article className="rounded-[1.4rem] bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Customer orders</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{data.customerStats.totalOrders}</p>
                </article>
                <article className="rounded-[1.4rem] bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Customer spend</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{formatCurrency(data.customerStats.totalSpent)}</p>
                </article>
              </section>

              <section className="grid gap-6 xl:grid-cols-2">
                <article className="rounded-[1.6rem] border border-slate-200 p-5">
                  <h3 className="text-lg font-semibold text-slate-900">Profile</h3>
                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    <p><span className="font-medium text-slate-900">Email:</span> {data.user.email}</p>
                    <p><span className="font-medium text-slate-900">Created:</span> {data.user.created_at ? new Date(data.user.created_at).toLocaleString() : 'N/A'}</p>
                    <p><span className="font-medium text-slate-900">Updated:</span> {data.user.updated_at ? new Date(data.user.updated_at).toLocaleString() : 'N/A'}</p>
                    <p><span className="font-medium text-slate-900">Phone:</span> {data.clientProfile?.phone || data.vendorProfile?.phone || 'N/A'}</p>
                  </div>
                </article>

                <article className="rounded-[1.6rem] border border-slate-200 p-5">
                  <h3 className="text-lg font-semibold text-slate-900">Address</h3>
                  {data.address ? (
                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <p>{data.address.address}</p>
                      <p>{data.address.city}, {data.address.state}</p>
                      <p>{data.address.country} - {data.address.pincode}</p>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">No saved address.</p>
                  )}
                </article>
              </section>

              {data.vendorProfile ? (
                <section className="rounded-[1.6rem] border border-slate-200 p-5">
                  <h3 className="text-lg font-semibold text-slate-900">Vendor profile</h3>
                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Company</p>
                      <p className="mt-1 font-semibold text-slate-900">{data.vendorProfile.company_name}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Approval</p>
                      <p className="mt-1 font-semibold text-slate-900">{data.vendorProfile.approval_status}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Vendor orders</p>
                      <p className="mt-1 font-semibold text-slate-900">{data.vendorProfile.order_count}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Vendor revenue</p>
                      <p className="mt-1 font-semibold text-slate-900">{formatCurrency(data.vendorProfile.total_revenue)}</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <p><span className="font-medium text-slate-900">GST:</span> {data.vendorProfile.gst_number || 'N/A'}</p>
                    <p><span className="font-medium text-slate-900">Blocked:</span> {data.vendorProfile.is_blocked ? 'Yes' : 'No'}</p>
                    <p><span className="font-medium text-slate-900">Notes:</span> {data.vendorProfile.approval_notes || 'N/A'}</p>
                  </div>
                </section>
              ) : null}

              <section className="rounded-[1.6rem] border border-slate-200 p-5">
                <h3 className="text-lg font-semibold text-slate-900">Recent customer orders</h3>
                <div className="mt-4 space-y-3">
                  {data.recentOrders.length ? data.recentOrders.map((order) => (
                    <div key={order.id} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{order.vendor_name || 'Unknown vendor'}</p>
                          <p className="text-sm text-slate-500">{order.order_reference || order.id}</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="font-semibold text-slate-900">{formatCurrency(order.total_amount)}</p>
                          <p className="text-sm text-slate-500">{order.status} • {new Date(order.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  )) : <p className="text-sm text-slate-500">No recent orders found for this user.</p>}
                </div>
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
