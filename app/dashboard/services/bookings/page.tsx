'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Loader2,
  AlertCircle,
  X,
  User,
  Store,
  DollarSign,
  Search,
  Filter
} from 'lucide-react';
import DashboardLayout from '../../../../components/dashboard-layout';
import { extractApiError, serviceAPI } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth-context';

export default function ServiceBookingsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Search query
  const [search, setSearch] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  async function fetchBookings() {
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
      
      const response = await serviceAPI.getBookings(params);
      const resData = response.data as any;
      if (resData?.data) {
        setBookings(resData.data);
        if (resData.pagination) {
          setTotalPages(resData.pagination.totalPages || Math.ceil(resData.pagination.total / 15) || 1);
          setTotalItems(resData.pagination.total);
        }
      }
    } catch (err) {
      setError(extractApiError(err, 'Failed to load service bookings'));
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
      void fetchBookings();
    }
  }, [authLoading, isAuthenticated, page, statusFilter, router]);

  // Client-side filtering by search query
  const filteredBookings = bookings.filter((b) => {
    const q = search.toLowerCase();
    return (
      b.service_name?.toLowerCase().includes(q) ||
      b.vendor_name?.toLowerCase().includes(q) ||
      b.client_name?.toLowerCase().includes(q) ||
      b.client_email?.toLowerCase().includes(q) ||
      b.id?.toLowerCase().includes(q)
    );
  });

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-emerald-50 border-emerald-100 text-emerald-700';
      case 'confirmed':
        return 'bg-blue-50 border-blue-100 text-blue-700';
      case 'pending':
        return 'bg-amber-50 border-amber-100 text-amber-700';
      case 'cancelled':
      case 'rejected':
        return 'bg-rose-50 border-rose-100 text-rose-700';
      default:
        return 'bg-slate-50 border-slate-100 text-slate-700';
    }
  };

  const getPaymentStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-emerald-500/10 text-emerald-700';
      case 'pending':
        return 'bg-amber-500/10 text-amber-700';
      case 'refunded':
        return 'bg-slate-500/10 text-slate-700';
      default:
        return 'bg-slate-500/10 text-slate-700';
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
              <Calendar className="h-6 w-6 text-blue-700" />
              Service Bookings Logs
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Review and audit all vendor bookings scheduled by clients in the marketplace.
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
                { label: 'All Statuses', value: '' },
                { label: 'Pending', value: 'pending' },
                { label: 'Confirmed', value: 'confirmed' },
                { label: 'Completed', value: 'completed' },
                { label: 'Cancelled', value: 'cancelled' }
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

        {/* Bookings Table Registry */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
            </div>
          ) : filteredBookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-slate-500">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-100">
                  <tr>
                    <th scope="col" className="px-6 py-4">Booking ID</th>
                    <th scope="col" className="px-6 py-4">Client Detail</th>
                    <th scope="col" className="px-6 py-4">Service</th>
                    <th scope="col" className="px-6 py-4">Vendor</th>
                    <th scope="col" className="px-6 py-4">Schedule</th>
                    <th scope="col" className="px-6 py-4">Total Amount</th>
                    <th scope="col" className="px-6 py-4">Fulfillment</th>
                    <th scope="col" className="px-6 py-4">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-slate-50/50 transition">
                      
                      {/* Booking ID */}
                      <td className="px-6 py-4 font-mono font-bold text-slate-900 text-xs">
                        #{booking.id.slice(0, 8).toUpperCase()}
                      </td>

                      {/* Client details */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-900 font-semibold">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          {booking.client_name}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{booking.client_email}</div>
                      </td>

                      {/* Service name */}
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {booking.service_name}
                      </td>

                      {/* Vendor name */}
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Store className="h-3.5 w-3.5 text-slate-400" />
                          {booking.vendor_name}
                        </div>
                      </td>

                      {/* Schedule start/end */}
                      <td className="px-6 py-4 text-xs whitespace-nowrap">
                        <div className="font-medium text-slate-800">
                          {formatDateTime(booking.scheduled_start)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          to {formatDateTime(booking.scheduled_end)}
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="px-6 py-4 font-extrabold text-slate-900">
                        ₹{parseFloat(booking.total_amount).toLocaleString('en-IN')}
                      </td>

                      {/* Fulfillment Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-block border rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${getStatusStyle(booking.status)}`}>
                          {booking.status}
                        </span>
                      </td>

                      {/* Payment Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${getPaymentStatusStyle(booking.payment_status)}`}>
                          {booking.payment_status}
                        </span>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className="text-slate-400 text-sm">No service bookings found matching filters.</p>
            </div>
          )}

          {/* Table Footer / Pagination */}
          {!loading && totalItems > 0 && (
            <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">
                Showing {filteredBookings.length} of {totalItems} bookings
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
    </DashboardLayout>
  );
}
