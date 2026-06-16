'use client';

import { useEffect, useState } from 'react';
import {
  Check,
  X,
  Loader2,
  DollarSign,
  Building2,
  Package,
  Calendar,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Mail,
  Phone,
  AlertCircle
} from 'lucide-react';
import DashboardLayout from '../../../../components/dashboard-layout';
import { extractApiError, productAPI } from '../../../../lib/api';

interface PendingPriceChange {
  id: string; // vendor_products.id
  product_id: string;
  vendor_id: string;
  current_price: number | string;
  pending_price: number | string;
  updated_at: string;
  product_name: string;
  vendor_company_name: string;
  vendor_phone?: string | null;
  vendor_email?: string | null;
}

export default function PriceApprovalsPage() {
  const [items, setItems] = useState<PendingPriceChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchPendingChanges = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await productAPI.getPendingPriceChanges();
      if (res.data && res.data.data) {
        setItems(res.data.data as PendingPriceChange[]);
      }
    } catch (err) {
      console.error('Error fetching pending price changes:', err);
      setError(extractApiError(err, 'Failed to fetch pending price changes.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingChanges();
  }, []);

  const handleReview = async (id: string, decision: 'approved' | 'rejected') => {
    setActioningId(id);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await productAPI.reviewPendingPriceChange(id, decision);
      setSuccessMessage(res.data?.message || `Price update ${decision} successfully.`);
      
      // Filter out completed item
      setItems((prev) => prev.filter((item) => item.id !== id));
      
      // Clear toast/success message after 4s
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Error submitting review:', err);
      setError(extractApiError(err, 'Failed to submit decision. Please try again.'));
    } finally {
      setActioningId(null);
    }
  };

  const getPercentageDiff = (curr: number | string, pend: number | string) => {
    const currentVal = parseFloat(curr.toString());
    const pendingVal = parseFloat(pend.toString());
    if (isNaN(currentVal) || isNaN(pendingVal) || currentVal === 0) return null;

    const diff = ((pendingVal - currentVal) / currentVal) * 100;
    return diff.toFixed(1);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Price Approval Queue</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review and approve proposed price modifications submitted by catalog vendors before they reflect to client stores.
          </p>
        </div>

        {/* Global Notifications */}
        {successMessage && (
          <div className="mb-6 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-800 shadow-sm flex items-center gap-3">
            <Check className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-100 bg-red-50 p-4 text-red-800 shadow-sm flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-sm font-medium">
              <p>{error}</p>
              <button 
                onClick={fetchPendingChanges} 
                className="mt-2 text-xs font-semibold underline text-red-700 hover:text-red-900"
              >
                Retry Fetching
              </button>
            </div>
          </div>
        )}

        {/* Main Grid View */}
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-slate-500 mb-2" />
            <p className="text-sm">Loading pending price changes...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-16 text-center shadow-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 border border-slate-100">
              <DollarSign className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-md font-semibold text-slate-800">Clear Workspace</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-sm">
              All price requests have been approved or rejected. There are no pending updates to display.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const pctDiff = getPercentageDiff(item.current_price, item.pending_price);
              const isIncrease = pctDiff ? parseFloat(pctDiff) > 0 : false;
              const isActioning = actioningId === item.id;

              return (
                <div 
                  key={item.id} 
                  className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:shadow-md hover:border-slate-300"
                >
                  {/* Card Header & Product Name */}
                  <div className="border-b border-slate-100 bg-slate-50/50 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Package className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="text-xs font-mono uppercase tracking-wider">Product ID: {item.product_id.split('-')[0]}</span>
                      </div>
                      
                      {pctDiff !== null && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isIncrease 
                            ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {isIncrease ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          <span>{isIncrease ? `+${pctDiff}%` : `${pctDiff}%`}</span>
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2.5 text-base font-semibold text-slate-900 line-clamp-1">{item.product_name}</h3>
                  </div>

                  {/* Vendor Info Section */}
                  <div className="p-5 flex-1">
                    <div className="mb-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="text-sm font-semibold text-slate-800 line-clamp-1">{item.vendor_company_name}</span>
                      </div>
                      
                      <div className="mt-2.5 space-y-1.5 pl-6">
                        {item.vendor_email && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Mail className="h-3.5 w-3.5" />
                            <span className="truncate">{item.vendor_email}</span>
                          </div>
                        )}
                        {item.vendor_phone && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{item.vendor_phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Price Transition Info */}
                    <div className="flex items-center justify-between border border-slate-100 rounded-xl p-3 bg-slate-50/30">
                      <div>
                        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Current Price</p>
                        <p className="text-base font-bold text-slate-700 mt-0.5">₹{item.current_price}</p>
                      </div>
                      <div className="text-slate-400 px-2">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Proposed Price</p>
                        <p className="text-base font-bold text-emerald-600 mt-0.5">₹{item.pending_price}</p>
                      </div>
                    </div>
                  </div>

                  {/* Footer & Actions */}
                  <div className="border-t border-slate-100 p-5 bg-slate-50/20 flex flex-col gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>Submitted: {new Date(item.updated_at).toLocaleDateString()} at {new Date(item.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5">
                      <button
                        onClick={() => handleReview(item.id, 'rejected')}
                        disabled={isActioning}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 hover:text-red-700 hover:bg-red-50 hover:border-red-100 disabled:opacity-50 transition font-medium text-xs rounded-xl cursor-pointer"
                      >
                        {isActioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => handleReview(item.id, 'approved')}
                        disabled={isActioning}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition font-medium text-xs rounded-xl shadow-xs cursor-pointer"
                      >
                        {isActioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>Approve</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
