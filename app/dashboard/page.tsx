'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  DollarSign,
  Loader2,
  Package,
  ShoppingCart,
  Users,
} from 'lucide-react';
import DashboardLayout from '../../components/dashboard-layout';
import { adminAPI, extractApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { DashboardStats } from '../../lib/types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartDetail, setChartDetail] = useState<{ title: string; description: string; orders: DashboardStats['recentOrders'] } | null>(null);

  async function fetchDashboardStats() {
    try {
      setLoading(true);
      setError('');
      const response = await adminAPI.getDashboard();
      setStats(response.data.data);
    } catch (dashboardError) {
      setError(extractApiError(dashboardError, 'Failed to load dashboard data'));
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
      const timer = window.setTimeout(() => {
        void fetchDashboardStats();
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [authLoading, isAuthenticated, router]);

  const statusChartData = useMemo(() => {
    const entries = Object.entries(stats?.orderStats || {});
    return {
      labels: entries.map(([status]) => status.replaceAll('_', ' ')),
      datasets: [
        {
          data: entries.map(([, count]) => count),
          backgroundColor: ['#f59e0b', '#2563eb', '#7c3aed', '#059669', '#dc2626'],
          borderWidth: 0,
        },
      ],
    };
  }, [stats]);

  const recentOrderBarData = useMemo(() => {
    const orders = stats?.recentOrders || [];
    return {
      labels: orders.map((order) => (order.customer_name || 'Order').slice(0, 12)),
      datasets: [
        {
          label: 'Order amount',
          data: orders.map((order) => Number(order.total_amount || 0)),
          backgroundColor: '#1f4c45',
          borderRadius: 8,
        },
      ],
    };
  }, [stats]);

  const sourceChartData = useMemo(() => {
    const sourceCounts = (stats?.recentOrders || []).reduce<Record<string, number>>((acc, order) => {
      acc[order.source || 'unknown'] = (acc[order.source || 'unknown'] || 0) + 1;
      return acc;
    }, {});
    const entries = Object.entries(sourceCounts);
    return {
      labels: entries.map(([source]) => source.replaceAll('_', ' ')),
      datasets: [
        {
          data: entries.map(([, count]) => count),
          backgroundColor: ['#0f766e', '#2563eb', '#f59e0b', '#7c3aed'],
          borderWidth: 0,
        },
      ],
    };
  }, [stats]);

  const dashboardMetrics = useMemo(() => {
    const orderStats = stats?.orderStats || {};
    const totalOrders = stats?.totals.orders || 0;
    const delivered = orderStats.delivered || 0;
    const pending = orderStats.pending || 0;
    const recentOrders = stats?.recentOrders || [];
    const recentRevenue = recentOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const avgRecentOrder = recentOrders.length ? recentRevenue / recentOrders.length : 0;
    const activeVendorRatio = stats?.totals.vendors ? Math.round(((stats.totals.activeVendors || 0) / stats.totals.vendors) * 100) : 0;

    return [
      {
        label: 'Completion rate',
        value: totalOrders ? `${Math.round((delivered / totalOrders) * 100)}%` : '0%',
        detail: `${delivered} delivered of ${totalOrders}`,
        icon: CheckCircle2,
        tone: 'bg-emerald-50 text-emerald-700',
      },
      {
        label: 'Pending workload',
        value: pending,
        detail: 'Orders waiting for action',
        icon: AlertTriangle,
        tone: 'bg-amber-50 text-amber-700',
      },
      {
        label: 'Avg recent order',
        value: `₹${Math.round(avgRecentOrder).toLocaleString('en-IN')}`,
        detail: `${recentOrders.length} latest orders`,
        icon: DollarSign,
        tone: 'bg-blue-50 text-blue-700',
      },
      {
        label: 'Active vendor ratio',
        value: `${activeVendorRatio}%`,
        detail: `${stats?.totals.activeVendors || 0} active of ${stats?.totals.vendors || 0}`,
        icon: Building2,
        tone: 'bg-violet-50 text-violet-700',
      },
    ];
  }, [stats]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
      </div>
    );
  }

  const statCards = [
    { name: 'Total Users', value: stats?.totals.users || 0, icon: Users, tone: 'bg-blue-50 text-blue-700' },
    { name: 'Total Products', value: stats?.totals.products || 0, icon: Package, tone: 'bg-emerald-50 text-emerald-700' },
    { name: 'Total Orders', value: stats?.totals.orders || 0, icon: ShoppingCart, tone: 'bg-violet-50 text-violet-700' },
    { name: 'Active Vendors', value: stats?.totals.activeVendors || 0, icon: Building2, tone: 'bg-amber-50 text-amber-700' },
  ];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  const openOrderDetail = (orderId: string) => {
    router.push(`/dashboard/orders?orderId=${orderId}`);
  };

  const detailOrders = stats?.orderDetails?.length ? stats.orderDetails : stats?.recentOrders || [];

  const showRecentOrderDetail = (index: number) => {
    const order = stats?.recentOrders[index];
    if (!order) return;
    setChartDetail({
      title: `Order by ${order.customer_name || 'Customer'}`,
      description: `${order.product_name || 'Unknown product'} supplied by ${order.vendor_name || 'Unknown vendor'}`,
      orders: [order],
    });
  };

  const showStatusDetail = (index: number) => {
    const status = Object.keys(stats?.orderStats || {})[index];
    if (!status) return;
    const orders = detailOrders.filter((order) => order.status === status);
    setChartDetail({
      title: `${status.replaceAll('_', ' ')} orders`,
      description: orders.length ? 'Recent matching orders from the dashboard feed.' : 'No recent orders in this status are present in the dashboard feed.',
      orders,
    });
  };

  const showSourceDetail = (index: number) => {
    const source = sourceChartData.labels[index];
    if (!source) return;
    const normalizedSource = String(source).replaceAll(' ', '_');
    const orders = detailOrders.filter((order) => (order.source || 'unknown') === normalizedSource);
    setChartDetail({
      title: `${String(source)} orders`,
      description: orders.length ? 'Recent matching orders from the dashboard feed.' : 'No recent orders from this source are present in the dashboard feed.',
      orders,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-[rgba(31,76,69,0.16)] bg-[linear-gradient(135deg,#1f2d2d,#30544d_52%,#c7a86a)] p-8 text-white shadow-[0_18px_60px_rgba(44,55,52,0.18)]">
          <p className="font-mono text-[11px] uppercase tracking-[0.42em] text-[#eadfcf]">Overview</p>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-between">
            <div className="flex-1">
              <h1 className="max-w-2xl text-3xl font-semibold leading-tight">MTWO admin dashboard for vendor sourcing, order movement, and approvals.</h1>
              <p className="mt-3 max-w-2xl text-sm text-[#f6ecdf]">
                A cleaner control surface for tracking products, fulfillment activity, and commercial flow without the generic starter-dashboard feel.
              </p>
            </div>
            <div className="flex min-w-[240px] flex-col justify-center rounded-[1.6rem] border border-white/10 bg-[rgba(249,244,236,0.18)] px-5 py-4 backdrop-blur-sm lg:self-stretch">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#f3e6d4]">Monthly revenue</p>
              <p className="mt-2 text-3xl font-semibold">${Number(stats?.monthlyRevenue || 0).toFixed(2)}</p>
              <p className="mt-2 text-sm text-[#f4e9db]">Delivered orders closed in the active month.</p>
            </div>
          </div>
        </section>

        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        {loading ? (
          <div className="flex items-center justify-center rounded-[2rem] border border-[var(--border)] bg-[var(--card)] py-20 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {statCards.map((card) => (
                <article key={card.name} className="flex h-full min-h-[156px] flex-col justify-between rounded-[1.6rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[0_12px_32px_rgba(96,82,62,0.08)] backdrop-blur-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#746b5f]">{card.name}</p>
                      <p className="mt-2 text-3xl font-semibold text-slate-900">{card.value}</p>
                    </div>
                    <div className={`shrink-0 rounded-[1.1rem] p-3 ${card.tone}`}>
                      <card.icon className="h-6 w-6" />
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {dashboardMetrics.map((metric) => (
                <article key={metric.label} className="rounded-[1.35rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[0_12px_32px_rgba(96,82,62,0.08)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#746b5f]">{metric.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{metric.value}</p>
                      <p className="mt-1 text-sm text-slate-500">{metric.detail}</p>
                    </div>
                    <div className={`shrink-0 rounded-[1rem] p-3 ${metric.tone}`}>
                      <metric.icon className="h-5 w-5" />
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-3">
              <article className="rounded-[1.6rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[0_12px_32px_rgba(96,82,62,0.08)]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Recent order value</h2>
                  <ShoppingCart className="h-5 w-5 text-[#746b5f]" />
                </div>
                <div className="min-h-[260px]">
                  {stats?.recentOrders.length ? (
                    <Bar data={recentOrderBarData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } }, onClick: (_event, elements) => { if (elements[0]) showRecentOrderDetail(elements[0].index); } }} />
                  ) : (
                    <div className="flex min-h-[260px] items-center justify-center text-sm text-slate-500">No recent order values available.</div>
                  )}
                </div>
              </article>

              <article className="rounded-[1.6rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[0_12px_32px_rgba(96,82,62,0.08)]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Fulfillment status share</h2>
                  <Activity className="h-5 w-5 text-[#746b5f]" />
                </div>
                <div className="mx-auto max-w-[300px]">
                  {Object.entries(stats?.orderStats || {}).length ? (
                    <Doughnut data={statusChartData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } }, onClick: (_event, elements) => { if (elements[0]) showStatusDetail(elements[0].index); } }} />
                  ) : (
                    <div className="flex min-h-[260px] items-center justify-center text-sm text-slate-500">No status distribution available.</div>
                  )}
                </div>
              </article>

              <article className="rounded-[1.6rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[0_12px_32px_rgba(96,82,62,0.08)]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Recent order source</h2>
                  <Building2 className="h-5 w-5 text-[#746b5f]" />
                </div>
                <div className="mx-auto max-w-[300px]">
                  {stats?.recentOrders.length ? (
                    <Doughnut data={sourceChartData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } }, onClick: (_event, elements) => { if (elements[0]) showSourceDetail(elements[0].index); } }} />
                  ) : (
                    <div className="flex min-h-[260px] items-center justify-center text-sm text-slate-500">No source mix available.</div>
                  )}
                </div>
              </article>
            </section>

            {chartDetail ? (
              <section className="rounded-[1.6rem] border border-blue-200 bg-blue-50/70 p-6 shadow-[0_12px_32px_rgba(96,82,62,0.08)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-blue-700">Chart details</p>
                    <h2 className="mt-2 text-lg font-semibold capitalize text-slate-900">{chartDetail.title}</h2>
                    <p className="mt-1 text-sm text-slate-600">{chartDetail.description}</p>
                  </div>
                  <button type="button" onClick={() => setChartDetail(null)} className="rounded-2xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">Close</button>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {chartDetail.orders.length ? chartDetail.orders.map((order) => (
                    <button key={order.id} type="button" onClick={() => openOrderDetail(order.id)} className="rounded-[1.25rem] border border-blue-100 bg-white p-4 text-left transition hover:border-blue-400">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{order.customer_name || 'Unknown customer'}</p>
                          <p className="mt-1 text-sm text-slate-500">{order.product_name || 'Unknown product'} with {order.vendor_name || 'Unknown vendor'}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(order.status)}`}>{order.status.replaceAll('_', ' ')}</span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-900">₹{Number(order.total_amount || 0).toLocaleString('en-IN')}</p>
                    </button>
                  )) : (
                    <p className="rounded-2xl bg-white px-4 py-5 text-sm text-slate-500">No matching recent orders available in this dashboard snapshot.</p>
                  )}
                </div>
              </section>
            ) : null}

            <section className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
              <article className="h-full rounded-[1.6rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[0_12px_32px_rgba(96,82,62,0.08)] backdrop-blur-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Recent orders</h2>
                  <ShoppingCart className="h-5 w-5 text-[#746b5f]" />
                </div>
                <div className="space-y-3">
                  {stats?.recentOrders.length ? (
                    stats.recentOrders.map((order) => (
                      <button key={order.id} type="button" onClick={() => openOrderDetail(order.id)} className="flex w-full flex-col gap-3 rounded-[1.35rem] border border-[rgba(31,76,69,0.08)] bg-[rgba(255,255,255,0.58)] px-4 py-4 text-left transition hover:border-[#1f4c45] hover:bg-white sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{order.customer_name}</p>
                          <p className="text-sm text-slate-500">{order.product_name || 'Unknown Product'} with {order.vendor_name || 'Unknown Vendor'}</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="font-semibold text-slate-900">${Number(order.total_amount).toFixed(2)}</p>
                          <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(order.status)}`}>
                            {order.status.replaceAll('_', ' ')}
                          </span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">No recent orders found.</p>
                  )}
                </div>
              </article>

              <article className="flex h-full flex-col rounded-[1.6rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[0_12px_32px_rgba(96,82,62,0.08)] backdrop-blur-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Order status mix</h2>
                  <Activity className="h-5 w-5 text-[#746b5f]" />
                </div>
                <div className="flex-1 space-y-3">
                  {Object.entries(stats?.orderStats || {}).length ? (
                    Object.entries(stats?.orderStats || {}).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between rounded-[1.35rem] bg-[rgba(255,255,255,0.58)] px-4 py-3 text-sm text-slate-700">
                        <span className="capitalize">{status.replaceAll('_', ' ')}</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(status)}`}>{count}</span>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">No order status data available.</p>
                  )}
                </div>
                <div className="mt-6 rounded-[1.4rem] bg-[rgba(204,178,122,0.22)] p-4 text-[#46361c]">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5" />
                    <p className="text-sm font-medium">Revenue is counted from delivered orders in the current month.</p>
                  </div>
                </div>
              </article>
            </section>

          </>
        )}
      </div>
    </DashboardLayout>
  );
}
