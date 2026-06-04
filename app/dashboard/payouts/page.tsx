'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Loader2, 
    Search, 
    CreditCard, 
    DollarSign, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    Copy, 
    Check, 
    ArrowUpRight, 
    RefreshCcw,
    AlertTriangle,
    Edit2,
    Calendar
} from 'lucide-react';
import DashboardLayout from '../../../components/dashboard-layout';
import { adminAPI, extractApiError } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { toast } from 'sonner';

interface Payout {
    payout_id: string;
    order_id: string;
    vendor_id: string;
    payout_percentage: string | number;
    payout_amount: string | number;
    payout_status: string;
    delivered_at: string | null;
    due_date: string | null;
    last_paid_at: string | null;
    payout_notes: string | null;
    order_total_amount: string | number;
    order_status: string;
    client_payment_status: string | null;
    customer_name: string;
    vendor_name: string;
    vendor_credit_cycle: string | null;
    client_paid_amount: string | number;
    client_paid_percentage: string | number;
}

export default function AdminPayoutsPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();
    
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
    const [updatePercentage, setUpdatePercentage] = useState<number>(0);
    const [updateNotes, setUpdateNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function loadPayouts() {
        try {
            setLoading(true);
            setError('');
            const response = await adminAPI.getPayouts();
            setPayouts(response.data.data || []);
        } catch (err) {
            setError(extractApiError(err, 'Failed to retrieve vendor payout records.'));
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
            void loadPayouts();
        }
    }, [authLoading, isAuthenticated, router]);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleOpenModal = (payout: Payout) => {
        setSelectedPayout(payout);
        setUpdatePercentage(Number(payout.payout_percentage));
        setUpdateNotes(payout.payout_notes || '');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setSelectedPayout(null);
        setIsModalOpen(false);
    };

    const handleUpdatePayoutSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPayout) return;

        try {
            setSubmitting(true);
            await adminAPI.updatePayout(selectedPayout.order_id, updatePercentage, updateNotes);
            toast.success('Payout record updated successfully.');
            handleCloseModal();
            void loadPayouts();
        } catch (err) {
            toast.error(extractApiError(err, 'Failed to update payout details.'));
        } finally {
            setSubmitting(false);
        }
    };

    // Calculate days remaining helper
    const getDaysLeft = (dueDateStr: string | null, payoutStatus: string) => {
        if (payoutStatus === 'paid') return { text: 'Settled', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
        if (!dueDateStr) return { text: 'Awaiting Delivery', color: 'bg-slate-100 text-slate-500 border-slate-200' };
        
        const now = new Date();
        const due = new Date(dueDateStr);
        // Reset times to compare dates
        now.setHours(0, 0, 0, 0);
        due.setHours(0, 0, 0, 0);
        
        const diffTime = due.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            return { 
                text: `Overdue by ${Math.abs(diffDays)}d`, 
                color: 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse font-semibold' 
            };
        } else if (diffDays === 0) {
            return { text: 'Due Today', color: 'bg-amber-100 text-amber-800 border-amber-200 font-semibold' };
        } else {
            return { text: `${diffDays}d left`, color: 'bg-sky-100 text-sky-800 border-sky-200' };
        }
    };

    // Calculate Dashboard Stats
    const stats = useMemo(() => {
        let totalOwed = 0;
        let totalPaid = 0;
        let pendingCount = 0;
        let overdueCount = 0;

        payouts.forEach(p => {
            const orderAmt = Number(p.order_total_amount);
            const paidAmt = Number(p.payout_amount);
            totalOwed += orderAmt;
            totalPaid += paidAmt;

            if (p.payout_status !== 'paid') {
                pendingCount++;
                // Check if overdue
                if (p.due_date) {
                    const now = new Date();
                    const due = new Date(p.due_date);
                    now.setHours(0, 0, 0, 0);
                    due.setHours(0, 0, 0, 0);
                    if (due.getTime() < now.getTime()) {
                        overdueCount++;
                    }
                }
            }
        });

        return {
            totalOwed,
            totalPaid,
            pendingCount,
            overdueCount
        };
    }, [payouts]);

    // Search and Filter logic
    const filteredPayouts = useMemo(() => {
        let result = payouts;

        if (statusFilter !== 'all') {
            if (statusFilter === 'overdue') {
                result = result.filter(p => {
                    if (p.payout_status === 'paid' || !p.due_date) return false;
                    const now = new Date();
                    const due = new Date(p.due_date);
                    now.setHours(0, 0, 0, 0);
                    due.setHours(0, 0, 0, 0);
                    return due.getTime() < now.getTime();
                });
            } else {
                result = result.filter(p => p.payout_status === statusFilter);
            }
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(p => 
                p.vendor_name.toLowerCase().includes(query) ||
                p.customer_name.toLowerCase().includes(query) ||
                p.order_id.toLowerCase().includes(query)
            );
        }

        return result;
    }, [payouts, searchQuery, statusFilter]);

    if (authLoading || !isAuthenticated) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-100">
                <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
            </div>
        );
    }

    return (
        <DashboardLayout>
            {/* Header */}
            <div className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Vendor Payouts</h1>
                    <p className="text-sm text-slate-500">Track and settle payouts to vendors based on order delivery credit cycle terms.</p>
                </div>
                <button 
                    onClick={loadPayouts}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                >
                    <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total Volume Owed */}
                <div className="rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-500">Total Vendor Volume</span>
                        <div className="rounded-xl bg-blue-50 p-2 text-blue-700">
                            <DollarSign className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <h3 className="text-2xl font-bold text-slate-900">₹{stats.totalOwed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                        <p className="mt-1 text-xs text-slate-400">Sum of all order payouts</p>
                    </div>
                </div>

                {/* Total Paid Volume */}
                <div className="rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-500">Settled to Vendors</span>
                        <div className="rounded-xl bg-green-50 p-2 text-green-700">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <h3 className="text-2xl font-bold text-slate-900">₹{stats.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                        <p className="mt-1 text-xs text-slate-400">Total payouts completed</p>
                    </div>
                </div>

                {/* Pending Payouts */}
                <div className="rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-500">Owed / In Progress</span>
                        <div className="rounded-xl bg-amber-50 p-2 text-amber-700">
                            <Clock className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <h3 className="text-2xl font-bold text-slate-900">{stats.pendingCount}</h3>
                        <p className="mt-1 text-xs text-slate-400">Orders not fully settled</p>
                    </div>
                </div>

                {/* Overdue Payouts */}
                <div className="rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-500">Overdue Settlements</span>
                        <div className="rounded-xl bg-red-50 p-2 text-red-700">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <h3 className="text-2xl font-bold text-slate-900">{stats.overdueCount}</h3>
                        <p className="mt-1 text-xs text-slate-400">Past credit cycle terms</p>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                    {error}
                </div>
            )}

            {/* Table & Filtering */}
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    {/* Search Input */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            className="form-input pl-11 py-2.5"
                            placeholder="Search by Vendor, Client, Order ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-medium text-slate-500">Status:</span>
                        <div className="flex rounded-2xl bg-slate-100 p-1">
                            {[
                                { val: 'all', label: 'All' },
                                { val: 'pending', label: 'Pending' },
                                { val: 'partially_paid', label: 'Partial' },
                                { val: 'paid', label: 'Paid' },
                                { val: 'overdue', label: 'Overdue' }
                            ].map((status) => (
                                <button
                                    key={status.val}
                                    onClick={() => setStatusFilter(status.val)}
                                    className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                                        statusFilter === status.val
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    {status.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Payouts Table */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
                    </div>
                ) : filteredPayouts.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 py-16 text-center text-slate-500">
                        <CreditCard className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                        <p className="text-sm font-medium">No payouts found matching your filters.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-sm text-slate-600">
                            <thead>
                                <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-400">
                                    <th className="pb-3 pl-2">Order Details</th>
                                    <th className="pb-3">Vendor / Credit Cycle</th>
                                    <th className="pb-3">Client Paid</th>
                                    <th className="pb-3">Admin Paid to Vendor</th>
                                    <th className="pb-3 text-center">Days Remaining</th>
                                    <th className="pb-3">Last Settlement</th>
                                    <th className="pb-3 pr-2 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredPayouts.map((payout) => {
                                    const daysBadge = getDaysLeft(payout.due_date, payout.payout_status);
                                    return (
                                        <tr key={payout.payout_id} className="hover:bg-slate-50/55 transition-colors">
                                            {/* Order Details */}
                                            <td className="py-4 pl-2 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono text-xs font-semibold text-slate-900">
                                                        #{payout.order_id.split('-')[0]}
                                                    </span>
                                                    <button 
                                                        onClick={() => handleCopy(payout.order_id, payout.payout_id)}
                                                        className="text-slate-400 hover:text-slate-600 transition"
                                                    >
                                                        {copiedId === payout.payout_id ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                                                    </button>
                                                </div>
                                                <p className="font-bold text-slate-900 mt-1">₹{Number(payout.order_total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">{payout.customer_name}</p>
                                            </td>

                                            {/* Vendor / Credit Cycle */}
                                            <td className="py-4">
                                                <p className="font-bold text-slate-800">{payout.vendor_name}</p>
                                                <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    <span>{payout.vendor_credit_cycle || 'Standard Terms'}</span>
                                                </div>
                                            </td>

                                            {/* Client Paid */}
                                            <td className="py-4 whitespace-nowrap">
                                                <p className="font-extrabold text-indigo-700">
                                                    ₹{Number(payout.client_paid_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </p>
                                                <p className="text-[10px] uppercase font-semibold text-slate-400 mt-0.5">
                                                    {Number(payout.client_paid_percentage).toFixed(0)}% paid by Client
                                                </p>
                                            </td>

                                            {/* Admin Paid to Vendor */}
                                            <td className="py-4 whitespace-nowrap">
                                                <p className="font-extrabold text-emerald-700">
                                                    ₹{Number(payout.payout_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </p>
                                                <div className="mt-1.5 flex items-center gap-1.5">
                                                    {payout.payout_status === 'paid' && (
                                                        <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 uppercase">
                                                            Fully Settled
                                                        </span>
                                                    )}
                                                    {payout.payout_status === 'partially_paid' && (
                                                        <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 uppercase">
                                                            {Number(payout.payout_percentage).toFixed(0)}% Settled
                                                        </span>
                                                    )}
                                                    {payout.payout_status === 'pending' && (
                                                        <span className="inline-flex items-center gap-0.5 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 uppercase">
                                                            Unpaid
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Days Remaining */}
                                            <td className="py-4 text-center whitespace-nowrap">
                                                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${daysBadge.color}`}>
                                                    {daysBadge.text}
                                                </span>
                                            </td>

                                            {/* Last Settlement */}
                                            <td className="py-4 whitespace-nowrap">
                                                {payout.last_paid_at ? (
                                                    <>
                                                        <p className="font-semibold text-slate-800">
                                                            {new Date(payout.last_paid_at).toLocaleDateString('en-IN', {
                                                                day: 'numeric',
                                                                month: 'short',
                                                                year: 'numeric'
                                                            })}
                                                        </p>
                                                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[150px]" title={payout.payout_notes || ''}>
                                                            {payout.payout_notes || 'No transaction notes'}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">No payments logged</span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="py-4 pr-2 text-right whitespace-nowrap">
                                                <button
                                                    onClick={() => handleOpenModal(payout)}
                                                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                                                >
                                                    <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                                                    Settle
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Update Payout Modal */}
            {isModalOpen && selectedPayout && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Update Vendor Settlement</h2>
                        <p className="text-sm text-slate-500 mb-6">
                            Record a manual transaction settlement for order <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">#{selectedPayout.order_id.split('-')[0]}</span> to vendor <span className="font-semibold text-slate-800">{selectedPayout.vendor_name}</span>.
                        </p>

                        <form onSubmit={handleUpdatePayoutSubmit} className="space-y-5">
                            {/* Payout percentage slider */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Settled Percentage: <span className="text-blue-700 font-extrabold">{updatePercentage}%</span>
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    value={updatePercentage}
                                    onChange={(e) => setUpdatePercentage(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-700"
                                />
                                <div className="flex justify-between text-xs text-slate-400 mt-1">
                                    <span>0% (Unpaid)</span>
                                    <span>50%</span>
                                    <span>100% (Fully Settled)</span>
                                </div>
                            </div>

                            {/* Payment calculation helper */}
                            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-blue-800">
                                <div className="flex justify-between">
                                    <span>Order Total:</span>
                                    <span className="font-bold">₹{Number(selectedPayout.order_total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between mt-2 pt-2 border-t border-blue-100/50">
                                    <span>Calculated Settlement:</span>
                                    <span className="font-extrabold text-blue-700">
                                        ₹{((updatePercentage / 100) * Number(selectedPayout.order_total_amount)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            {/* Transaction details / notes */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Transaction Details / Notes
                                </label>
                                <textarea
                                    className="form-input w-full min-h-[80px]"
                                    placeholder="Enter reference ID, bank details, transaction time..."
                                    value={updateNotes}
                                    onChange={(e) => setUpdateNotes(e.target.value)}
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    disabled={submitting}
                                    className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="rounded-2xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Save Settlement
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
