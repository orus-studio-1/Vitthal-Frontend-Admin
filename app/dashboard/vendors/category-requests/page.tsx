'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  FolderPlus,
  Loader2,
  MessageSquareQuote,
  RefreshCw,
  Search,
  Tags,
  X,
  XCircle,
} from 'lucide-react';
import DashboardLayout from '../../../../components/dashboard-layout';
import { adminAPI, extractApiError } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth-context';
import type { VendorCategoryRequest, VendorCategoryRequestStatus } from '../../../../lib/types';

type FilterTab = VendorCategoryRequestStatus | 'all';
type Decision = 'approved' | 'rejected';

const STATUS_META: Record<VendorCategoryRequestStatus, { label: string; badge: string; border: string }> = {
  pending: { label: 'Pending Review', badge: 'bg-amber-100 border-amber-300 text-amber-800', border: 'border-amber-200' },
  approved: { label: 'Approved', badge: 'bg-emerald-100 border-emerald-300 text-emerald-800', border: 'border-emerald-200' },
  partially_approved: { label: 'Partly Approved', badge: 'bg-blue-100 border-blue-300 text-blue-800', border: 'border-blue-200' },
  rejected: { label: 'Rejected', badge: 'bg-rose-100 border-rose-300 text-rose-800', border: 'border-rose-200' },
};

