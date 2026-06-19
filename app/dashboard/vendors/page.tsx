'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, CheckCircle2, Eye, FileText, Loader2, Search, Send, ToggleLeft, ToggleRight, X, XCircle } from 'lucide-react';
import DashboardLayout from '../../../components/dashboard-layout';
import VendorInsightsModal from '../../../components/vendor-insights-modal';
import { extractApiError, quotationAPI, vendorAPI, productAPI } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { CreateVendorQuotationPayload, Vendor, VendorInsightsData, VendorQuotation } from '../../../lib/types';

const CATEGORY_OPTIONS = [
  { code: "plastic", label: "Plastic" },
  { code: "metal", label: "Metal" },
  { code: "chemicals", label: "Chemicals" },
  { code: "construction", label: "Construction" },
  { code: "machinery", label: "Machinery" },
  { code: "packaging", label: "Packaging" },
  { code: "textiles", label: "Textiles" },
  { code: "automotive", label: "Automotive" },
  { code: "agriculture", label: "Agriculture" },
  { code: "electrical", label: "Electrical" },
];

const BUSINESS_TYPES = [
  "Manufacturing",
  "Trading",
  "Service Provider",
  "Distributor",
  "Dealer",
  "Exporter",
  "Importer",
  "Other",
];

type QuotationFormState = {
  title: string;
  companyName: string;
  businessType: string;
  gstNumber: string;
  gstCertificateLink: string;
  companyWebsite: string;
  alternativeNumber: string;
  designation: string;
  businessDescription: string;
  creditCycle: string;
  minCommission: string;
  maxCommission: string;
  categories: string[];
};

const defaultQuotationForm: QuotationFormState = {
  title: '',
  companyName: '',
  businessType: '',
  gstNumber: '',
  gstCertificateLink: '',
  companyWebsite: '',
  alternativeNumber: '',
  designation: '',
  businessDescription: '',
  creditCycle: '',
  minCommission: '',
  maxCommission: '',
  categories: [],
};

