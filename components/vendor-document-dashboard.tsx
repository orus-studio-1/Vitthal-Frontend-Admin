'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock3, Download, FileText, Loader2, Mail, PenSquare, ShieldCheck, XCircle } from 'lucide-react';
import DashboardLayout from './dashboard-layout';
import { useAuth } from '../lib/auth-context';
import { extractApiError, quotationAPI } from '../lib/api';
import { VendorQuotation, VendorQuotationStatus } from '../lib/types';

const reviewableStatuses: VendorQuotationStatus[] = ['vendor_approved', 'vendor_rejected'];

function formatDate(value?: string | null) {
  if (!value) return 'Not available';
  return new Date(value).toLocaleString();
}

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined) return 'Not specified';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
}

function statusTone(status: VendorQuotationStatus) {
  switch (status) {
    case 'admin_approved':
      return 'bg-emerald-100 text-emerald-700';
    case 'admin_rejected':
    case 'vendor_rejected':
      return 'bg-red-100 text-red-700';
    case 'vendor_approved':
      return 'bg-amber-100 text-amber-700';
    case 'vendor_opened':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function statusLabel(status: VendorQuotationStatus) {
  return status.replace(/_/g, ' ');
}

function kindLabel(kind: VendorQuotation['quotation_kind']) {
  return kind === 'vendor_agreement' ? 'Agreement' : 'Order quotation';
}

type DocumentKind = VendorQuotation['quotation_kind'];

export function VendorDocumentDashboard({ documentKind }: { documentKind: DocumentKind }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [quotations, setQuotations] = useState<VendorQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedQuotation, setSelectedQuotation] = useState<VendorQuotation | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const isAgreementPage = documentKind === 'vendor_agreement';
  const documentTitle = isAgreementPage ? 'Agreements' : 'Quotations';
  const itemLabel = isAgreementPage ? 'agreement' : 'quotation';
  const filteredQuotations = useMemo(
    () => quotations.filter((quotation) => quotation.quotation_kind === documentKind),
    [documentKind, quotations]
  );
  const reviewQueue = useMemo(
    () => filteredQuotations.filter((quotation) => reviewableStatuses.includes(quotation.status)),
    [filteredQuotations]
  );

  async function fetchQuotations() {
    try {
      setLoading(true);
      setError('');
      const response = await quotationAPI.getAll();
      setQuotations(response.data.data);
    } catch (quotationsError) {
      setError(extractApiError(quotationsError, `Failed to load ${itemLabel}s`));
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
      void fetchQuotations();
    }
  }, [authLoading, isAuthenticated, router]);

  const openReview = (quotation: VendorQuotation) => {
    setSelectedQuotation(quotation);
    setReviewNotes(quotation.admin_review_notes || '');
  };

  const closeReview = () => {
    if (reviewSubmitting) return;
    setSelectedQuotation(null);
    setReviewNotes('');
  };

  const handleReview = async (decision: 'approved' | 'rejected') => {
    if (!selectedQuotation) return;

    try {
      setReviewSubmitting(true);
      await quotationAPI.review(selectedQuotation.id, decision, reviewNotes.trim() || undefined);
      await fetchQuotations();
      closeReview();
    } catch (reviewError) {
      setError(extractApiError(reviewError, `Failed to ${decision} ${itemLabel}`));
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100"><Loader2 className="h-8 w-8 animate-spin text-blue-700" /></div>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{documentTitle} review queue</h1>
              <p className="text-sm text-slate-500">
                {isAgreementPage
                  ? 'Signed vendor agreements appear here for final admin approval.'
                  : 'Buy-product quotations appear here for final admin review.'}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">{reviewQueue.length} awaiting review</div>
          </div>

          {error ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-700" /></div>
          ) : reviewQueue.length ? (
            <div className="space-y-4">
              {reviewQueue.map((quotation) => (
                <article key={quotation.id} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-semibold text-slate-900">{quotation.title}</h3>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{kindLabel(quotation.quotation_kind)}</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusTone(quotation.status)}`}>
                          {statusLabel(quotation.status)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">{quotation.company_name} • {quotation.vendor_name}</p>
                      <p className="text-sm text-slate-600">Requested: {quotation.quantity} {quotation.unit} • Target: {formatCurrency(quotation.target_price)}</p>
                      <p className="text-sm text-slate-600">Vendor response: {formatCurrency(quotation.vendor_price)} • MOQ: {quotation.vendor_moq ?? 'Not specified'}</p>
                      <p className="text-xs text-slate-500">Responded {formatDate(quotation.vendor_responded_at)}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => window.open(quotationAPI.getPdfUrl(quotation.id), '_blank', 'noopener,noreferrer')}
                        className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Download className="h-4 w-4" />
                        PDF
                      </button>
                      <button
                        onClick={() => openReview(quotation)}
                        className="flex items-center gap-2 rounded-2xl border border-blue-200 px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-50"
                      >
                        <PenSquare className="h-4 w-4" />
                        Review
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">No {itemLabel} is waiting for review.</p>
          )}
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">All {documentTitle.toLowerCase()}</h2>
              <p className="text-sm text-slate-500">
                {isAgreementPage
                  ? 'Track sent vendor agreements, secure access, signature responses, and final admin outcomes.'
                  : 'Track buy-product quotations, secure vendor responses, and final admin outcomes.'}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">{filteredQuotations.length} total</div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-700" /></div>
          ) : filteredQuotations.length ? (
            <div className="space-y-4">
              {filteredQuotations.map((quotation) => (
                <article key={quotation.id} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="grid gap-4 md:grid-cols-2 xl:flex-1">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="rounded-2xl bg-blue-50 p-3 text-blue-700"><FileText className="h-5 w-5" /></div>
                          <div>
                            <h3 className="font-semibold text-slate-900">{quotation.title}</h3>
                            <p className="text-sm text-slate-500">{quotation.quotation_number}</p>
                          </div>
                        </div>
                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">{kindLabel(quotation.quotation_kind)}</p>
                        <p className="text-sm text-slate-600">{quotation.company_name} • {quotation.vendor_name}</p>
                        <p className="text-sm text-slate-600">{quotation.quantity} {quotation.unit} requested • MOQ {quotation.requested_moq ?? 'Not specified'}</p>
                        <p className="text-sm text-slate-600">Target {formatCurrency(quotation.target_price)} • Vendor {formatCurrency(quotation.vendor_price)}</p>
                      </div>

                      <div className="space-y-2 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-400" />
                          <span>{quotation.sent_to_email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4 text-slate-400" />
                          <span>Sent {formatDate(quotation.email_sent_at || quotation.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-slate-400" />
                          <span>Vendor opened {formatDate(quotation.vendor_opened_at)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-slate-400" />
                          <span>Admin reviewed {formatDate(quotation.admin_reviewed_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex min-w-64 flex-col items-start gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusTone(quotation.status)}`}>
                        {statusLabel(quotation.status)}
                      </span>
                      <p className="text-xs text-slate-500">{quotation.vendor_rejection_reason || quotation.vendor_notes || quotation.admin_review_notes || 'No extra notes captured yet.'}</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => window.open(quotationAPI.getPdfUrl(quotation.id), '_blank', 'noopener,noreferrer')}
                          className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Download className="h-4 w-4" />
                          Download PDF
                        </button>
                        {reviewableStatuses.includes(quotation.status) ? (
                          <button
                            onClick={() => openReview(quotation)}
                            className="flex items-center gap-2 rounded-2xl border border-blue-200 px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-50"
                          >
                            <PenSquare className="h-4 w-4" />
                            Review
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">No {itemLabel}s have been sent yet.</p>
          )}
        </section>
      </div>

      {selectedQuotation ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8">
          <div className="w-full max-w-3xl rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-slate-500">Final admin review</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">{selectedQuotation.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{selectedQuotation.company_name} • {selectedQuotation.vendor_name}</p>
            </div>

            <div className="grid gap-6 px-6 py-5 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <h4 className="text-sm font-semibold text-slate-900">Admin request</h4>
                  <p className="mt-2 text-sm text-slate-600">{selectedQuotation.request_notes || 'No request notes provided.'}</p>
                </div>
                <div className="rounded-2xl bg-blue-50 p-4">
                  <h4 className="text-sm font-semibold text-slate-900">Vendor response</h4>
                  <p className="mt-2 text-sm text-slate-600">Vendor price: {formatCurrency(selectedQuotation.vendor_price)}</p>
                  <p className="mt-1 text-sm text-slate-600">Vendor MOQ: {selectedQuotation.vendor_moq ?? 'Not specified'}</p>
                  <p className="mt-1 text-sm text-slate-600">Vendor notes: {selectedQuotation.vendor_notes || 'No vendor notes added.'}</p>
                  {selectedQuotation.vendor_rejection_reason ? (
                    <p className="mt-1 text-sm text-red-700">Vendor rejection: {selectedQuotation.vendor_rejection_reason}</p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
                  <p>Responded at: {formatDate(selectedQuotation.vendor_responded_at)}</p>
                  <p className="mt-1">Vendor IP: {selectedQuotation.vendor_response_ip || 'Not captured'}</p>
                  <p className="mt-1 break-all">User agent: {selectedQuotation.vendor_response_user_agent || 'Not captured'}</p>
                </div>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Admin review notes</span>
                  <textarea
                    value={reviewNotes}
                    onChange={(event) => setReviewNotes(event.target.value)}
                    className="min-h-36 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                    placeholder="Capture the final approval decision, commercial rationale, or reasons for rejecting the vendor response."
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-5">
              <button
                onClick={closeReview}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => void handleReview('rejected')}
                  disabled={reviewSubmitting}
                  className="flex items-center gap-2 rounded-2xl border border-red-200 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {reviewSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  Reject
                </button>
                <button
                  onClick={() => void handleReview('approved')}
                  disabled={reviewSubmitting}
                  className="flex items-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {reviewSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
