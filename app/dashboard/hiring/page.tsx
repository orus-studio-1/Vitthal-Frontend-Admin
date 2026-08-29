'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Trash2,
  Filter,
  ArrowRight,
  FileCheck2,
  Sparkles,
  MapPin,
  Percent,
} from 'lucide-react';
import DashboardLayout from '../../../components/dashboard-layout';
import { extractApiError, hiringAPI } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import type { EmployeeCandidate, HiringStats } from '../../../lib/types';

type FilterTab = 'all' | 'pending' | 'verified' | 'rejected';

export default function HiringDashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [candidates, setCandidates] = useState<EmployeeCandidate[]>([]);
  const [stats, setStats] = useState<HiringStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [cityFilter, setCityFilter] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    } else if (isAuthenticated) {
      loadData();
    }
  }, [authLoading, isAuthenticated, activeFilter]);

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      const [candidatesRes, statsRes] = await Promise.all([
        hiringAPI.getAllCandidates({
          status: activeFilter === 'all' ? undefined : activeFilter,
          search: searchQuery || undefined,
          city: cityFilter || undefined,
        }),
        hiringAPI.getStats(),
      ]);

      setCandidates(candidatesRes.data.data || []);
      setStats(statsRes.data.data || null);
    } catch (err) {
      setError(extractApiError(err, 'Failed to load hiring records.'));
    } finally {
      setLoading(false);
    }
  }

  const handleQuickVerify = async (id: string, action: 'approve' | 'reject') => {
    try {
      setActionInProgress(id);
      setError('');
      setSuccess('');
      const res = await hiringAPI.verifyCandidate(id, action);
      setSuccess(`✅ ${res.data.message || 'Candidate status updated.'}`);
      await loadData();
    } catch (err) {
      setError(extractApiError(err, 'Failed to update verification status.'));
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete candidate "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      setActionInProgress(id);
      setError('');
      setSuccess('');
      await hiringAPI.deleteCandidate(id);
      setSuccess(`🗑️ Candidate "${name}" was deleted.`);
      await loadData();
    } catch (err) {
      setError(extractApiError(err, 'Failed to delete candidate.'));
    } finally {
      setActionInProgress(null);
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    if (cityFilter && c.city && !c.city.toLowerCase().includes(cityFilter.toLowerCase())) {
      return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.designation?.toLowerCase().includes(q) ||
      c.skills?.some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-8 p-6 lg:p-10">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ccb27a]/15 text-[#ccb27a] ring-1 ring-[#ccb27a]/30">
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                  Local Employee Hiring & Staffing
                </h1>
                <p className="text-sm text-slate-500">
                  Manage candidate talent registry, verify industrial workers, and supervise hire requests.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/hiring/requests"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            >
              <FileCheck2 className="h-4 w-4 text-[#ccb27a]" />
              Hire Requests
              {stats && stats.pending_requests > 0 && (
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                  {stats.pending_requests}
                </span>
              )}
            </Link>
            <Link
              href="/dashboard/hiring/add"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#1f2d2d] to-[#2a3c3c] px-6 py-3 text-sm font-semibold text-[#f5ecdf] shadow-lg shadow-slate-900/10 transition hover:brightness-110"
            >
              <Plus className="h-4 w-4 text-[#ccb27a]" />
              Add Candidate
            </Link>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-800 backdrop-blur">
            <span>{error}</span>
            <button onClick={() => setError('')} className="font-semibold text-rose-900">
              Dismiss
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-800 backdrop-blur">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="font-semibold text-emerald-900">
              Dismiss
            </button>
          </div>
        )}

        {/* KPI / Stats Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Talent</span>
              <Users className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">{stats?.total_candidates ?? '—'}</p>
            <p className="mt-1 text-xs text-slate-400">Registered candidates</p>
          </div>

          <div className="rounded-3xl border border-amber-200/80 bg-amber-50/50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-amber-800">Pending Review</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-3 text-2xl font-bold text-amber-900">{stats?.pending_candidates ?? '—'}</p>
            <p className="mt-1 text-xs text-amber-700">Awaiting admin verification</p>
          </div>

          <div className="rounded-3xl border border-emerald-200/80 bg-emerald-50/50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-emerald-800">Verified</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-3 text-2xl font-bold text-emerald-900">{stats?.verified_candidates ?? '—'}</p>
            <p className="mt-1 text-xs text-emerald-700">Ready for hire directory</p>
          </div>

          <div className="rounded-3xl border border-blue-200/80 bg-blue-50/50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-blue-800">Available Now</span>
              <Sparkles className="h-4 w-4 text-blue-600" />
            </div>
            <p className="mt-3 text-2xl font-bold text-blue-900">{stats?.available_candidates ?? '—'}</p>
            <p className="mt-1 text-xs text-blue-700">Verified & available</p>
          </div>

          <div className="rounded-3xl border border-purple-200/80 bg-purple-50/50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-purple-800">Hire Requests</span>
              <FileCheck2 className="h-4 w-4 text-purple-600" />
            </div>
            <p className="mt-3 text-2xl font-bold text-purple-900">{stats?.total_requests ?? '—'}</p>
            <p className="mt-1 text-xs text-purple-700">{stats?.pending_requests ?? 0} pending review</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'pending', 'verified', 'rejected'] as FilterTab[]).map((tab) => {
              const count =
                tab === 'all'
                  ? stats?.total_candidates
                  : tab === 'pending'
                  ? stats?.pending_candidates
                  : tab === 'verified'
                  ? stats?.verified_candidates
                  : stats?.rejected_candidates;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className={`rounded-2xl px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                    activeFilter === tab
                      ? 'bg-[#1f2d2d] text-[#f5ecdf] shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {tab} {count !== undefined && `(${count})`}
                </button>
              );
            })}
          </div>

          {/* Search & Location filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, phone, skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                className="w-64 rounded-2xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:border-[#ccb27a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ccb27a]/20"
              />
            </div>

            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="City filter..."
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-40 rounded-2xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:border-[#ccb27a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ccb27a]/20"
              />
            </div>

            <button
              onClick={loadData}
              disabled={loading}
              title="Refresh"
              className="rounded-2xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Candidate Table */}
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
          {loading ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-500">
              <RefreshCw className="h-6 w-6 animate-spin text-[#ccb27a]" />
              <p className="text-sm font-medium">Loading candidate records...</p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-500">
              <Users className="h-10 w-10 text-slate-300" />
              <p className="text-base font-semibold text-slate-700">No candidates found</p>
              <p className="text-xs text-slate-400">
                {searchQuery || cityFilter
                  ? 'Try clearing the search or filter criteria.'
                  : 'Start by adding candidate profiles to the registry.'}
              </p>
              <Link
                href="/dashboard/hiring/add"
                className="mt-2 rounded-2xl bg-[#1f2d2d] px-5 py-2.5 text-xs font-semibold text-[#f5ecdf] transition hover:brightness-110"
              >
                Add First Candidate
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Candidate</th>
                    <th className="px-6 py-4">Designation & Exp</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4">Skills</th>
                    <th className="px-6 py-4">Commission</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCandidates.map((candidate) => {
                    const isPending = candidate.verification_status === 'pending';
                    const isVerified = candidate.verification_status === 'verified';
                    const isRejected = candidate.verification_status === 'rejected';

                    return (
                      <tr key={candidate.id} className="transition hover:bg-slate-50/60">
                        {/* Candidate Name & Contact */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {candidate.photo_url ? (
                              <img
                                src={candidate.photo_url}
                                alt={candidate.full_name}
                                className="h-10 w-10 rounded-2xl object-cover ring-2 ring-slate-100"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 font-bold text-white shadow-sm">
                                {candidate.full_name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-slate-900">{candidate.full_name}</p>
                              <p className="text-xs text-slate-400">{candidate.phone}</p>
                              {candidate.email && <p className="text-xs text-slate-400">{candidate.email}</p>}
                            </div>
                          </div>
                        </td>

                        {/* Designation & Experience */}
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-800">
                            {candidate.designation || 'Industrial Worker'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {candidate.experience_years ? `${candidate.experience_years} yrs exp` : 'Fresher'}
                          </p>
                        </td>

                        {/* Location */}
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-800">{candidate.city || '—'}</p>
                          <p className="text-xs text-slate-400">{candidate.state || 'India'}</p>
                        </td>

                        {/* Skills */}
                        <td className="px-6 py-4">
                          <div className="flex max-w-xs flex-wrap gap-1">
                            {Array.isArray(candidate.skills) && candidate.skills.length > 0 ? (
                              candidate.skills.slice(0, 3).map((skill, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                                >
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                            {Array.isArray(candidate.skills) && candidate.skills.length > 3 && (
                              <span className="rounded-lg bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
                                +{candidate.skills.length - 3}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Commission % */}
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-slate-700">
                            <Percent className="h-3 w-3 text-slate-400" />
                            {candidate.commission_percentage ?? 0}%
                          </span>
                        </td>

                        {/* Verification & Availability Status */}
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {isPending && (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                <Clock className="h-3 w-3" />
                                Pending Review
                              </span>
                            )}
                            {isVerified && (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                <CheckCircle2 className="h-3 w-3" />
                                Verified
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                                <XCircle className="h-3 w-3" />
                                Rejected
                              </span>
                            )}

                            <div>
                              <span
                                className={`inline-block h-2 w-2 rounded-full ${
                                  candidate.is_available ? 'bg-emerald-500' : 'bg-slate-300'
                                }`}
                              />
                              <span className="ml-1.5 text-xs text-slate-400">
                                {candidate.is_available ? 'Available' : 'Engaged'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Action Buttons */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isPending && (
                              <>
                                <button
                                  onClick={() => handleQuickVerify(candidate.id, 'approve')}
                                  disabled={actionInProgress === candidate.id}
                                  title="Approve Candidate"
                                  className="rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleQuickVerify(candidate.id, 'reject')}
                                  disabled={actionInProgress === candidate.id}
                                  title="Reject Candidate"
                                  className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </>
                            )}

                            <Link
                              href={`/dashboard/hiring/${candidate.id}`}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 hover:text-slate-900"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Link>

                            <button
                              onClick={() => handleDelete(candidate.id, candidate.full_name)}
                              disabled={actionInProgress === candidate.id}
                              title="Delete"
                              className="rounded-xl border border-slate-200 p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
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
