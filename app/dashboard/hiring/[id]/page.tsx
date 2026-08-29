'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Briefcase,
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  FileText,
  Percent,
  Download,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Edit2,
  Save,
  Plus,
  X,
  FileCheck2,
  Eye,
  Upload,
} from 'lucide-react';
import DashboardLayout from '../../../../components/dashboard-layout';
import { extractApiError, hiringAPI } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth-context';
import type { EmployeeCandidate, EmployeeDocument, HireRequest } from '../../../../lib/types';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_CLIENT_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

export default function CandidateDetailPage() {
  const params = useParams();
  const candidateId = String(params?.id || '');
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [candidate, setCandidate] = useState<EmployeeCandidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Verification modal state
  const [verifyAction, setVerifyAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<EmployeeCandidate>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Add document modal
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [docType, setDocType] = useState('aadhaar');
  const [docNumber, setDocNumber] = useState('');
  const [docUploading, setDocUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    } else if (isAuthenticated && candidateId) {
      fetchCandidate();
    }
  }, [authLoading, isAuthenticated, candidateId]);

  async function fetchCandidate() {
    try {
      setLoading(true);
      setError('');
      const res = await hiringAPI.getCandidateById(candidateId);
      setCandidate(res.data.data);
      setEditForm({
        full_name: res.data.data.full_name,
        phone: res.data.data.phone,
        email: res.data.data.email,
        city: res.data.data.city,
        state: res.data.data.state,
        pincode: res.data.data.pincode,
        address_line: res.data.data.address_line,
        designation: res.data.data.designation,
        experience_years: res.data.data.experience_years,
        commission_percentage: res.data.data.commission_percentage,
        is_available: res.data.data.is_available,
        skills: res.data.data.skills || [],
        metadata: res.data.data.metadata || {},
      });
    } catch (err) {
      setError(extractApiError(err, 'Failed to load candidate details.'));
    } finally {
      setLoading(false);
    }
  }

  const handleVerify = async () => {
    if (!verifyAction) return;
    try {
      setVerifying(true);
      setError('');
      setSuccess('');
      const res = await hiringAPI.verifyCandidate(
        candidateId,
        verifyAction,
        verifyAction === 'reject' ? rejectionReason : undefined
      );
      setSuccess(`✅ ${res.data.message || 'Status updated.'}`);
      setVerifyAction(null);
      setRejectionReason('');
      await fetchCandidate();
    } catch (err) {
      setError(extractApiError(err, 'Failed to update candidate verification status.'));
    } finally {
      setVerifying(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      setSavingEdit(true);
      setError('');
      setSuccess('');
      await hiringAPI.updateCandidate(candidateId, editForm);
      setSuccess('Candidate details updated successfully.');
      setIsEditing(false);
      await fetchCandidate();
    } catch (err) {
      setError(extractApiError(err, 'Failed to save changes.'));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAddDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setDocUploading(true);
      setError('');
      const formData = new FormData();
      formData.append('file', file);

      const res = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      });

      const fileKey = res.data.fileName;
      const urlRes = await axios.get(`${API_BASE_URL}/api/upload/file?fileName=${encodeURIComponent(fileKey)}`, {
        withCredentials: true,
      });

      await hiringAPI.addDocument(candidateId, {
        doc_type: docType,
        doc_number: docNumber || undefined,
        doc_name: file.name,
        doc_url: urlRes.data.url || fileKey,
      });

      setSuccess(`✅ Document "${file.name}" uploaded successfully.`);
      setIsAddDocOpen(false);
      setDocNumber('');
      await fetchCandidate();
    } catch (err) {
      setError(extractApiError(err, 'Failed to upload document.'));
    } finally {
      setDocUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string, docName: string) => {
    if (!confirm(`Delete document "${docName}"?`)) return;
    try {
      setError('');
      setSuccess('');
      await hiringAPI.deleteDocument(docId);
      setSuccess('Document deleted.');
      await fetchCandidate();
    } catch (err) {
      setError(extractApiError(err, 'Failed to delete document.'));
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-[#ccb27a]" />
          <p className="text-sm font-medium">Loading candidate profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!candidate) {
    return (
      <DashboardLayout>
        <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
          <AlertCircle className="h-10 w-10 text-rose-500" />
          <p className="text-lg font-bold text-slate-900">Candidate Not Found</p>
          <Link
            href="/dashboard/hiring"
            className="rounded-2xl bg-[#1f2d2d] px-6 py-2.5 text-xs font-semibold text-white"
          >
            Back to Registry
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const isPending = candidate.verification_status === 'pending';
  const isVerified = candidate.verification_status === 'verified';
  const isRejected = candidate.verification_status === 'rejected';

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-8 p-6 lg:p-10">
        {/* Top Header */}
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
                  {candidate.full_name}
                </h1>
                {isPending && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    <Clock className="h-3.5 w-3.5" />
                    Pending Review
                  </span>
                )}
                {isVerified && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified
                  </span>
                )}
                {isRejected && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                    <XCircle className="h-3.5 w-3.5" />
                    Rejected
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500">
                {candidate.designation || 'Industrial Worker'} •{' '}
                {candidate.experience_years ? `${candidate.experience_years} years experience` : 'Fresher'}
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {isPending && (
              <>
                <button
                  onClick={() => setVerifyAction('approve')}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Approve Profile
                </button>
                <button
                  onClick={() => setVerifyAction('reject')}
                  className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-5 py-2.5 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50"
                >
                  <ShieldAlert className="h-4 w-4" />
                  Reject
                </button>
              </>
            )}

            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <Edit2 className="h-4 w-4 text-slate-400" />
                Edit Profile
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#1f2d2d] px-5 py-2.5 text-sm font-semibold text-[#f5ecdf] shadow-sm transition hover:brightness-110"
                >
                  {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-[#ccb27a]" />}
                  Save Changes
                </button>
              </div>
            )}
          </div>
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

        {/* Verification Action Modal */}
        {verifyAction && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl ring-1 ring-black/5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                {verifyAction === 'approve' ? (
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                ) : (
                  <ShieldAlert className="h-5 w-5 text-rose-600" />
                )}
                <h3 className="text-base font-bold text-slate-900">
                  {verifyAction === 'approve' ? 'Confirm Candidate Approval' : 'Reject Candidate Profile'}
                </h3>
              </div>
              <button
                onClick={() => setVerifyAction(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {verifyAction === 'approve' ? (
                <p className="text-sm text-slate-600">
                  By approving, this candidate profile will immediately be visible on the talent directory in the Client
                  Portal for companies and vendors to hire.
                </p>
              ) : (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Reason for Rejection (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Unclear Aadhaar document, invalid phone number, etc..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-900 focus:border-[#ccb27a] focus:bg-white focus:outline-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setVerifyAction(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerify}
                  disabled={verifying}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-semibold text-white shadow-sm ${
                    verifyAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {verifying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Confirm {verifyAction === 'approve' ? 'Approval' : 'Rejection'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Column: Details (2 cols) */}
          <div className="space-y-8 lg:col-span-2">
            {/* Profile Overview Card */}
            <div className="space-y-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm md:p-8">
              <div className="flex items-center gap-4">
                {candidate.photo_url ? (
                  <img
                    src={candidate.photo_url}
                    alt={candidate.full_name}
                    className="h-20 w-20 rounded-3xl object-cover ring-2 ring-slate-100"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-slate-800 to-slate-950 text-2xl font-bold text-white shadow-sm">
                    {candidate.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{candidate.full_name}</h2>
                  <p className="text-sm font-medium text-[#ccb27a]">{candidate.designation || 'Industrial Worker'}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Registered on {new Date(candidate.created_at).toLocaleDateString()}
                    {candidate.registered_by_name ? ` by ${candidate.registered_by_name}` : ' (Self Registered)'}
                  </p>
                </div>
              </div>

              {/* Editable or Viewable Information */}
              <div className="grid grid-cols-1 gap-6 border-t border-slate-100 pt-6 sm:grid-cols-2">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Contact Phone</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.phone || ''}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm text-slate-900"
                    />
                  ) : (
                    <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Phone className="h-4 w-4 text-slate-400" />
                      {candidate.phone}
                    </p>
                  )}
                </div>

                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Email Address</span>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editForm.email || ''}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm text-slate-900"
                    />
                  ) : (
                    <p className="mt-1 flex items-center gap-2 text-sm text-slate-700">
                      <Mail className="h-4 w-4 text-slate-400" />
                      {candidate.email || 'Not provided'}
                    </p>
                  )}
                </div>

                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Location</span>
                  {isEditing ? (
                    <div className="mt-1 flex gap-2">
                      <input
                        type="text"
                        placeholder="City"
                        value={editForm.city || ''}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        className="w-1/2 rounded-xl border border-slate-200 p-2 text-sm text-slate-900"
                      />
                      <input
                        type="text"
                        placeholder="State"
                        value={editForm.state || ''}
                        onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                        className="w-1/2 rounded-xl border border-slate-200 p-2 text-sm text-slate-900"
                      />
                    </div>
                  ) : (
                    <p className="mt-1 flex items-center gap-2 text-sm text-slate-700">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {candidate.city ? `${candidate.city}, ${candidate.state || 'India'}` : 'Location not set'}
                      {candidate.pincode ? ` (${candidate.pincode})` : ''}
                    </p>
                  )}
                </div>

                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Experience</span>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.5"
                      value={editForm.experience_years ?? 0}
                      onChange={(e) => setEditForm({ ...editForm, experience_years: parseFloat(e.target.value) || 0 })}
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm text-slate-900"
                    />
                  ) : (
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {candidate.experience_years ? `${candidate.experience_years} Years` : 'Fresher'}
                    </p>
                  )}
                </div>

                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Admin Commission</span>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.5"
                      value={editForm.commission_percentage ?? 0}
                      onChange={(e) =>
                        setEditForm({ ...editForm, commission_percentage: parseFloat(e.target.value) || 0 })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm text-slate-900"
                    />
                  ) : (
                    <p className="mt-1 flex items-center gap-1 font-mono text-sm font-bold text-slate-900">
                      <Percent className="h-3.5 w-3.5 text-[#ccb27a]" />
                      {candidate.commission_percentage ?? 0}%
                    </p>
                  )}
                </div>

                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Availability</span>
                  {isEditing ? (
                    <select
                      value={editForm.is_available ? 'true' : 'false'}
                      onChange={(e) => setEditForm({ ...editForm, is_available: e.target.value === 'true' })}
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm text-slate-900"
                    >
                      <option value="true">Available for hiring</option>
                      <option value="false">Engaged / Not available</option>
                    </select>
                  ) : (
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          candidate.is_available ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />{' '}
                      {candidate.is_available ? 'Available' : 'Engaged'}
                    </p>
                  )}
                </div>
              </div>

              {/* Skills */}
              <div className="border-t border-slate-100 pt-6">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Skills & Badges</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Array.isArray(candidate.skills) && candidate.skills.length > 0 ? (
                    candidate.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="rounded-xl bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-sm"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400">No skills specified.</p>
                  )}
                </div>
              </div>

              {/* Bio */}
              {candidate.metadata?.bio && (
                <div className="border-t border-slate-100 pt-6">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Professional Background / Bio
                  </span>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{candidate.metadata.bio}</p>
                </div>
              )}
            </div>

            {/* Documents Section */}
            <div className="space-y-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm md:p-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#ccb27a]" />
                  <h2 className="text-lg font-bold text-slate-900">
                    Verification Documents ({candidate.documents?.length || 0})
                  </h2>
                </div>
                <button
                  onClick={() => setIsAddDocOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-200"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Attach Document
                </button>
              </div>

              {/* Upload Document Modal */}
              {isAddDocOpen && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-center justify-between pb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Attach New Document</p>
                    <button onClick={() => setIsAddDocOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-500">Document Type</label>
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-800"
                      >
                        <option value="aadhaar">Aadhaar Card</option>
                        <option value="pan">PAN Card</option>
                        <option value="resume">Resume / CV</option>
                        <option value="certificate">Trade / Skill Certificate</option>
                        <option value="experience">Experience Letter</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-500">Doc Number (Optional)</label>
                      <input
                        type="text"
                        placeholder="Number"
                        value={docNumber}
                        onChange={(e) => setDocNumber(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-800"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1f2d2d] px-3 py-2 text-xs font-semibold text-white">
                        {docUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        Select File
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          onChange={handleAddDocument}
                          disabled={docUploading}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Document List */}
              {candidate.documents && candidate.documents.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {candidate.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ccb27a]/15 text-[#ccb27a]">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{doc.doc_name || doc.doc_type}</p>
                          <p className="text-[11px] text-slate-400 capitalize">
                            {doc.doc_type} {doc.doc_number ? `• ${doc.doc_number}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <a
                          href={doc.doc_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                          title="Open Document"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => handleDeleteDocument(doc.id, doc.doc_name || doc.doc_type)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          title="Delete Document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-xs text-slate-400">No documents attached to this candidate profile.</p>
              )}
            </div>
          </div>

          {/* Right Column: Hire Requests received for this candidate */}
          <div className="space-y-6">
            <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileCheck2 className="h-5 w-5 text-[#ccb27a]" />
                <h3 className="text-base font-bold text-slate-900">
                  Hire Requests ({candidate.hire_requests?.length || 0})
                </h3>
              </div>

              {candidate.hire_requests && candidate.hire_requests.length > 0 ? (
                <div className="space-y-3">
                  {candidate.hire_requests.map((req) => (
                    <div key={req.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{req.requester_name || 'Client'}</span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            req.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : req.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                      <p className="text-slate-500">{req.requester_email}</p>
                      {req.request_details?.notes && (
                        <p className="text-slate-700 bg-white p-2 rounded-xl border border-slate-200/60 italic">
                          "{req.request_details.notes}"
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400">
                        Requested on {new Date(req.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-xs text-slate-400 py-6">
                  No hire requests placed for this candidate yet.
                </p>
              )}

              <Link
                href="/dashboard/hiring/requests"
                className="block text-center rounded-2xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                View All Hire Requests
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