const TABS: { id: FilterTab; label: string; active: string }[] = [
  { id: 'pending', label: 'Pending Review', active: 'bg-amber-600 border-amber-600' },
  { id: 'approved', label: 'Approved', active: 'bg-emerald-600 border-emerald-600' },
  { id: 'partially_approved', label: 'Partly Approved', active: 'bg-blue-600 border-blue-600' },
  { id: 'rejected', label: 'Rejected', active: 'bg-rose-600 border-rose-600' },
  { id: 'all', label: 'All Requests', active: 'bg-slate-600 border-slate-600' },
];

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function VendorCategoryRequestsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [requests, setRequests] = useState<VendorCategoryRequest[]>([]);
  const [counts, setCounts] = useState<Record<VendorCategoryRequestStatus, number>>({
    pending: 0, approved: 0, partially_approved: 0, rejected: 0,
  });
  const [activeFilter, setActiveFilter] = useState<FilterTab>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Review state for the expanded request
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async (filter: FilterTab) => {
    try {
      setLoading(true);
      setError('');
      const res = await adminAPI.getVendorCategoryRequests(filter);
      setRequests(res.data.data.requests || []);
      setCounts(res.data.data.counts);
    } catch (err) {
      setError(extractApiError(err, 'Failed to load category requests.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    } else if (isAuthenticated) {
      void fetchData(activeFilter);
    }
  }, [authLoading, isAuthenticated, activeFilter, fetchData, router]);

  const openRequest = (request: VendorCategoryRequest) => {
    if (expandedId === request.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(request.id);
    setNote('');
    // Every category starts approved; the admin crosses out the ones to remove.
    const initial: Record<string, Decision> = {};
    for (const item of request.items) initial[item.category_id] = item.is_active ? 'approved' : 'rejected';
    setDecisions(initial);
  };

  const setAll = (request: VendorCategoryRequest, decision: Decision) => {
    const next: Record<string, Decision> = {};
    for (const item of request.items) next[item.category_id] = decision === 'approved' && !item.is_active ? 'rejected' : decision;
    setDecisions(next);
  };

  const submitReview = async (request: VendorCategoryRequest) => {
    const rejectedCount = request.items.filter((i) => decisions[i.category_id] === 'rejected').length;
    if (rejectedCount > 0 && !note.trim()) {
      setError('Add a reason for the vendor when rejecting a category.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      const res = await adminAPI.reviewVendorCategoryRequest(request.id, decisions, note.trim() || undefined);
      setSuccess(res.data.message);
      setExpandedId(null);
      await fetchData(activeFilter);
    } catch (err) {
      setError(extractApiError(err, 'Failed to save the review.'));
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((r) =>
      [r.company_name, r.vendor_name, r.vendor_email, ...r.items.map((i) => i.label)]
        .some((value) => value?.toLowerCase().includes(q))
    );
  }, [requests, searchQuery]);

  const totalAll = counts.pending + counts.approved + counts.partially_approved + counts.rejected;

  if (authLoading) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Vendor Category Requests</h1>
            <p className="text-sm text-slate-500">
              Review product vendors&apos; requests for extra categories. Approved categories let the vendor find and list
              those catalogue products.
            </p>
          </div>
          <button
            onClick={() => void fetchData(activeFilter)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/60 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800">
              <Clock className="h-4 w-4 text-amber-600" />
              Awaiting Review
            </div>
            <div className="mt-2 text-3xl font-bold text-amber-700">{counts.pending}</div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Approved
            </div>
            <div className="mt-2 text-3xl font-bold text-emerald-700">{counts.approved}</div>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-800">
              <Tags className="h-4 w-4 text-blue-600" />
              Partly Approved
            </div>
            <div className="mt-2 text-3xl font-bold text-blue-700">{counts.partially_approved}</div>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-800">
              <XCircle className="h-4 w-4 text-rose-600" />
              Rejected
            </div>
            <div className="mt-2 text-3xl font-bold text-rose-700">{counts.rejected}</div>
          </div>
        </div>

        {/* Tabs + search */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => {
              const count = tab.id === 'all' ? totalAll : counts[tab.id];
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveFilter(tab.id); setExpandedId(null); }}
                  className={`rounded-xl border px-4 py-2 text-xs font-bold transition ${
                    isActive ? `${tab.active} text-white shadow-md` : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tab.label} ({count})
                </button>
              );
            })}
          </div>
          <div className="relative max-w-sm flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search vendor or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm outline-none transition focus:border-slate-400"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">{error}</div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">{success}</div>
        )}

        {/* List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex h-60 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading category requests...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-60 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500">
              <FolderPlus className="h-10 w-10 text-slate-300" />
              <p className="mt-4 text-sm">No category requests for this filter.</p>
            </div>
          ) : (
            filtered.map((request) => {
              const meta = STATUS_META[request.status];
              const isExpanded = expandedId === request.id;
              const isPending = request.status === 'pending';
              const approveCount = request.items.filter((i) => decisions[i.category_id] === 'approved').length;
              const rejectCount = request.items.length - approveCount;
              const displayName = request.company_name || request.vendor_name || 'Vendor';

              return (
                <div key={request.id} className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all ${meta.border}`}>
                  {/* Card header */}
                  <div
                    className="flex cursor-pointer items-center justify-between gap-4 px-6 py-4 transition hover:bg-slate-50/50"
                    onClick={() => openRequest(request)}
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-700">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-900">{displayName}</div>
                        <div className="truncate text-xs text-slate-500">
                          {request.vendor_name}{request.vendor_email ? ` · ${request.vendor_email}` : ''} · Requested {formatDate(request.created_at)}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {request.items.map((item) => (
                            <span
                              key={item.category_id}
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                                item.status === 'approved'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : item.status === 'rejected'
                                    ? 'border-rose-200 bg-rose-50 text-rose-700 line-through decoration-rose-300'
                                    : 'border-slate-200 bg-slate-50 text-slate-700'
                              }`}
                            >
                              {item.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${meta.badge}`}>
                        {meta.label}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-slate-400 transition ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="space-y-5 border-t border-slate-100 bg-slate-50/50 px-6 py-5">
                      <div className="grid gap-5 lg:grid-cols-2">
                        {/* Reason + current categories */}
                        <div className="space-y-4">
                          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
                            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                              <MessageSquareQuote className="h-3.5 w-3.5" />
                              Vendor&apos;s Reason
                            </h4>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{request.reason}</p>
                          </div>
                          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
                            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                              <Tags className="h-3.5 w-3.5" />
                              Current Categories ({request.current_categories.length})
                            </h4>
                            {request.current_categories.length === 0 ? (
                              <p className="text-sm italic text-slate-500">No categories assigned yet.</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {request.current_categories.map((c) => (
                                  <span key={c.id} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                                    {c.label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Requested categories with decisions */}
                        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                              <FolderPlus className="h-3.5 w-3.5" />
                              Requested Categories ({request.items.length})
                            </h4>
                            {isPending && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setAll(request, 'approved')}
                                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100"
                                >
                                  Approve all
                                </button>
                                <button
                                  onClick={() => setAll(request, 'rejected')}
                                  className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 transition hover:bg-rose-100"
                                >
                                  Reject all
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                            {request.items.map((item) => {
                              const decision = isPending ? decisions[item.category_id] : item.status;
                              const noCommission = Number(item.max_commission) === 0;
                              return (
                                <div key={item.category_id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                                  <div className="min-w-0">
                                    <p className={`text-sm font-semibold ${decision === 'rejected' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                      {item.label}
                                    </p>
                                    <p className="text-[11px] text-slate-500">
                                      {item.product_count} catalogue products · {item.vendor_count} vendors
                                    </p>
                                    {(!item.is_active || noCommission) && (
                                      <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                                        <AlertTriangle className="h-3 w-3" />
                                        {!item.is_active ? 'Category is inactive, cannot be approved' : 'Commission not set for this category (0%)'}
                                      </p>
                                    )}
                                  </div>
                                  {isPending ? (
                                    <div className="flex shrink-0 items-center gap-1.5">
                                      <button
                                        type="button"
                                        title="Approve"
                                        aria-label={`Approve ${item.label}`}
                                        disabled={!item.is_active}
                                        onClick={() => setDecisions((d) => ({ ...d, [item.category_id]: 'approved' }))}
                                        className={`flex h-8 w-8 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-40 ${
                                          decision === 'approved'
                                            ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                                            : 'border-slate-200 bg-white text-slate-400 hover:border-emerald-300 hover:text-emerald-600'
                                        }`}
                                      >
                                        <Check className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        title="Reject"
                                        aria-label={`Reject ${item.label}`}
                                        onClick={() => setDecisions((d) => ({ ...d, [item.category_id]: 'rejected' }))}
                                        className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                                          decision === 'rejected'
                                            ? 'border-rose-600 bg-rose-600 text-white shadow-sm'
                                            : 'border-slate-200 bg-white text-slate-400 hover:border-rose-300 hover:text-rose-600'
                                        }`}
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <span
                                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                                        item.status === 'approved'
                                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                          : 'border-rose-200 bg-rose-50 text-rose-700'
                                      }`}
                                    >
                                      {item.status === 'approved' ? 'Approved' : 'Rejected'}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {isPending ? (
                        <div className="space-y-3 border-t border-slate-100 pt-4">
                          <label className="block">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              Note to the vendor {rejectCount > 0 ? <span className="text-rose-600">* required when rejecting</span> : '(optional)'}
                            </span>
                            <textarea
                              value={note}
                              onChange={(e) => setNote(e.target.value)}
                              rows={3}
                              maxLength={1000}
                              placeholder={
                                rejectCount > 0
                                  ? 'Explain why some categories were not approved. The vendor will see this message.'
                                  : 'Optional message for the vendor, e.g. any conditions for listing in these categories.'
                              }
                              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-slate-400"
                            />
                          </label>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-slate-500">
                              <span className="font-bold text-emerald-700">{approveCount} to approve</span>
                              {' · '}
                              <span className="font-bold text-rose-700">{rejectCount} to reject</span>
                              {' · '}The vendor is notified with your note.
                            </p>
                            <button
                              onClick={() => void submitReview(request)}
                              disabled={submitting}
                              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:opacity-60 ${
                                approveCount === 0 ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                              }`}
                            >
                              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : approveCount === 0 ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                              {approveCount === 0
                                ? 'Reject Request'
                                : rejectCount === 0
                                  ? `Approve ${approveCount === 1 ? 'Category' : `All ${approveCount} Categories`}`
                                  : `Approve ${approveCount} & Reject ${rejectCount}`}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 border-t border-slate-100 pt-4">
                          {request.admin_note && (
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Admin Note</p>
                              <p className="whitespace-pre-wrap text-sm text-slate-800">{request.admin_note}</p>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                            <span>Submitted: <strong className="text-slate-700">{formatDate(request.created_at)}</strong></span>
                            <span>Reviewed: <strong className="text-slate-700">{formatDate(request.reviewed_at)}</strong></span>
                            {request.reviewed_by_name && (
                              <span>By: <strong className="text-slate-700">{request.reviewed_by_name}</strong></span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
