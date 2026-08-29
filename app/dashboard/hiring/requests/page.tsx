'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  ArrowLeft,
  FileCheck2,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Eye,
  User,
  Building,
  Phone,
  Mail,
  Loader2,
  Sparkles,
  AlertCircle,
  X,
  MessageSquare,
} from 'lucide-react';
import DashboardLayout from '../../../../components/dashboard-layout';
import { extractApiError, hiringAPI } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth-context';
import type { HireRequest } from '../../../../lib/types';

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected' | 'completed';

export default function HireRequestsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [requests, setRequests] = useState<HireRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Action modal
  const [selectedRequest, setSelectedRequest] = useState<HireRequest | null>(null);
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | 'complete' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    } else if (isAuthenticated) {
      loadRequests();
    }
  }, [authLoading, isAuthenticated, activeTab]);

  async function loadRequests() {
    try {
      setLoading(true);
      setError('');
      const res = await hiringAPI.getAllHireRequests({
        status: activeTab === 'all' ? undefined : activeTab,
      });
      setRequests(res.data.data || []);
    } catch (err) {
      setError(extractApiError(err, 'Failed to load hire requests.'));
    } finally {
      setLoading(false);
    }
  }

  const handleReviewAction = async () => {
    if (!selectedRequest || !modalAction) return;

    try {
      setSubmittingAction(true);
      setError('');
      setSuccess('');
      const res = await hiringAPI.reviewHireRequest(selectedRequest.id, modalAction, adminNotes);
      setSuccess(`✅ ${res.data.message || 'Hire request updated.'}`);
      setSelectedRequest(null);
      setModalAction(null);
      setAdminNotes('');
      await loadRequests();
    } catch (err) {
      setError(extractApiError(err, 'Failed to update request.'));
    } finally {
      setSubmittingAction(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.candidate_name?.toLowerCase().includes(q) ||
      r.candidate_designation?.toLowerCase().includes(q) ||
      r.requester_name?.toLowerCase().includes(q) ||
      r.requester_email?.toLowerCase().includes(q)
    );
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;

  return (
    <DashboardLayout>
      <div className="space-y-8 p-6 lg:p-10">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/hiring"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                  Client & Vendor Hire Requests
                </h1>
                {pendingCount > 0 && (
                  <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold text-white">
                    {pendingCount} Pending
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500">
                Review and approve hiring contracts placed by companies and vendors for registered candidates.
              </p>
            </div>
          </div>

          <button
            onClick={loadRequests}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <span>{error}</span>
            <button onClick={() => setError('')} className="font-semibold text-rose-900">
              Dismiss
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="font-semibold text-emerald-900">
              Dismiss
            </button>
          </div>
        )}

        {/* Tabs & Search */}
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'pending', 'approved', 'rejected', 'completed'] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-2xl px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                  activeTab === tab
                    ? 'bg-[#1f2d2d] text-[#f5ecdf] shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidate or requester..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-72 rounded-2xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs text-slate-800 focus:border-[#ccb27a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ccb27a]/20"
            />
          </div>
        </div>

        {/* Modal for Approve / Reject / Complete */}
        {selectedRequest && modalAction && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl ring-1 ring-black/5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">
                {modalAction === 'approve' && 'Approve Hire Request'}
                {modalAction === 'reject' && 'Reject Hire Request'}
                {modalAction === 'complete' && 'Mark Engagement as Completed'}
              </h3>
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setModalAction(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4 text-xs space-y-1">
                <p>
                  <strong>Candidate:</strong> {selectedRequest.candidate_name} (
                  {selectedRequest.candidate_designation})
                </p>
                <p>
                  <strong>Requester:</strong> {selectedRequest.requester_name} ({selectedRequest.requester_email})
                </p>
                {selectedRequest.request_details?.notes && (
                  <p>
                    <strong>Requirements:</strong> {selectedRequest.request_details.notes}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Admin Notes / Feedback (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Notes sent to the requester or stored for record..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-900 focus:border-[#ccb27a] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setModalAction(null);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReviewAction}
                  disabled={submittingAction}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-semibold text-white shadow-sm ${
                    modalAction === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : modalAction === 'complete'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submittingAction && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Confirm {modalAction.toUpperCase()}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Requests Table */}
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
          {loading ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-500">
              <RefreshCw className="h-6 w-6 animate-spin text-[#ccb27a]" />
              <p className="text-sm font-medium">Loading hire requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-500">
              <FileCheck2 className="h-10 w-10 text-slate-300" />
              <p className="text-base font-semibold text-slate-700">No hire requests found</p>
              <p className="text-xs text-slate-400">
                {activeTab !== 'all' ? `No ${activeTab} hire requests.` : 'Incoming hire requests from clients will appear here.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Candidate</th>
                    <th className="px-6 py-4">Requester / Company</th>
                    <th className="px-6 py-4">Hiring Terms</th>
                    <th className="px-6 py-4">Requested On</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.map((req) => {
                    const isPending = req.status === 'pending';
                    const isApproved = req.status === 'approved';
                    const isRejected = req.status === 'rejected';
                    const isCompleted = req.status === 'completed';

                    return (
                      <tr key={req.id} className="transition hover:bg-slate-50/60">
                        {/* Candidate info */}
                        <td className="px-6 py-4">
                          <Link
                            href={`/dashboard/hiring/${req.candidate_id}`}
                            className="group flex items-center gap-3"
                          >
                            {req.candidate_photo ? (
                              <img
                                src={req.candidate_photo}
                                alt={req.candidate_name || 'Candidate'}
                                className="h-10 w-10 rounded-2xl object-cover ring-2 ring-slate-100"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 font-bold text-white shadow-sm">
                                {(req.candidate_name || 'C').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-slate-900 group-hover:text-[#ccb27a]">
                                {req.candidate_name}
                              </p>
                              <p className="text-xs text-slate-400">{req.candidate_designation}</p>
                              {req.candidate_phone && <p className="text-[11px] text-slate-400">{req.candidate_phone}</p>}
                            </div>
                          </Link>
                        </td>

                        {/* Requester info */}
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900">{req.requester_name || 'Client User'}</p>
                          <p className="text-xs text-slate-400">{req.requester_email}</p>
                          {req.request_details?.company_name && (
                            <p className="text-xs font-medium text-[#ccb27a]">
                              {req.request_details.company_name}
                            </p>
                          )}
                        </td>

                        {/* Terms & Notes */}
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {req.request_details?.hiring_type && (
                              <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 capitalize">
                                {req.request_details.hiring_type}
                              </span>
                            )}
                            {req.request_details?.salary_offered && (
                              <p className="text-xs font-medium text-slate-800">
                                Offered: ₹{req.request_details.salary_offered}
                              </p>
                            )}
                            {req.request_details?.duration && (
                              <p className="text-xs text-slate-500">Duration: {req.request_details.duration}</p>
                            )}
                            {req.request_details?.notes && (
                              <p className="max-w-xs truncate text-xs text-slate-400 italic">
                                "{req.request_details.notes}"
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Date */}
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {new Date(req.created_at).toLocaleDateString()}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          {isPending && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                              <Clock className="h-3 w-3" />
                              Pending
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" />
                              Approved / Engaged
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                              <XCircle className="h-3 w-3" />
                              Rejected
                            </span>
                          )}
                          {isCompleted && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                              <CheckCircle2 className="h-3 w-3" />
                              Completed
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isPending && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedRequest(req);
                                    setModalAction('approve');
                                  }}
                                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedRequest(req);
                                    setModalAction('reject');
                                  }}
                                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {isApproved && (
                              <button
                                onClick={() => {
                                  setSelectedRequest(req);
                                  setModalAction('complete');
                                }}
                                className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                              >
                                Mark Completed
                              </button>
                            )}

                            <Link
                              href={`/dashboard/hiring/${req.candidate_id}`}
                              className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              title="View Candidate"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