export default function VendorsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categoriesOptions, setCategoriesOptions] = useState<any[]>(CATEGORY_OPTIONS);

  useEffect(() => {
    async function fetchCats() {
      try {
        const response = await productAPI.getCategories();
        if (response.data?.data) {
          setCategoriesOptions(response.data.data);
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    }
    fetchCats();
  }, []);

  const [quotations, setQuotations] = useState<VendorQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorInsights, setVendorInsights] = useState<VendorInsightsData | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState('');
  const [timeframe, setTimeframe] = useState<'month' | '6months' | 'year'>('year');
  const [quotationVendor, setQuotationVendor] = useState<Vendor | null>(null);
  const [quotationForm, setQuotationForm] = useState<QuotationFormState>(defaultQuotationForm);
  const [quotationSubmitting, setQuotationSubmitting] = useState(false);
  const [quotationFeedback, setQuotationFeedback] = useState<{ type: 'success' | 'error'; text: string; link?: string } | null>(null);
  const [blockingVendor, setBlockingVendor] = useState<Vendor | null>(null);
  const [unblockingVendor, setUnblockingVendor] = useState<Vendor | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [reconsiderationNotes, setReconsiderationNotes] = useState<Record<string, string>>({});
  const [activeReconsiderationVendorId, setActiveReconsiderationVendorId] = useState<string | null>(null);

  async function fetchVendors() {
    try {
      setLoading(true);
      setError('');
      const [vendorsResponse, quotationsResponse] = await Promise.all([
        vendorAPI.getAll(),
        quotationAPI.getAll(),
      ]);
      setVendors(vendorsResponse.data.data);
      setQuotations(quotationsResponse.data.data);
    } catch (vendorsError) {
      setError(extractApiError(vendorsError, 'Failed to load vendors'));
    } finally {
      setLoading(false);
    }
  }

  async function loadVendorInsights(vendor: Vendor, nextTimeframe: 'month' | '6months' | 'year' = timeframe) {
    try {
      setInsightsLoading(true);
      setInsightsError('');
      const response = await vendorAPI.getInsights(vendor.id, nextTimeframe);
      setVendorInsights(response.data.data);
    } catch (detailsError) {
      setInsightsError(extractApiError(detailsError, 'Failed to load vendor analytics'));
    } finally {
      setInsightsLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (isAuthenticated) {
      const timer = window.setTimeout(() => {
        void fetchVendors();
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (selectedVendor) {
      void loadVendorInsights(selectedVendor, timeframe);
    }
  }, [timeframe]);

  const toggleVendorStatus = async (vendor: Vendor) => {
    try {
      await vendorAPI.updateStatus(vendor.id, { is_active: !vendor.is_active });
      await fetchVendors();
    } catch (updateError) {
      setError(extractApiError(updateError, 'Failed to update vendor status'));
    }
  };

  const handleBlockVendor = async () => {
    if (!blockingVendor) return;
    try {
      await vendorAPI.updateStatus(blockingVendor.id, { is_blocked: true, is_active: false });
      setBlockingVendor(null);
      await fetchVendors();
    } catch (updateError) {
      setError(extractApiError(updateError, 'Failed to block vendor'));
    }
  };

  const handleUnblockVendor = async () => {
    if (!unblockingVendor) return;
    try {
      await vendorAPI.updateStatus(unblockingVendor.id, { is_blocked: false, is_active: true });
      setUnblockingVendor(null);
      await fetchVendors();
    } catch (updateError) {
      setError(extractApiError(updateError, 'Failed to unblock vendor'));
    }
  };

  const reviewVendor = async (vendorId: string, decision: 'approved' | 'rejected' | 'reconsideration', notes?: string) => {
    try {
      await vendorAPI.review(vendorId, decision, notes);
      await fetchVendors();
    } catch (reviewError) {
      setError(extractApiError(reviewError, `Failed to submit review for vendor`));
    }
  };

  const openVendorView = async (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setVendorInsights(null);
    await loadVendorInsights(vendor, timeframe);
  };

  const openQuotationModal = (vendor: Vendor) => {
    setQuotationVendor(vendor);
    setQuotationFeedback(null);
    setQuotationForm({
      title: `${vendor.company_name} vendor agreement`,
      companyName: vendor.company_name || '',
      businessType: vendor.business_type || '',
      gstNumber: vendor.gst_number || '',
      gstCertificateLink: vendor.gst_certificate_link || '',
      companyWebsite: vendor.company_website || '',
      alternativeNumber: vendor.alternative_number || '',
      designation: vendor.designation || '',
      businessDescription: vendor.business_description || '',
      creditCycle: vendor.credit_cycle || '',
      minCommission: vendor.minimum_commision_percentage !== null && vendor.minimum_commision_percentage !== undefined ? String(vendor.minimum_commision_percentage) : '',
      maxCommission: vendor.maximum_commision_percentage !== null && vendor.maximum_commision_percentage !== undefined ? String(vendor.maximum_commision_percentage) : '',
      categories: vendor.categories?.map(c => c.code) || [],
    });
  };

  const closeQuotationModal = () => {
    if (quotationSubmitting) return;
    setQuotationVendor(null);
    setQuotationForm(defaultQuotationForm);
  };

  const handleQuotationSubmit = async () => {
    if (!quotationVendor) return;

    try {
      setQuotationSubmitting(true);
      setQuotationFeedback(null);

      const payload: CreateVendorQuotationPayload = {
        vendorId: quotationVendor.id,
        quotationKind: 'vendor_agreement',
        title: quotationForm.title.trim(),
        vendorUpdates: {
          companyName: quotationForm.companyName.trim(),
          businessType: quotationForm.businessType.trim(),
          gstNumber: quotationForm.gstNumber.trim(),
          gstCertificateLink: quotationForm.gstCertificateLink.trim(),
          companyWebsite: quotationForm.companyWebsite.trim(),
          alternativeNumber: quotationForm.alternativeNumber.trim(),
          designation: quotationForm.designation.trim(),
          businessDescription: quotationForm.businessDescription.trim(),
          creditCycle: quotationForm.creditCycle.trim(),
          minimumCommissionPercentage: quotationForm.minCommission ? Number(quotationForm.minCommission) : undefined,
          maximumCommissionPercentage: quotationForm.maxCommission ? Number(quotationForm.maxCommission) : undefined,
          vendorCategories: quotationForm.categories,
        }
      };

      const response = await quotationAPI.create(payload);
      setQuotationFeedback({
        type: 'success',
        text: response.data.message || 'Agreement sent successfully.',
        link: response.data.data.vendorLink,
      });
      setQuotationVendor(null);
      setQuotationForm(defaultQuotationForm);
    } catch (quotationError) {
      setQuotationFeedback({
        type: 'error',
        text: extractApiError(quotationError, 'Failed to send agreement'),
      });
    } finally {
      setQuotationSubmitting(false);
    }
  };

  const agreementQuotations = useMemo(
    () => quotations.filter((quotation) => quotation.quotation_kind === 'vendor_agreement'),
    [quotations]
  );
  const latestAgreementByVendor = useMemo(
    () =>
      agreementQuotations.reduce<Record<string, VendorQuotation>>((accumulator, quotation) => {
        const current = accumulator[quotation.vendor_id];
        if (!current || new Date(quotation.created_at).getTime() > new Date(current.created_at).getTime()) {
          accumulator[quotation.vendor_id] = quotation;
        }
        return accumulator;
      }, {}),
    [agreementQuotations]
  );

  const filteredVendors = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return vendors;
    return vendors.filter((vendor) => {
      return (
        vendor.name?.toLowerCase().includes(query) ||
        vendor.company_name?.toLowerCase().includes(query) ||
        vendor.email?.toLowerCase().includes(query) ||
        vendor.phone?.toLowerCase().includes(query) ||
        vendor.alternative_number?.toLowerCase().includes(query) ||
        vendor.application_number?.toLowerCase().includes(query)
      );
    });
  }, [vendors, searchQuery]);

  const reviewPendingVendors = useMemo(() => {
    return filteredVendors.filter((vendor) => vendor.approval_status === 'pending' || vendor.approval_status === 'agreement_sent');
  }, [filteredVendors]);

  const approvedVendors = useMemo(() => {
    return filteredVendors;
  }, [filteredVendors]);

  const getAgreementForVendor = (vendorId: string) => latestAgreementByVendor[vendorId] || null;
  const canSendAgreement = (vendor: Vendor) => vendor.approval_status === 'pending' && !getAgreementForVendor(vendor.id);
  const canApproveVendor = (vendor: Vendor) => {
    const agreement = getAgreementForVendor(vendor.id);
    return vendor.approval_status === 'agreement_sent' && Boolean(agreement && ['vendor_approved', 'vendor_rejected'].includes(agreement.status));
  };
  const canRejectVendor = (vendor: Vendor) => {
    return vendor.approval_status === 'pending' || vendor.approval_status === 'agreement_sent';
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
              <h1 className="text-xl font-semibold text-slate-900">Pending approvals</h1>
              <p className="text-sm text-slate-500">New vendor signups from the frontend arrive here for review.</p>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">{reviewPendingVendors.length} pending</div>
          </div>

          {error ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          {quotationFeedback ? (
            <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${quotationFeedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
              <p>{quotationFeedback.text}</p>
              {quotationFeedback.link ? (
                <p className="mt-1 break-all text-xs text-emerald-700/90">{quotationFeedback.link}</p>
              ) : null}
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-700" /></div>
          ) : reviewPendingVendors.length ? (
            <div className="space-y-4">
              {reviewPendingVendors.map((vendor) => {
                const agreement = getAgreementForVendor(vendor.id);

                return (
                  <article key={vendor.id} className="rounded-2xl border border-slate-200 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="font-semibold text-slate-900">{vendor.company_name}</h3>
                          {vendor.application_number && (
                            <span className="rounded-2xl bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 font-mono text-xs font-semibold text-blue-700">
                              {vendor.application_number}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{vendor.name} • {vendor.email}</p>
                        <p className="mt-2 text-sm text-slate-600">{vendor.phone || 'No phone'} {vendor.gst_number ? `• ${vendor.gst_number}` : ''}</p>
                        {agreement ? (
                          <p className="mt-2 text-xs text-slate-500">Agreement status: {agreement.status.replaceAll('_', ' ')}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => void openVendorView(vendor)} className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                        {canSendAgreement(vendor) ? (
                          <button onClick={() => openQuotationModal(vendor)} className="flex items-center gap-2 rounded-2xl border border-blue-200 px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-50">
                            <Send className="h-4 w-4" />
                            Send agreement
                          </button>
                        ) : null}
                        {canApproveVendor(vendor) ? (
                          <button onClick={() => reviewVendor(vendor.id, 'approved')} className="flex items-center gap-2 rounded-2xl border border-emerald-200 px-4 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50">
                            <CheckCircle2 className="h-4 w-4" />
                            Approve
                          </button>
                        ) : null}
                        {canRejectVendor(vendor) ? (
                          <button onClick={() => reviewVendor(vendor.id, 'rejected')} className="flex items-center gap-2 rounded-2xl border border-red-200 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50">
                            <XCircle className="h-4 w-4" />
                            Reject
                          </button>
                        ) : null}
                        {vendor.approval_status !== 'approved' && (
                          <button
                            onClick={() => {
                              setActiveReconsiderationVendorId(
                                activeReconsiderationVendorId === vendor.id ? null : vendor.id
                              );
                            }}
                            className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                              activeReconsiderationVendorId === vendor.id
                                ? 'border-amber-600 bg-amber-50 text-amber-700 font-semibold'
                                : 'border-amber-200 text-amber-700 hover:bg-amber-50'
                            }`}
                          >
                            <FileText className="h-4 w-4" />
                            Request changes
                          </button>
                        )}
                      </div>
                    </div>
                    {activeReconsiderationVendorId === vendor.id && (
                      <div className="mt-4 border-t border-slate-100 pt-4 space-y-3">
                        <label className="block text-sm font-medium text-slate-700">
                          Edits/Reconsideration Note for Vendor
                        </label>
                        <textarea
                          placeholder="Explain what the vendor needs to correct (e.g. Please update your credit cycle details or upload a clearer GST certificate image)."
                          value={reconsiderationNotes[vendor.id] || ''}
                          onChange={(e) =>
                            setReconsiderationNotes({
                              ...reconsiderationNotes,
                              [vendor.id]: e.target.value,
                            })
                          }
                          className="w-full min-h-20 rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-amber-400 text-slate-900"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setActiveReconsiderationVendorId(null);
                            }}
                            className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={async () => {
                              const note = reconsiderationNotes[vendor.id]?.trim() || '';
                              if (!note) {
                                alert('Please provide a note for the vendor explaining the requested changes.');
                                return;
                              }
                              await reviewVendor(vendor.id, 'reconsideration', note);
                              setActiveReconsiderationVendorId(null);
                            }}
                            className="rounded-2xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-semibold text-white transition"
                          >
                            Send for review to vendor
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          ) : (
            <p className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">No vendors are waiting for approval.</p>
          )}
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Vendor list</h2>
              <p className="text-sm text-slate-500">Use View to inspect vendor analytics, or send a one-time agreement directly from the vendor card.</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <div className={`flex items-center justify-end transition-all ${isSearchOpen ? 'w-full sm:w-[360px]' : 'w-12'}`}>
                {isSearchOpen ? (
                  <div className="relative w-full">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      autoFocus
                      className="form-input pl-11 pr-11"
                      placeholder="Search name, company, email, mobile, application ID"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setIsSearchOpen(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(true)}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                    aria-label="Open vendor search"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => router.push('/dashboard/quotations')}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <FileText className="h-4 w-4" />
                Review quotations
              </button>
              <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">{approvedVendors.length} vendors</div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-700" /></div>
          ) : (
            <div className="space-y-4">
              {approvedVendors.length ? approvedVendors.map((vendor) => (
                <article key={vendor.id} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-blue-50 p-3 text-blue-700"><Building2 className="h-5 w-5" /></div>
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="font-semibold text-slate-900">{vendor.company_name}</h3>
                            {vendor.application_number && (
                              <span className="rounded-2xl bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 font-mono text-xs font-semibold text-blue-700">
                                {vendor.application_number}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-slate-500">{vendor.name} • {vendor.email}</p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-slate-600">{vendor.phone || 'No phone'} {vendor.gst_number ? `• ${vendor.gst_number}` : ''}</p>
                      <p className="mt-2 text-sm text-slate-500">Orders linked: {vendor.order_count || 0}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className={`rounded-full px-3 py-1 font-medium ${
                          vendor.approval_status === 'reconsideration'
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {vendor.approval_status === 'reconsideration' ? 'needs changes' : vendor.approval_status}
                        </span>
                        {!vendor.is_active ? <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700">inactive</span> : null}
                        {vendor.is_blocked ? <span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-700">blocked</span> : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => void openVendorView(vendor)} className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                      {canSendAgreement(vendor) ? (
                        <button
                          onClick={() => openQuotationModal(vendor)}
                          className="flex items-center gap-2 rounded-2xl border border-blue-200 px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-50"
                        >
                          <Send className="h-4 w-4" />
                          Send agreement
                        </button>
                      ) : null}
                      {canApproveVendor(vendor) ? (
                        <button onClick={() => reviewVendor(vendor.id, 'approved')} className="flex items-center gap-2 rounded-2xl border border-emerald-200 px-4 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50">
                          <CheckCircle2 className="h-4 w-4" />
                          Approve
                        </button>
                      ) : null}
                      {canRejectVendor(vendor) ? (
                        <button onClick={() => reviewVendor(vendor.id, 'rejected')} className="flex items-center gap-2 rounded-2xl border border-red-200 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50">
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      ) : null}
                      <button onClick={() => {
                        if (vendor.is_blocked) {
                          setUnblockingVendor(vendor);
                        } else {
                          setBlockingVendor(vendor);
                        }
                      }} className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                        {vendor.is_blocked ? <ToggleRight className="h-5 w-5 text-red-600" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
                        {vendor.is_blocked ? 'Unblock' : 'Block'}
                      </button>
                    </div>
                  </div>
                </article>
              )) : <p className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">No vendors available.</p>}
            </div>
          )}
        </section>
      </div>

      {selectedVendor ? (
        <VendorInsightsModal
          vendorName={selectedVendor.company_name}
          timeframe={timeframe}
          data={vendorInsights}
          loading={insightsLoading}
          error={insightsError}
          onClose={() => {
            setSelectedVendor(null);
            setVendorInsights(null);
            setInsightsError('');
          }}
          onTimeframeChange={(value) => setTimeframe(value)}
        />
      ) : null}

      {quotationVendor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8">
          <div className="w-full max-w-2xl rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-slate-500">One-time agreement</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">{quotationVendor.company_name}</h3>
                <p className="mt-1 text-sm text-slate-500">{quotationVendor.name} • {quotationVendor.email}</p>
              </div>
              <button onClick={closeQuotationModal} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 px-6 py-5 sm:grid-cols-2 max-h-[65vh] overflow-y-auto">
              <label className="space-y-2 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">Agreement title</span>
                <input
                  value={quotationForm.title}
                  onChange={(event) => setQuotationForm((current) => ({ ...current, title: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Company Name</span>
                <input
                  value={quotationForm.companyName}
                  onChange={(event) => setQuotationForm((current) => ({ ...current, companyName: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Business Type</span>
                <select
                  value={quotationForm.businessType}
                  onChange={(event) => setQuotationForm((current) => ({ ...current, businessType: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                >
                  <option value="">Select type</option>
                  {BUSINESS_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">GST Number</span>
                <input
                  value={quotationForm.gstNumber}
                  onChange={(event) => setQuotationForm((current) => ({ ...current, gstNumber: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Company Website</span>
                <input
                  value={quotationForm.companyWebsite}
                  onChange={(event) => setQuotationForm((current) => ({ ...current, companyWebsite: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Alternative Phone</span>
                <input
                  value={quotationForm.alternativeNumber}
                  onChange={(event) => setQuotationForm((current) => ({ ...current, alternativeNumber: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Designation</span>
                <input
                  value={quotationForm.designation}
                  onChange={(event) => setQuotationForm((current) => ({ ...current, designation: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Credit Cycle</span>
                <input
                  value={quotationForm.creditCycle}
                  onChange={(event) => setQuotationForm((current) => ({ ...current, creditCycle: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                />
              </label>

              <div className="flex gap-4">
                <label className="space-y-2 w-full">
                  <span className="text-sm font-medium text-slate-700">Min Commission %</span>
                  <input
                    type="number"
                    value={quotationForm.minCommission}
                    onChange={(event) => setQuotationForm((current) => ({ ...current, minCommission: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                  />
                </label>
                <label className="space-y-2 w-full">
                  <span className="text-sm font-medium text-slate-700">Max Commission %</span>
                  <input
                    type="number"
                    value={quotationForm.maxCommission}
                    onChange={(event) => setQuotationForm((current) => ({ ...current, maxCommission: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                  />
                </label>
              </div>

              <label className="space-y-2 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">Business Description</span>
                <textarea
                  value={quotationForm.businessDescription}
                  onChange={(event) => setQuotationForm((current) => ({ ...current, businessDescription: event.target.value }))}
                  className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                />
              </label>

              <label className="space-y-2 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">Categories</span>
                <div className="flex flex-wrap gap-2">
                  {categoriesOptions.map(cat => (
                    <button
                      key={cat.code}
                      onClick={() => {
                        setQuotationForm(curr => {
                          const cats = curr.categories.includes(cat.code)
                            ? curr.categories.filter(c => c !== cat.code)
                            : [...curr.categories, cat.code];
                          return { ...curr, categories: cats };
                        });
                      }}
                      className={`px-3 py-1.5 rounded-2xl text-xs font-medium border transition ${quotationForm.categories.includes(cat.code)
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-5">
              <p className="max-w-md text-xs text-slate-500">The vendor will receive a PDF attachment plus a secure signing link. Once the vendor responds, approval will unlock here.</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={closeQuotationModal}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleQuotationSubmit()}
                  disabled={quotationSubmitting}
                  className="flex items-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {quotationSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send agreement
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Block Vendor Confirmation Modal */}
      {blockingVendor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-950">Block Vendor</h3>
            <p className="text-sm text-slate-500">
              Are you sure you want to block <span className="font-semibold text-slate-800">{blockingVendor.company_name}</span>? 
              They will not be able to access their vendor dashboard or perform any actions until unblocked.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setBlockingVendor(null)}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleBlockVendor()}
                className="rounded-2xl bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-semibold text-white transition"
              >
                Block Vendor
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Unblock Vendor Confirmation Modal */}
      {unblockingVendor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-950">Unblock Vendor</h3>
            <p className="text-sm text-slate-500">
              Are you sure you want to unblock <span className="font-semibold text-slate-800">{unblockingVendor.company_name}</span>? 
              This will restore their access to the vendor dashboard.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setUnblockingVendor(null)}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleUnblockVendor()}
                className="rounded-2xl bg-blue-700 hover:bg-blue-800 px-4 py-2 text-sm font-semibold text-white transition"
              >
                Unblock Vendor
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
