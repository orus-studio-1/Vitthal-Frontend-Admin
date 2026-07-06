'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Loader2,
  AlertCircle,
  X,
  User,
  Store,
  DollarSign,
  Search,
  Filter,
  Eye
} from 'lucide-react';
import DashboardLayout from '../../../../components/dashboard-layout';
import { extractApiError, serviceAPI } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth-context';

export default function ServiceQuotationsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Search state
  const [search, setSearch] = useState('');

  // Scope Drawer Detail state
  const [selectedQuotation, setSelectedQuotation] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  async function fetchQuotations() {
    try {
      setLoading(true);
      setError('');
      const params: any = {
        page,
        limit: 15
      };
      if (statusFilter) {
        params.status = statusFilter;
      }
      
      const response = await serviceAPI.getQuotations(params);
      const resData = response.data as any;
      if (resData?.data) {
        setQuotations(resData.data);
        if (resData.pagination) {
          setTotalPages(resData.pagination.totalPages || Math.ceil(resData.pagination.total / 15) || 1);
          setTotalItems(resData.pagination.total);
        }
      }
    } catch (err) {
      setError(extractApiError(err, 'Failed to load service quotations'));
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
  }, [authLoading, isAuthenticated, page, statusFilter, router]);

  // Client-side filtering by search
  const filteredQuotations = quotations.filter((q) => {
    const s = search.toLowerCase();
    return (
      q.service_name?.toLowerCase().includes(s) ||
      q.vendor_name?.toLowerCase().includes(s) ||
      q.client_name?.toLowerCase().includes(s) ||
      q.client_email?.toLowerCase().includes(s) ||
      q.id?.toLowerCase().includes(s)
    );
  });

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted':
      case 'client_accepted':
      case 'completed':
        return 'bg-emerald-50 border-emerald-100 text-emerald-700';
      case 'pending':
      case 'pending_vendor':
        return 'bg-amber-50 border-amber-100 text-amber-700';
      case 'vendor_offered':
        return 'bg-blue-50 border-blue-100 text-blue-700';
      case 'rejected':
      case 'cancelled':
        return 'bg-rose-50 border-rose-100 text-rose-700';
      default:
        return 'bg-slate-50 border-slate-100 text-slate-700';
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-slate-200 pb-5">
          <Link
            href="/dashboard/services"
            className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-700" />
              Service Quotations Registry
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Monitor custom pricing negotiations, scope proposals, and client requirements in the services marketplace.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Filters Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by client, service, or vendor name..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            {/* Status Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <Filter className="h-4 w-4 text-slate-400 shrink-0 hidden sm:inline" />
              {[
                { label: 'All Quotations', value: '' },
                { label: 'Pending Vendor', value: 'pending_vendor' },
                { label: 'Vendor Offered', value: 'vendor_offered' },
                { label: 'Accepted', value: 'client_accepted' },
                { label: 'Rejected', value: 'rejected' }
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => {
                    setStatusFilter(filter.value);
                    setPage(1);
                  }}
                  className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition shrink-0 ${
                    statusFilter === filter.value
                      ? 'bg-blue-700 border-blue-700 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* Quotations Table */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
            </div>
          ) : filteredQuotations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-slate-500">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-100">
                  <tr>
                    <th scope="col" className="px-6 py-4">Quotation ID</th>
                    <th scope="col" className="px-6 py-4">Client Detail</th>
                    <th scope="col" className="px-6 py-4">Service</th>
                    <th scope="col" className="px-6 py-4">Vendor</th>
                    <th scope="col" className="px-6 py-4">Requested Price</th>
                    <th scope="col" className="px-6 py-4">Agreed Price</th>
                    <th scope="col" className="px-6 py-4">Updated At</th>
                    <th scope="col" className="px-6 py-4">Status</th>
                    <th scope="col" className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredQuotations.map((quote) => (
                    <tr key={quote.id} className="hover:bg-slate-50/50 transition">
                      
                      {/* Quotation ID */}
                      <td className="px-6 py-4 font-mono font-bold text-slate-900 text-xs">
                        #{quote.id.slice(0, 8).toUpperCase()}
                      </td>

                      {/* Client */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-900 font-semibold">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          {quote.client_name}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{quote.client_email}</div>
                      </td>

                      {/* Service name */}
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {quote.service_name}
                      </td>

                      {/* Vendor name */}
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Store className="h-3.5 w-3.5 text-slate-400" />
                          {quote.vendor_name || 'Unassigned'}
                        </div>
                      </td>

                      {/* Requested Price */}
                      <td className="px-6 py-4 font-bold text-slate-700">
                        {quote.requested_price ? `₹${parseFloat(quote.requested_price).toLocaleString('en-IN')}` : 'N/A'}
                      </td>

                      {/* Agreed Price */}
                      <td className="px-6 py-4 font-extrabold text-slate-900">
                        {quote.agreed_price ? `₹${parseFloat(quote.agreed_price).toLocaleString('en-IN')}` : 'Under Negotiation'}
                      </td>

                      {/* Updated Date */}
                      <td className="px-6 py-4 text-xs whitespace-nowrap">
                        {formatDateTime(quote.updated_at)}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-block border rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${getStatusStyle(quote.status)}`}>
                          {quote.status}
                        </span>
                      </td>

                      {/* View Scope Action */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedQuotation(quote);
                            setIsDrawerOpen(true);
                          }}
                          className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 hover:text-slate-900 transition flex items-center justify-center ml-auto shadow-xs"
                          title="View Scope of Work"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className="text-slate-400 text-sm">No service quotations found matching filters.</p>
            </div>
          )}

          {/* Table Footer / Pagination */}
          {!loading && totalItems > 0 && (
            <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">
                Showing {filteredQuotations.length} of {totalItems} quotations
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Scope of Work Detail Slide-over Drawer */}
      {isDrawerOpen && selectedQuotation && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl overflow-hidden flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <header className="bg-slate-50 border-b border-slate-200 px-6 py-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Quotation Detail
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Scope of Work Proposal
                </h3>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Summary Details */}
              <section className="bg-slate-50 rounded-2xl border border-slate-150 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
                  <div>
                    <span className="text-slate-400 block font-mono uppercase">Service Name</span>
                    <span className="text-slate-900 text-sm font-bold block mt-0.5">{selectedQuotation.service_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-mono uppercase">Vendor Company</span>
                    <span className="text-slate-900 text-sm font-bold block mt-0.5">{selectedQuotation.vendor_name || 'Unassigned'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-mono uppercase">Client Requestor</span>
                    <span className="text-slate-900 text-sm font-bold block mt-0.5">{selectedQuotation.client_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-mono uppercase">Negotiation Status</span>
                    <span className={`inline-block border rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase mt-1 ${getStatusStyle(selectedQuotation.status)}`}>
                      {selectedQuotation.status}
                    </span>
                  </div>
                </div>
              </section>

              {/* Scope text */}
              <section className="space-y-2">
                <span className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider">Proposed Scope / Message</span>
                <div className="p-5 border border-slate-200 rounded-2xl bg-white text-slate-700 text-sm leading-relaxed whitespace-pre-line shadow-xs min-h-[160px]">
                  {selectedQuotation.scope_of_work || 'No written scope of work description was provided.'}
                </div>
              </section>

              {/* Price Details */}
              <section className="border border-slate-200 rounded-2xl p-5 bg-white shadow-xs grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 block text-xs font-semibold uppercase tracking-wider">Client Target Price</span>
                  <span className="text-slate-800 font-bold text-base mt-1 block">
                    {selectedQuotation.requested_price ? `₹${parseFloat(selectedQuotation.requested_price).toLocaleString('en-IN')}` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs font-semibold uppercase tracking-wider">Final Agreed Price</span>
                  <span className="text-slate-900 font-extrabold text-lg mt-1 block">
                    {selectedQuotation.agreed_price ? `₹${parseFloat(selectedQuotation.agreed_price).toLocaleString('en-IN')}` : 'Under Negotiation'}
                  </span>
                </div>
              </section>

            </div>
          </div>
        </>
      )}

    </DashboardLayout>
  );
}
