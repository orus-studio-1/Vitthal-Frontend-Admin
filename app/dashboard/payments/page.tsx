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
    RefreshCcw 
} from 'lucide-react';
import DashboardLayout from '../../../components/dashboard-layout';
import { adminAPI, extractApiError } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';

interface Payment {
    id: string;
    user_id: string;
    amount: string | number;
    currency: string;
    status: string;
    payment_method: string;
    razorpay_order_id: string | null;
    razorpay_payment_id: string | null;
    razorpay_signature: string | null;
    order_ids: string[];
    quotation_request_id: string | null;
    split_number: number;
    split_percentage: string | number;
    created_at: string;
    updated_at: string;
    user_name: string;
    user_email: string;
}

export default function PaymentsPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();
    
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    async function loadPayments() {
        try {
            setLoading(true);
            setError('');
            const response = await adminAPI.getPayments();
            setPayments(response.data.data || []);
        } catch (err) {
            setError(extractApiError(err, 'Failed to retrieve payment records.'));
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
            void loadPayments();
        }
    }, [authLoading, isAuthenticated, router]);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Calculate Dashboard Stats
    const stats = useMemo(() => {
        const successful = payments.filter(p => p.status === 'successful');
        const failed = payments.filter(p => p.status === 'failed');
        const pending = payments.filter(p => p.status === 'pending');

        const totalVolume = successful.reduce((sum, p) => sum + Number(p.amount), 0);
        const successRate = payments.length > 0 
            ? Math.round((successful.length / payments.length) * 100) 
            : 100;

        return {
            totalVolume,
            totalCount: payments.length,
            successRate,
            pendingCount: pending.length,
            failedCount: failed.length
        };
    }, [payments]);

    // Search and Filter logic
    const filteredPayments = useMemo(() => {
        let result = payments;

        if (statusFilter !== 'all') {
            result = result.filter(p => p.status === statusFilter);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(p => 
                (p.user_name && p.user_name.toLowerCase().includes(query)) ||
                (p.user_email && p.user_email.toLowerCase().includes(query)) ||
                (p.razorpay_order_id && p.razorpay_order_id.toLowerCase().includes(query)) ||
                (p.razorpay_payment_id && p.razorpay_payment_id.toLowerCase().includes(query)) ||
                p.id.toLowerCase().includes(query)
            );
        }

        return result;
    }, [payments, searchQuery, statusFilter]);

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
                    <h1 className="text-2xl font-bold text-slate-900">Payments Ledger</h1>
                    <p className="text-sm text-slate-500">Monitor transaction history, payment gateways settlements, and split payment details.</p>
                </div>
                <button 
                    onClick={loadPayments}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                >
                    <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total Paid Volume */}
                <div className="rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-500">Paid Volume</span>
                        <div className="rounded-xl bg-green-50 p-2 text-green-700">
                            <DollarSign className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <h3 className="text-2xl font-bold text-slate-900">₹{stats.totalVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                        <p className="mt-1 text-xs text-slate-400">Total settled payments</p>
                    </div>
                </div>

                {/* Total Transactions */}
                <div className="rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-500">Total Transactions</span>
                        <div className="rounded-xl bg-blue-50 p-2 text-blue-700">
                            <CreditCard className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <h3 className="text-2xl font-bold text-slate-900">{stats.totalCount}</h3>
                        <p className="mt-1 text-xs text-slate-400">Attempts recorded</p>
                    </div>
                </div>

                {/* Success Rate */}
                <div className="rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-500">Success Rate</span>
                        <div className="rounded-xl bg-indigo-50 p-2 text-indigo-700">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <h3 className="text-2xl font-bold text-slate-900">{stats.successRate}%</h3>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                            <span>{stats.failedCount} failed attempts</span>
                        </div>
                    </div>
                </div>

                {/* Pending Payments */}
                <div className="rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-500">Pending Payments</span>
                        <div className="rounded-xl bg-amber-50 p-2 text-amber-700">
                            <Clock className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <h3 className="text-2xl font-bold text-slate-900">{stats.pendingCount}</h3>
                        <p className="mt-1 text-xs text-slate-400">Awaiting customer checkouts</p>
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
                            placeholder="Search by User name, Email, Razorpay ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-medium text-slate-500">Status:</span>
                        <div className="flex rounded-2xl bg-slate-100 p-1">
                            {['all', 'successful', 'pending', 'failed'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`rounded-xl px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                                        statusFilter === status
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Payments Table */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
                    </div>
                ) : filteredPayments.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 py-16 text-center text-slate-500">
                        <CreditCard className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                        <p className="text-sm font-medium">No payment records found matching your filters.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-sm text-slate-600">
                            <thead>
                                <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-400">
                                    <th className="pb-3 pl-2">Created At</th>
                                    <th className="pb-3">User Details</th>
                                    <th className="pb-3">Amount</th>
                                    <th className="pb-3 text-center">Status</th>
                                    <th className="pb-3">Razorpay Order / Payment ID</th>
                                    <th className="pb-3">Split</th>
                                    <th className="pb-3 pr-2">Orders Attached</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredPayments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-slate-50/55 transition-colors">
                                        {/* Created At */}
                                        <td className="py-4 pl-2 whitespace-nowrap">
                                            <p className="font-semibold text-slate-900">
                                                {new Date(payment.created_at).toLocaleDateString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {new Date(payment.created_at).toLocaleTimeString('en-IN', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </td>

                                        {/* User Details */}
                                        <td className="py-4 max-w-[200px] truncate">
                                            <p className="font-bold text-slate-900">{payment.user_name || 'Anonymous Client'}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{payment.user_email}</p>
                                        </td>

                                        {/* Amount */}
                                        <td className="py-4 whitespace-nowrap">
                                            <p className="font-extrabold text-blue-700">
                                                ₹{Number(payment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </p>
                                            <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mt-0.5">
                                                {payment.payment_method}
                                            </p>
                                        </td>

                                        {/* Status */}
                                        <td className="py-4 text-center whitespace-nowrap">
                                            {payment.status === 'successful' && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                                                    <CheckCircle2 className="h-3.5 w-3.5" /> Successful
                                                </span>
                                            )}
                                            {payment.status === 'failed' && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
                                                    <XCircle className="h-3.5 w-3.5" /> Failed
                                                </span>
                                            )}
                                            {payment.status === 'pending' && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                                                    <Clock className="h-3.5 w-3.5" /> Pending
                                                </span>
                                            )}
                                        </td>

                                        {/* Razorpay Order & Payment IDs */}
                                        <td className="py-4 font-mono text-xs">
                                            {payment.razorpay_order_id ? (
                                                <div className="flex items-center gap-1.5 text-slate-800">
                                                    <span className="font-medium text-slate-500">Order:</span>
                                                    <span>{payment.razorpay_order_id}</span>
                                                    <button 
                                                        onClick={() => handleCopy(payment.razorpay_order_id!, payment.id + '-order')}
                                                        className="text-slate-400 hover:text-slate-600 transition"
                                                    >
                                                        {copiedId === payment.id + '-order' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                                                    </button>
                                                </div>
                                            ) : (
                                                <p className="text-slate-400 italic">No Razorpay Order ID</p>
                                            )}

                                            {payment.razorpay_payment_id && (
                                                <div className="flex items-center gap-1.5 text-slate-800 mt-1">
                                                    <span className="font-medium text-slate-500">PayID:</span>
                                                    <span>{payment.razorpay_payment_id}</span>
                                                    <button 
                                                        onClick={() => handleCopy(payment.razorpay_payment_id!, payment.id + '-pay')}
                                                        className="text-slate-400 hover:text-slate-600 transition"
                                                    >
                                                        {copiedId === payment.id + '-pay' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                                                    </button>
                                                </div>
                                            )}
                                        </td>

                                        {/* Split info */}
                                        <td className="py-4 whitespace-nowrap">
                                            <p className="font-semibold text-slate-900">{Number(payment.split_percentage).toFixed(0)}%</p>
                                            <p className="text-[10px] text-slate-400 uppercase mt-0.5">Installment {payment.split_number}</p>
                                        </td>

                                        {/* Orders Attached */}
                                        <td className="py-4 pr-2">
                                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                                                {payment.order_ids && payment.order_ids.length > 0 ? (
                                                    payment.order_ids.map((orderId) => (
                                                        <button
                                                            key={orderId}
                                                            onClick={() => router.push(`/dashboard/orders?id=${orderId}`)}
                                                            className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all px-2 py-1 font-mono text-[10px] text-slate-600"
                                                        >
                                                            #{orderId.split('-')[0]}
                                                            <ArrowUpRight className="h-2.5 w-2.5" />
                                                        </button>
                                                    ))
                                                ) : (
                                                    <span className="text-slate-400 text-xs italic">Direct Checkout</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
