'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    MessageSquare,
    Mail,
    Phone,
    Building2,
    Clock,
    Loader2,
    Search,
    CheckCircle2,
    AlertCircle,
    Eye,
    RefreshCw,
    User,
} from 'lucide-react';

import { ContactQuery } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { contactQueriesAPI, extractApiError } from '@/lib/api';
import DashboardLayout from '../../../components/dashboard-layout';

type FilterTab = 'all' | 'new' | 'in_progress' | 'resolved';

const statusConfig = {
    new: {
        label: 'New',
        icon: AlertCircle,
        badge: 'bg-blue-100 border-blue-200 text-blue-700',
        border: 'border-blue-200',
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-600',
    },
    in_progress: {
        label: 'In Progress',
        icon: Clock,
        badge: 'bg-amber-100 border-amber-200 text-amber-700',
        border: 'border-amber-200',
        iconBg: 'bg-amber-50',
        iconColor: 'text-amber-600',
    },
    resolved: {
        label: 'Resolved',
        icon: CheckCircle2,
        badge: 'bg-emerald-100 border-emerald-200 text-emerald-700',
        border: 'border-emerald-200',
        iconBg: 'bg-emerald-50',
        iconColor: 'text-emerald-600',
    },
} as const;

export default function ContactQueriesPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [queries, setQueries] = useState<ContactQuery[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
    const [expandedQuery, setExpandedQuery] = useState<string | null>(null);

    const fetchQueries = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await contactQueriesAPI.getAll(
                activeFilter !== 'all'
                    ? { status: activeFilter }
                    : undefined
            );

            setQueries(response.data?.data || []);
        } catch (err) {
            setError(
                extractApiError(err, 'Failed to load contact queries')
            );
        } finally {
            setLoading(false);
        }


    };

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.replace('/login');
            return;
        }


        if (isAuthenticated) {
            void fetchQueries();
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps


    }, [authLoading, isAuthenticated, router, activeFilter]);

    const updateStatus = async (
        id: string,
        status: ContactQuery['status']
    ) => {
        try {
            setError('');
            setSuccess('');


            await contactQueriesAPI.updateStatus(id, status);

            setSuccess(
                `Query marked as ${status.replace('_', ' ')} successfully.`
            );

            await fetchQueries();
        } catch (err) {
            setError(
                extractApiError(err, 'Failed to update query status')
            );
        }


    };

    const filteredQueries = queries.filter((query) => {
        if (!searchQuery.trim()) return true;


        const search = searchQuery.toLowerCase();

        return (
            query.name?.toLowerCase().includes(search) ||
            query.email?.toLowerCase().includes(search) ||
            query.subject?.toLowerCase().includes(search) ||
            query.message?.toLowerCase().includes(search) ||
            query.company?.toLowerCase().includes(search) ||
            query.phone?.toLowerCase().includes(search)
        );


    });

    const stats = {
        total: queries.length,
        new: queries.filter((q) => q.status === 'new').length,
        inProgress: queries.filter((q) => q.status === 'in_progress').length,
        resolved: queries.filter((q) => q.status === 'resolved').length,
    };

    const filterTabs: {
        id: FilterTab;
        label: string;
        count: number;
    }[] = [
            {
                id: 'all',
                label: 'All Queries',
                count: stats.total,
            },
            {
                id: 'new',
                label: 'New',
                count: stats.new,
            },
            {
                id: 'in_progress',
                label: 'In Progress',
                count: stats.inProgress,
            },
            {
                id: 'resolved',
                label: 'Resolved',
                count: stats.resolved,
            },
        ];

    if (authLoading || !isAuthenticated) {
        return (<div className="flex min-h-screen items-center justify-center bg-slate-100"> <Loader2 className="h-8 w-8 animate-spin text-blue-700" /> </div>
        );
    }

    return (<DashboardLayout> <div className="space-y-6">


        {/* ========================================================= */}
        {/* HEADER */}
        {/* ========================================================= */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                        <MessageSquare className="h-4 w-4" />
                    </div>

                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Client Queries
                        </h1>
                    </div>
                </div>

                <p className="mt-2 text-sm text-slate-500">
                    Review and manage messages submitted through the MTWO contact form.
                </p>
            </div>

            <button
                type="button"
                onClick={() => void fetchQueries()}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
                <RefreshCw
                    className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                />
                Refresh
            </button>
        </div>

        {/* ========================================================= */}
        {/* STATS */}
        {/* ========================================================= */}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {/* Total */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Total Queries
                        </p>

                        <p className="mt-2 text-3xl font-bold text-slate-800">
                            {stats.total}
                        </p>
                    </div>

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                        <MessageSquare className="h-5 w-5 text-slate-600" />
                    </div>
                </div>
            </div>

            {/* New */}
            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/50 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                            New
                        </p>

                        <p className="mt-2 text-3xl font-bold text-blue-700">
                            {stats.new}
                        </p>
                    </div>

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100">
                        <AlertCircle className="h-5 w-5 text-blue-600" />
                    </div>
                </div>
            </div>

            {/* In Progress */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                            In Progress
                        </p>

                        <p className="mt-2 text-3xl font-bold text-amber-700">
                            {stats.inProgress}
                        </p>
                    </div>

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100">
                        <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                </div>
            </div>

            {/* Resolved */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                            Resolved
                        </p>

                        <p className="mt-2 text-3xl font-bold text-emerald-700">
                            {stats.resolved}
                        </p>
                    </div>

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                </div>
            </div>
        </div>

        {/* ========================================================= */}
        {/* FILTER + SEARCH */}
        {/* ========================================================= */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex flex-wrap gap-2">
                {filterTabs.map((tab) => {
                    const active = activeFilter === tab.id;

                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveFilter(tab.id)}
                            className={`rounded-xl border px-4 py-2.5 text-xs font-bold transition ${active
                                    ? 'border-slate-800 bg-slate-800 text-white shadow-md'
                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            {tab.label}
                            <span
                                className={`ml-1.5 ${active ? 'text-slate-300' : 'text-slate-400'
                                    }`}
                            >
                                ({tab.count})
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="relative w-full lg:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, email, subject..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
            </div>
        </div>

        {/* ========================================================= */}
        {/* ALERTS */}
        {/* ========================================================= */}

        {error && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
            </div>
        )}

        {success && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{success}</span>
            </div>
        )}

        {/* ========================================================= */}
        {/* QUERY LIST */}
        {/* ========================================================= */}

        <div className="space-y-3">

            {loading ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <Loader2 className="h-7 w-7 animate-spin text-slate-500" />

                    <p className="mt-3 text-sm font-medium text-slate-500">
                        Loading contact queries...
                    </p>
                </div>
            ) : filteredQueries.length === 0 ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                        <MessageSquare className="h-7 w-7 text-slate-400" />
                    </div>

                    <p className="mt-4 text-sm font-semibold text-slate-700">
                        No contact queries found
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                        {searchQuery
                            ? 'Try changing your search or selected filter.'
                            : 'There are currently no queries in this category.'}
                    </p>
                </div>
            ) : (
                filteredQueries.map((query) => {
                    const isExpanded = expandedQuery === query.id;

                    const config = statusConfig[query.status];
                    const StatusIcon = config.icon;

                    return (
                        <div
                            key={query.id}
                            className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all ${config.border}`}
                        >

                            {/* ================================================= */}
                            {/* QUERY ROW */}
                            {/* ================================================= */}

                            <button
                                type="button"
                                onClick={() =>
                                    setExpandedQuery(
                                        isExpanded ? null : query.id
                                    )
                                }
                                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50/70 sm:px-6"
                            >

                                <div className="flex min-w-0 items-center gap-4">

                                    {/* Avatar */}
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">
                                        {query.name?.charAt(0)?.toUpperCase() || '?'}
                                    </div>

                                    {/* Main information */}
                                    <div className="min-w-0">

                                        <div className="flex min-w-0 items-center gap-2">
                                            <h3 className="truncate text-sm font-bold text-slate-900">
                                                {query.name || 'Unknown User'}
                                            </h3>

                                            {query.company && (
                                                <span className="hidden truncate text-xs text-slate-400 sm:inline">
                                                    · {query.company}
                                                </span>
                                            )}
                                        </div>

                                        <p className="mt-1 truncate text-xs text-slate-500">
                                            {query.subject || 'No subject'}
                                        </p>

                                        <p className="mt-1 truncate text-xs text-slate-400">
                                            {query.email}
                                        </p>
                                    </div>
                                </div>

                                {/* Right */}
                                <div className="flex shrink-0 items-center gap-2 sm:gap-3">

                                    <span
                                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold sm:px-3 sm:text-xs ${config.badge}`}
                                    >
                                        <StatusIcon className="h-3.5 w-3.5" />

                                        <span className="hidden sm:inline">
                                            {config.label}
                                        </span>
                                    </span>

                                    <Eye
                                        className={`h-4 w-4 transition ${isExpanded
                                                ? 'rotate-0 text-blue-600'
                                                : 'text-slate-400'
                                            }`}
                                    />
                                </div>
                            </button>

                            {/* ================================================= */}
                            {/* EXPANDED CONTENT */}
                            {/* ================================================= */}

                            {isExpanded && (
                                <div className="border-t border-slate-100 bg-slate-50/50 p-5 sm:p-6">

                                    <div className="space-y-5">

                                        {/* Message */}
                                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                                            <div className="flex items-center gap-2">
                                                <MessageSquare className="h-4 w-4 text-slate-400" />

                                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                                    Message
                                                </p>
                                            </div>

                                            <div className="mt-3 rounded-xl bg-slate-50 p-4">
                                                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                                    {query.message}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Contact Information */}
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                                            {/* Name */}
                                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                                                    <User className="h-3.5 w-3.5" />
                                                    Name
                                                </div>

                                                <p className="mt-2 truncate text-sm font-semibold text-slate-900">
                                                    {query.name || '—'}
                                                </p>
                                            </div>

                                            {/* Email */}
                                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                                                    <Mail className="h-3.5 w-3.5" />
                                                    Email
                                                </div>

                                                <a
                                                    href={`mailto:${query.email}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="mt-2 block truncate text-sm font-semibold text-blue-700 hover:underline"
                                                >
                                                    {query.email || '—'}
                                                </a>
                                            </div>

                                            {/* Phone */}
                                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                                                    <Phone className="h-3.5 w-3.5" />
                                                    Phone
                                                </div>

                                                {query.phone ? (
                                                    <a
                                                        href={`tel:${query.phone}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="mt-2 block text-sm font-semibold text-slate-900 hover:text-blue-700"
                                                    >
                                                        {query.phone}
                                                    </a>
                                                ) : (
                                                    <p className="mt-2 text-sm text-slate-400">
                                                        Not provided
                                                    </p>
                                                )}
                                            </div>

                                            {/* Company */}
                                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                                                    <Building2 className="h-3.5 w-3.5" />
                                                    Company
                                                </div>

                                                <p className="mt-2 truncate text-sm font-semibold text-slate-900">
                                                    {query.company || 'Not provided'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Meta */}
                                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-200 pt-4 text-xs text-slate-500">

                                            <span className="flex items-center gap-1.5">
                                                <Clock className="h-3.5 w-3.5" />

                                                Submitted:
                                                <strong className="text-slate-700">
                                                    {new Date(query.created_at).toLocaleString()}
                                                </strong>
                                            </span>

                                            <span>
                                                Query ID:
                                                <strong className="ml-1 font-mono text-slate-700">
                                                    {query.id}
                                                </strong>
                                            </span>
                                        </div>

                                        {/* Status actions */}
                                        <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center">

                                            <p className="mr-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                                                Update Status
                                            </p>

                                            <div className="flex flex-wrap gap-2">

                                                {/* New */}
                                                <button
                                                    type="button"
                                                    disabled={query.status === 'new'}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        void updateStatus(query.id, 'new');
                                                    }}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    <AlertCircle className="h-4 w-4" />
                                                    New
                                                </button>

                                                {/* In Progress */}
                                                <button
                                                    type="button"
                                                    disabled={query.status === 'in_progress'}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        void updateStatus(
                                                            query.id,
                                                            'in_progress'
                                                        );
                                                    }}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    <Clock className="h-4 w-4" />
                                                    In Progress
                                                </button>

                                                {/* Resolved */}
                                                <button
                                                    type="button"
                                                    disabled={query.status === 'resolved'}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        void updateStatus(
                                                            query.id,
                                                            'resolved'
                                                        );
                                                    }}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    Resolve
                                                </button>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>

    </div>
    </DashboardLayout>

    );
}
