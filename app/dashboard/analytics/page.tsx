'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Building2,
  Calendar,
  Clock,
  Download,
  DollarSign,
  FileText,
  Globe,
  Loader2,
  MapPin,
  Percent,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  User,
  Users
} from 'lucide-react';
import DashboardLayout from '../../../components/dashboard-layout';
import { adminAPI, extractApiError } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { AnalyticsData } from '../../../lib/types';
import { downloadCsv, downloadPdfReportWithCharts, PdfChartCard } from '../../../lib/export-utils';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const periods = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
}

export default function AnalyticsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [period, setPeriod] = useState('30');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchAnalytics(selectedPeriod: string) {
    try {
      setLoading(true);
      setError('');
      const response = await adminAPI.getAnalytics(selectedPeriod);
      setData(response.data.data);
    } catch (analyticsError) {
      setError(extractApiError(analyticsError, 'Failed to load analytics'));
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
        void fetchAnalytics(period);
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [authLoading, isAuthenticated, period, router]);

  // Compute stats
  const kpis = useMemo(() => {
    if (!data) return { revenue: 0, orders: 0, aov: 0, topCategory: 'N/A' };
    const revenue = data.ordersOverTime.reduce((sum, item) => sum + item.revenue, 0);
    const orders = data.ordersOverTime.reduce((sum, item) => sum + item.count, 0);
    const aov = orders > 0 ? revenue / orders : 0;
    
    let topCategory = 'N/A';
    if (data.categoryDistribution && data.categoryDistribution.length > 0) {
      const sorted = [...data.categoryDistribution].sort((a, b) => b.total_revenue - a.total_revenue);
      topCategory = sorted[0]?.category || 'General';
    }

    return { revenue, orders, aov, topCategory };
  }, [data]);

  const peakSalesDay = useMemo(() => {
    if (!data || !data.ordersOverTime.length) return null;
    let peak = data.ordersOverTime[0];
    data.ordersOverTime.forEach(item => {
      if (item.revenue > peak.revenue) {
        peak = item;
      }
    });
    return {
      date: new Date(peak.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      revenue: peak.revenue,
      count: peak.count
    };
  }, [data]);

  const dayOfWeekData = useMemo(() => {
    if (!data) return { labels: [], datasets: [] };
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const revenueByDay = Array(7).fill(0);
    data.ordersOverTime.forEach(item => {
      const d = new Date(item.date).getDay();
      revenueByDay[d] += item.revenue;
    });
    return {
      labels: days,
      datasets: [
        {
          label: 'Revenue by Day (INR)',
          data: revenueByDay,
          backgroundColor: 'rgba(236, 72, 153, 0.85)',
          borderRadius: 8,
        }
      ]
    };
  }, [data]);

  // Chart: Revenue Over Time
  const revenueChartData = useMemo(() => {
    if (!data) return { labels: [], datasets: [] };
    const labels = data.ordersOverTime.map(item => new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    return {
      labels,
      datasets: [
        {
          fill: true,
          label: 'Revenue (INR)',
          data: data.ordersOverTime.map(item => item.revenue),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.3,
        }
      ]
    };
  }, [data]);

  // Chart: Orders Count Over Time
  const ordersChartData = useMemo(() => {
    if (!data) return { labels: [], datasets: [] };
    const labels = data.ordersOverTime.map(item => new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    return {
      labels,
      datasets: [
        {
          fill: true,
          label: 'Order Count',
          data: data.ordersOverTime.map(item => item.count),
          borderColor: 'rgb(139, 92, 246)',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          tension: 0.3,
        }
      ]
    };
  }, [data]);

  const revenueChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        title: {
          display: true,
          text: 'Revenue (INR)'
        },
      },
    },
  };

  const ordersChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        ticks: {
          stepSize: 1,
        },
        title: {
          display: true,
          text: 'Orders Count'
        },
      },
    },
  };

  // Chart: Sales by Category
  const categoryChartData = useMemo(() => {
    if (!data || !data.categoryDistribution) return { labels: [], datasets: [] };
    const categories = data.categoryDistribution.map(item => item.category || 'Uncategorized');
    const revenues = data.categoryDistribution.map(item => item.total_revenue);
    
    return {
      labels: categories,
      datasets: [
        {
          label: 'Revenue Share (INR)',
          data: revenues,
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(236, 72, 153, 0.8)',
            'rgba(6, 182, 212, 0.8)',
            'rgba(20, 184, 166, 0.8)',
            'rgba(249, 115, 22, 0.8)',
          ],
          borderWidth: 1,
        }
      ]
    };
  }, [data]);

  // Chart: Hourly purchases trend
  const hourlyChartData = useMemo(() => {
    if (!data || !data.purchaseTimeOfDay) return { labels: [], datasets: [] };
    
    // Map to 24 hours
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const hourlyCounts = Array(24).fill(0);
    
    data.purchaseTimeOfDay.forEach(item => {
      if (item.hour_of_day >= 0 && item.hour_of_day < 24) {
        hourlyCounts[item.hour_of_day] = item.order_count;
      }
    });

    return {
      labels: hours.map(h => `${h}:00`),
      datasets: [
        {
          label: 'Number of Purchases',
          data: hourlyCounts,
          backgroundColor: 'rgba(99, 102, 241, 0.85)',
          borderRadius: 8,
        }
      ]
    };
  }, [data]);

  // Chart: Top Products
  const productsChartData = useMemo(() => {
    if (!data || !data.topProducts) return { labels: [], datasets: [] };
    const products = data.topProducts.slice(0, 5).map(item => item.product?.name || 'Unknown product');
    const revenues = data.topProducts.slice(0, 5).map(item => item._sum.total_amount || 0);

    return {
      labels: products,
      datasets: [
        {
          label: 'Revenue (INR)',
          data: revenues,
          backgroundColor: 'rgba(16, 185, 129, 0.85)',
          borderRadius: 8,
        }
      ]
    };
  }, [data]);

  // Chart: Top Vendors
  const vendorsChartData = useMemo(() => {
    if (!data || !data.topVendors) return { labels: [], datasets: [] };
    const vendors = data.topVendors.slice(0, 5).map(item => item.vendor?.name || 'Unknown vendor');
    const revenues = data.topVendors.slice(0, 5).map(item => item._sum.total_amount || 0);

    return {
      labels: vendors,
      datasets: [
        {
          label: 'Revenue (INR)',
          data: revenues,
          backgroundColor: 'rgba(245, 158, 11, 0.85)',
          borderRadius: 8,
        }
      ]
    };
  }, [data]);

  const maxCustomerSpend = useMemo(() => {
    if (!data || !data.topCustomers.length) return 1;
    return Math.max(...data.topCustomers.map(c => c.total_spent), 1);
  }, [data]);

  const maxCityRevenue = useMemo(() => {
    if (!data || !data.topCities.length) return 1;
    return Math.max(...data.topCities.map(c => c.total_revenue), 1);
  }, [data]);

  const analyticsSections = useMemo(() => {
    if (!data) return [];
    return [
      {
        heading: 'Summary',
        headers: ['Metric', 'Value'],
        rows: [
          ['Period', data.period],
          ['Total Revenue', kpis.revenue],
          ['Total Orders', kpis.orders],
          ['Average Order Value', Math.round(kpis.aov)],
          ['Top Category', kpis.topCategory],
          ['Peak Sales Day', peakSalesDay ? `${peakSalesDay.date} (${formatCurrency(peakSalesDay.revenue)}, ${peakSalesDay.count} orders)` : 'N/A'],
        ],
      },
      {
        heading: 'Orders Over Time',
        headers: ['Date', 'Orders', 'Revenue'],
        rows: data.ordersOverTime.map((item) => [item.date, item.count, item.revenue]),
      },
      {
        heading: 'Top Products',
        headers: ['Product', 'Orders', 'Revenue'],
        rows: data.topProducts.map((item) => [item.product?.name || item.product_id, item._count.product_id, item._sum.total_amount || 0]),
      },
      {
        heading: 'Top Vendors',
        headers: ['Vendor', 'Orders', 'Revenue'],
        rows: data.topVendors.map((item) => [item.vendor?.name || item.vendor_id, item._count.vendor_id, item._sum.total_amount || 0]),
      },
      {
        heading: 'Top Customers',
        headers: ['Customer', 'Email', 'Orders', 'Total Spent'],
        rows: data.topCustomers.map((customer) => [customer.name, customer.email, customer.order_count, customer.total_spent]),
      },
      {
        heading: 'Top Cities',
        headers: ['City', 'Orders', 'Revenue'],
        rows: data.topCities.map((city) => [city.city, city.order_count, city.total_revenue]),
      },
      {
        heading: 'Purchase Hours',
        headers: ['Hour', 'Orders', 'Revenue'],
        rows: data.purchaseTimeOfDay.map((hour) => [`${hour.hour_of_day}:00`, hour.order_count, hour.total_revenue]),
      },
      {
        heading: 'Category Distribution',
        headers: ['Category', 'Orders', 'Quantity', 'Revenue'],
        rows: data.categoryDistribution.map((category) => [category.category || 'Uncategorized', category.order_count, category.total_quantity, category.total_revenue]),
      },
      {
        heading: 'Status Distribution',
        headers: ['Status', 'Orders'],
        rows: Object.entries(data.statusDistribution).map(([status, count]) => [status, count || 0]),
      },
    ];
  }, [data, kpis, peakSalesDay]);

  const handleDownloadCsv = () => {
    if (!data) return;
    const rows = analyticsSections.flatMap((section) => [
      [section.heading],
      section.headers || [],
      ...section.rows,
      [],
    ]);
    downloadCsv(`analytics-${period}-days.csv`, ['Analytics Export'], rows);
  };

  const handleDownloadPdf = () => {
    if (!data) return;
    const chartDefinitions = [
      { id: 'revenue-growth', title: 'Revenue Growth Over Time', subtitle: 'Total invoice revenue trends.' },
      { id: 'order-volume', title: 'Order Volume Over Time', subtitle: 'Daily processed orders volume.' },
      { id: 'weekly-sales', title: 'Weekly Sales Distribution', subtitle: 'Total revenue aggregated by day of the week.' },
      { id: 'category-share', title: 'Product Categories Share', subtitle: 'Revenue split across listed marketplace sectors.' },
      { id: 'peak-hours', title: 'Peak Purchase Hours', subtitle: 'Hourly density of client order checkout requests.' },
      { id: 'top-products', title: 'Top Products', subtitle: 'Best performing catalogue items by revenue.' },
      { id: 'top-vendors', title: 'Top Vendors', subtitle: 'Highest grossing vendors on the platform.' },
    ];

    const chartCards = chartDefinitions.flatMap<PdfChartCard>((chart) => {
      const canvas = document.querySelector<HTMLCanvasElement>(`[data-report-chart="${chart.id}"] canvas`);
      if (!canvas || canvas.width === 0 || canvas.height === 0) return [];

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvas.width;
      exportCanvas.height = canvas.height;
      const context = exportCanvas.getContext('2d');
      if (!context) return [];
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      context.drawImage(canvas, 0, 0);

      return [{
        title: chart.title,
        subtitle: `${chart.subtitle} (${data.period})`,
        imageDataUrl: exportCanvas.toDataURL('image/jpeg', 0.92),
      }];
    });

    downloadPdfReportWithCharts(
      `Analytics report - ${data.period}`,
      chartCards,
      analyticsSections,
      `analytics-${period}-days.pdf`
    );
  };

  if (authLoading || !isAuthenticated) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100"><Loader2 className="h-8 w-8 animate-spin text-blue-700" /></div>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="flex flex-col gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Visual Insights & Deep Analytics</h1>
            <p className="text-sm text-slate-500">Comprehensive overview of revenue trends, product/vendor performance, and buyer behaviors.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-48">
              <label className="form-label font-semibold text-xs uppercase tracking-wider text-slate-400">Timeframe</label>
              <select
                className="form-input mt-1.5"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
              >
                {periods.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={!data || loading}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileText className="h-4 w-4" />
                PDF
              </button>
              <button
                type="button"
                onClick={handleDownloadCsv}
                disabled={!data || loading}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                CSV
              </button>
            </div>
          </div>
        </section>

        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        {loading ? (
          <div className="flex items-center justify-center rounded-[1.75rem] border border-slate-200 bg-white py-24 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <article className="rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-6 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Total Revenue</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(kpis.revenue)}</p>
                </div>
                <div className="rounded-2xl bg-blue-50 p-3.5 text-blue-600">
                  <DollarSign className="h-6 w-6" />
                </div>
              </article>

              <article className="rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-6 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Total Volume</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{kpis.orders} Orders</p>
                </div>
                <div className="rounded-2xl bg-purple-50 p-3.5 text-purple-600">
                  <ShoppingBag className="h-6 w-6" />
                </div>
              </article>

              <article className="rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-6 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Average Order Value</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(kpis.aov)}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-3.5 text-emerald-600">
                  <Percent className="h-6 w-6" />
                </div>
              </article>

              <article className="rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-6 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Top Category</p>
                  <p className="mt-2 text-xl font-bold text-slate-900 truncate max-w-[130px]" title={kpis.topCategory}>{kpis.topCategory.toUpperCase()}</p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-3.5 text-amber-600">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </article>

              <article className="rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-6 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Peak Sales Day</p>
                  <p className="mt-2 text-lg font-bold text-slate-900 truncate max-w-[130px]" title={peakSalesDay?.date || 'N/A'}>{peakSalesDay ? peakSalesDay.date : 'N/A'}</p>
                  {peakSalesDay ? (
                    <p className="text-[11px] text-slate-400 mt-0.5">{formatCurrency(peakSalesDay.revenue)}</p>
                  ) : null}
                </div>
                <div className="rounded-2xl bg-pink-50 p-3.5 text-pink-600">
                  <Calendar className="h-6 w-6" />
                </div>
              </article>
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Line Chart: Revenue Trend */}
              <section data-report-chart="revenue-growth" className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Revenue Growth Over Time</h2>
                    <p className="text-xs text-slate-400">Total invoice revenue trends.</p>
                  </div>
                  <span className="rounded-2xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{data?.period}</span>
                </div>
                <div className="min-h-[300px]">
                  {data?.ordersOverTime.length ? (
                    <Line data={revenueChartData} options={revenueChartOptions} />
                  ) : (
                    <div className="flex min-h-[300px] items-center justify-center text-slate-400 text-sm">No data available for timeframe.</div>
                  )}
                </div>
              </section>

              {/* Line Chart: Orders Volume Trend */}
              <section data-report-chart="order-volume" className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Order Volume Over Time</h2>
                    <p className="text-xs text-slate-400">Daily processed orders volume.</p>
                  </div>
                  <span className="rounded-2xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{data?.period}</span>
                </div>
                <div className="min-h-[300px]">
                  {data?.ordersOverTime.length ? (
                    <Line data={ordersChartData} options={ordersChartOptions} />
                  ) : (
                    <div className="flex min-h-[300px] items-center justify-center text-slate-400 text-sm">No data available for timeframe.</div>
                  )}
                </div>
              </section>

              {/* Bar Chart: Weekly Sales Distribution */}
              <section data-report-chart="weekly-sales" className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Weekly Sales Distribution</h2>
                    <p className="text-xs text-slate-400">Total revenue aggregated by day of the week.</p>
                  </div>
                  <Calendar className="h-5 w-5 text-slate-400" />
                </div>
                <div className="min-h-[300px]">
                  {data?.ordersOverTime.length ? (
                    <Bar data={dayOfWeekData} options={{ plugins: { legend: { display: false } } }} />
                  ) : (
                    <div className="flex min-h-[300px] items-center justify-center text-slate-400 text-sm">No data available.</div>
                  )}
                </div>
              </section>

              {/* Doughnut: Category Share */}
              <section data-report-chart="category-share" className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-slate-900">Product Categories Share</h2>
                  <p className="text-xs text-slate-400">Revenue split across listed marketplace sectors.</p>
                </div>
                <div className="mx-auto max-w-[280px] w-full py-4">
                  {data?.categoryDistribution.length ? (
                    <Doughnut data={categoryChartData} options={{ plugins: { legend: { position: 'bottom' } } }} />
                  ) : (
                    <div className="flex min-h-[250px] items-center justify-center text-slate-400 text-sm">No category distribution data.</div>
                  )}
                </div>
              </section>

              {/* Bar: Hourly trend */}
              <section data-report-chart="peak-hours" className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-slate-900">Peak Purchase Hours</h2>
                  <p className="text-xs text-slate-400">Hourly density of client order checkout requests.</p>
                </div>
                <div className="min-h-[250px] flex items-end">
                  {data?.purchaseTimeOfDay.length ? (
                    <Bar data={hourlyChartData} options={{ plugins: { legend: { display: false } } }} />
                  ) : (
                    <div className="flex min-h-[250px] w-full items-center justify-center text-slate-400 text-sm">No time-of-day data.</div>
                  )}
                </div>
              </section>

              {/* Bar: Top Products */}
              <section data-report-chart="top-products" className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Top Products</h2>
                    <p className="text-xs text-slate-400">Best performing catalogue items by revenue.</p>
                  </div>
                  <BarChart3 className="h-5 w-5 text-slate-400" />
                </div>
                <div className="min-h-[250px] flex items-end">
                  {data?.topProducts.length ? (
                    <Bar data={productsChartData} options={{ plugins: { legend: { display: false } } }} />
                  ) : (
                    <div className="flex min-h-[250px] w-full items-center justify-center text-slate-400 text-sm">No top products data.</div>
                  )}
                </div>
              </section>

              {/* Bar: Top Vendors */}
              <section data-report-chart="top-vendors" className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Top Vendors</h2>
                    <p className="text-xs text-slate-400">Highest grossing vendors on the platform.</p>
                  </div>
                  <Building2 className="h-5 w-5 text-slate-400" />
                </div>
                <div className="min-h-[250px] flex items-end">
                  {data?.topVendors.length ? (
                    <Bar data={vendorsChartData} options={{ plugins: { legend: { display: false } } }} />
                  ) : (
                    <div className="flex min-h-[250px] w-full items-center justify-center text-slate-400 text-sm">No top vendors data.</div>
                  )}
                </div>
              </section>
            </div>

            {/* Deep Analysis Grid */}
            <div className="grid gap-6 xl:grid-cols-2">
              {/* Top Cities */}
              <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-2xl bg-sky-50 p-2.5 text-sky-600">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Top Purchasing Cities</h2>
                    <p className="text-xs text-slate-400">Market share by delivery city location.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {data?.topCities.length ? data.topCities.map((cityData) => {
                    const percentage = Math.min(Math.round((cityData.total_revenue / maxCityRevenue) * 100), 100);
                    return (
                      <div key={cityData.city} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            <span className="font-semibold text-slate-800">{cityData.city}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-950">{formatCurrency(cityData.total_revenue)}</span>
                            <span className="ml-2 text-xs text-slate-400">({cityData.order_count} orders)</span>
                          </div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-sky-500 transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="py-10 text-center text-slate-400 text-sm">No city purchases recorded.</div>
                  )}
                </div>
              </section>

              {/* Top Spenders */}
              <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-2xl bg-indigo-50 p-2.5 text-indigo-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Highest Purchasing Customers</h2>
                    <p className="text-xs text-slate-400">Top clients ranked by total spend volume.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {data?.topCustomers.length ? data.topCustomers.map((customer) => {
                    const percentage = Math.min(Math.round((customer.total_spent / maxCustomerSpend) * 100), 100);
                    return (
                      <div key={customer.user_id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 max-w-[200px] sm:max-w-xs truncate">
                            <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            <div>
                              <span className="font-semibold text-slate-800 block truncate">{customer.name}</span>
                              <span className="text-xs text-slate-400 block truncate">{customer.email}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-950">{formatCurrency(customer.total_spent)}</span>
                            <span className="ml-2 text-xs text-slate-400">({customer.order_count} orders)</span>
                          </div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="py-10 text-center text-slate-400 text-sm">No customer transactions recorded.</div>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
