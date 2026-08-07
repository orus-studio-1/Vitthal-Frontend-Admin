'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck, ShieldAlert, Clock, Loader2, Search, FileText, CheckCircle2,
  XCircle, Eye, User, CreditCard, Building, Hash, ExternalLink, RefreshCw
} from 'lucide-react';
import DashboardLayout from '../../../components/dashboard-layout';
import { extractApiError, riderAPI } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';

interface KYCRider {
  id: string;
  special_rider_id: string;
  rider_name: string;
  rider_email: string;
  contact_phone: string | null;
  center_name: string;
  center_code: string;
  kyc_status: 'pending' | 'submitted' | 'approved' | 'rejected';
  id_doc_type: string | null;
  id_doc_number: string | null;
  id_doc_image_url: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  account_holder_name: string | null;
  rejection_reason: string | null;
  kyc_submitted_at: string | null;
  kyc_reviewed_at: string | null;
  created_at: string;
}

type FilterTab = 'submitted' | 'approved' | 'rejected' | 'all';

export default function KYCApprovalsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [riders, setRiders] = useState<KYCRider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('submitted');
  const [expandedRider, setExpandedRider] = useState<string | null>(null);
  const [rejectingRider, setRejectingRider] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    } else if (isAuthenticated) {
      fetchData();
    }
  }, [authLoading, isAuthenticated]);

  async function fetchData() {
    try {
      setLoading(true);
      setError('');
      const res = await riderAPI.getAll();
      setRiders(res.data.data || []);
    } catch (err) {
      setError(extractApiError(err, 'Failed to load rider data.'));
    } finally {
      setLoading(false);
    }
  }

  const handleApprove = async (riderId: string) => {
    try {
      setError('');
      setSuccess('');
      await riderAPI.updateKYCStatus(riderId, 'approved');
      setSuccess('✅ Rider KYC has been approved. They now have full app access.');
      fetchData();
    } catch (err) {
      setError(extractApiError(err, 'Failed to approve rider KYC.'));
    }
  };

  const handleReject = async (riderId: string) => {
    try {
      setError('');
      setSuccess('');
      await riderAPI.updateKYCStatus(riderId, 'rejected', rejectionReason || undefined);
      setSuccess('Rider KYC has been sent back for review.');
      setRejectingRider(null);
      setRejectionReason('');
      fetchData();
    } catch (err) {
      setError(extractApiError(err, 'Failed to reject rider KYC.'));
    }
  };

  const filteredRiders = riders.filter((r) => {
    const matchesFilter = activeFilter === 'all' || r.kyc_status === activeFilter;
    if (!matchesFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.rider_name.toLowerCase().includes(q) ||
      r.rider_email.toLowerCase().includes(q) ||
      r.special_rider_id.toLowerCase().includes(q) ||
      r.center_name.toLowerCase().includes(q) ||
      (r.id_doc_number && r.id_doc_number.toLowerCase().includes(q))
    );
  });

  const stats = {
    submitted: riders.filter((r) => r.kyc_status === 'submitted').length,
    approved: riders.filter((r) => r.kyc_status === 'approved').length,
    rejected: riders.filter((r) => r.kyc_status === 'rejected').length,
    pending: riders.filter((r) => r.kyc_status === 'pending').length,
  };

  const filterTabs: { id: FilterTab; label: string; count: number; color: string }[] = [
    { id: 'submitted', label: 'Pending Review', count: stats.submitted, color: 'amber' },
    { id: 'approved', label: 'Approved', count: stats.approved, color: 'emerald' },
    { id: 'rejected', label: 'Sent for Review', count: stats.rejected, color: 'rose' },
    { id: 'all', label: 'All Riders', count: riders.length, color: 'slate' },
  ];

  const docTypeLabel = (type: string | null) => {
    if (!type) return 'Unknown';
    const map: Record<string, string> = {
      aadhaar: 'Aadhaar Card',
      pan: 'PAN Card',
      driving_license: 'Driving License',
    };
    return map[type] || type;
  };

  if (authLoading) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              KYC Verification & Approvals
            </h1>
            <p className="text-sm text-slate-500">
              Review submitted rider partner KYC documents, verify identity attachments, and approve or reject profiles.
            </p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/60 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800">
              <ShieldAlert className="h-4 w-4 text-amber-600 animate-pulse" />
              Awaiting Review
            </div>
            <div className="mt-2 text-3xl font-bold text-amber-700">{stats.submitted}</div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Approved
            </div>
            <div className="mt-2 text-3xl font-bold text-emerald-700">{stats.approved}</div>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-800">
              <XCircle className="h-4 w-4 text-rose-600" />
              Sent for Review
            </div>
            <div className="mt-2 text-3xl font-bold text-rose-700">{stats.rejected}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Clock className="h-4 w-4 text-slate-400" />
              Not Submitted
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-600">{stats.pending}</div>
          </div>
        </div>

        {/* Filter Tabs + Search */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 flex-wrap">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition border ${
                  activeFilter === tab.id
                    ? `bg-${tab.color}-600 text-white border-${tab.color}-600 shadow-md`
                    : `bg-white text-slate-600 border-slate-200 hover:bg-slate-50`
                }`}
                style={
                  activeFilter === tab.id
                    ? {
                        backgroundColor:
                          tab.color === 'amber'
                            ? '#d97706'
                            : tab.color === 'emerald'
                              ? '#059669'
                              : tab.color === 'rose'
                                ? '#e11d48'
                                : '#475569',
                        color: '#fff',
                        borderColor: 'transparent',
                      }
                    : {}
                }
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          <div className="relative max-w-sm flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, ID, document number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm outline-none transition focus:border-slate-400"
            />
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            {success}
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex h-60 items-center justify-center gap-2 text-sm text-slate-500 rounded-2xl border border-slate-200 bg-white">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading KYC profiles...
            </div>
          ) : filteredRiders.length === 0 ? (
            <div className="flex h-60 flex-col items-center justify-center text-slate-500 rounded-2xl border border-slate-200 bg-white">
              <ShieldCheck className="h-10 w-10 text-slate-300" />
              <p className="mt-4 text-sm">No riders matching the selected filter.</p>
            </div>
          ) : (
            filteredRiders.map((rider) => {
              const isExpanded = expandedRider === rider.id;
              return (
                <div
                  key={rider.id}
                  className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition-all ${
                    rider.kyc_status === 'submitted'
                      ? 'border-amber-200'
                      : rider.kyc_status === 'approved'
                        ? 'border-emerald-200'
                        : rider.kyc_status === 'rejected'
                          ? 'border-rose-200'
                          : 'border-slate-200'
                  }`}
                >
                  {/* Card Header Row */}
                  <div
                    className="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer hover:bg-slate-50/50 transition"
                    onClick={() => setExpandedRider(isExpanded ? null : rider.id)}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-700 shrink-0">
                        {rider.rider_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-sm truncate">{rider.rider_name}</div>
                        <div className="text-xs text-slate-500 truncate">
                          {rider.special_rider_id} · {rider.rider_email} · {rider.center_name} ({rider.center_code})
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Status Badge */}
                      {rider.kyc_status === 'submitted' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-xs font-bold text-amber-800">
                          <ShieldAlert className="h-3.5 w-3.5 animate-pulse" />
                          Pending Review
                        </span>
                      )}
                      {rider.kyc_status === 'approved' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 text-xs font-bold text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approved
                        </span>
                      )}
                      {rider.kyc_status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-300 px-3 py-1 text-xs font-bold text-rose-800">
                          <XCircle className="h-3.5 w-3.5" />
                          Sent for Review
                        </span>
                      )}
                      {rider.kyc_status === 'pending' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500">
                          <Clock className="h-3.5 w-3.5" />
                          Not Submitted
                        </span>
                      )}
                      <Eye className={`h-4 w-4 transition ${isExpanded ? 'text-blue-600 rotate-0' : 'text-slate-400'}`} />
                    </div>
                  </div>

                  {/* Expanded Details Panel */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-5 space-y-5">
                      {rider.kyc_status === 'pending' ? (
                        <p className="text-sm text-slate-500 italic">
                          This rider has not submitted any KYC documents yet.
                        </p>
                      ) : (
                        <>
                          {/* Document Details Grid */}
                          <div className="grid gap-5 sm:grid-cols-2">
                            {/* Identity Document Section */}
                            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5" />
                                Identity Document
                              </h4>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-500">Document Type:</span>
                                  <span className="font-semibold text-slate-900">{docTypeLabel(rider.id_doc_type)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-500">Document Number:</span>
                                  <span className="font-mono font-bold text-slate-900">{rider.id_doc_number || '—'}</span>
                                </div>
                                {rider.id_doc_image_url && (
                                  <a
                                    href={rider.id_doc_image_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    View Uploaded Document (Image / PDF) ↗
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Bank Account Section */}
                            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                <Building className="h-3.5 w-3.5" />
                                Bank Payout Details
                              </h4>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-500">Account Holder:</span>
                                  <span className="font-semibold text-slate-900">{rider.account_holder_name || '—'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-500">Bank Name:</span>
                                  <span className="font-semibold text-slate-900">{rider.bank_name || '—'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-500">Account Number:</span>
                                  <span className="font-mono font-bold text-slate-900">{rider.account_number || '—'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-500">IFSC Code:</span>
                                  <span className="font-mono font-bold text-slate-900">{rider.ifsc_code || '—'}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Rejection Reason (if already rejected) */}
                          {rider.kyc_status === 'rejected' && rider.rejection_reason && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                              <p className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-1">Previous Rejection Reason</p>
                              <p className="text-sm text-rose-800">{rider.rejection_reason}</p>
                            </div>
                          )}

                          {/* Timeline Info */}
                          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                            {rider.kyc_submitted_at && (
                              <span>Submitted: <strong className="text-slate-700">{new Date(rider.kyc_submitted_at).toLocaleString()}</strong></span>
                            )}
                            {rider.kyc_reviewed_at && (
                              <span>Reviewed: <strong className="text-slate-700">{new Date(rider.kyc_reviewed_at).toLocaleString()}</strong></span>
                            )}
                          </div>

                          {/* Action Buttons */}
                          {(rider.kyc_status === 'submitted' || rider.kyc_status === 'rejected') && (
                            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleApprove(rider.id); }}
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition shadow-sm"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                Approve KYC & Grant Access
                              </button>

                              {rejectingRider === rider.id ? (
                                <div className="flex items-center gap-2 flex-1 min-w-[300px]">
                                  <input
                                    type="text"
                                    placeholder="Rejection reason (optional)..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-300"
                                  />
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleReject(rider.id); }}
                                    className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 transition shadow-sm"
                                  >
                                    Confirm Reject
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setRejectingRider(null); }}
                                    className="text-xs text-slate-500 hover:text-slate-700"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setRejectingRider(rider.id); }}
                                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100 transition"
                                >
                                  <XCircle className="h-4 w-4" />
                                  Send Back for Review
                                </button>
                              )}
                            </div>
                          )}
                        </>
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
