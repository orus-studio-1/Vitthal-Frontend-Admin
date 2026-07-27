'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Loader2, Bike, Mail, Phone, MapPin, ShieldCheck, ShieldAlert, X, Navigation, PackageCheck, CheckCircle2 } from 'lucide-react';
import DashboardLayout from '../../../components/dashboard-layout';
import { extractApiError, riderAPI, fulfillmentCenterAPI } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import dynamic from 'next/dynamic';

const LiveTrackModal = dynamic(() => import('../../../components/live-track-modal'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex h-[88vh] w-full max-w-6xl items-center justify-center rounded-[2rem] border border-slate-100 bg-white shadow-2xl">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          <p className="text-sm font-semibold text-slate-500">Loading tracking dashboard...</p>
        </div>
      </div>
    </div>
  ),
});

interface DeliveryAgent {
  id: string;
  special_rider_id: string;
  contact_phone: string | null;
  vehicle_type: string | null;
  vehicle_number: string | null;
  status: string;
  is_online: boolean;
  created_at: string;
  rider_name: string;
  rider_email: string;
  center_name: string;
  center_code: string;
  completed_deliveries_count?: number;
}

export default function RidersPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [riders, setRiders] = useState<DeliveryAgent[]>([]);
  const [centers, setCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [trackingRiderId, setTrackingRiderId] = useState<string | null>(null);
  const [selectedRiderForDeliveries, setSelectedRiderForDeliveries] = useState<DeliveryAgent | null>(null);
  const [riderDeliveries, setRiderDeliveries] = useState<any[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  // Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    contact_phone: '',
    vehicle_type: 'Motorcycle',
    vehicle_number: '',
    fulfillment_center_id: '',
  });

  async function fetchData() {
    try {
      setLoading(true);
      setError('');
      
      // Load both riders and fulfillment centers
      const [ridersRes, centersRes] = await Promise.all([
        riderAPI.getAll(),
        fulfillmentCenterAPI.getAll(),
      ]);
      
      setRiders(ridersRes.data.data);
      setCenters(centersRes.data.data);
      
      // Set default selected center if available
      if (centersRes.data.data.length > 0) {
        setFormData((prev) => ({
          ...prev,
          fulfillment_center_id: centersRes.data.data[0].id,
        }));
      }
    } catch (err) {
      setError(extractApiError(err, 'Failed to load database records.'));
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
      void fetchData();
    }
  }, [authLoading, isAuthenticated, router]);

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      contact_phone: '',
      vehicle_type: 'Motorcycle',
      vehicle_number: '',
      fulfillment_center_id: centers[0]?.id || '',
    });
    setError('');
    setSuccess('');
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      if (!formData.name || !formData.email || !formData.password || !formData.fulfillment_center_id) {
        setError('Name, email, password, and Fulfillment Center are required.');
        setSubmitting(false);
        return;
      }

      await riderAPI.create(formData);
      setSuccess('Rider Partner registered successfully!');
      setIsFormOpen(false);
      void fetchData();
    } catch (err) {
      setError(extractApiError(err, 'Failed to register Rider Partner.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Filter riders list by search query
  const filteredRiders = useMemo(() => {
    if (!searchQuery) return riders;
    const q = searchQuery.toLowerCase();
    return riders.filter(
      (r) =>
        r.rider_name.toLowerCase().includes(q) ||
        r.rider_email.toLowerCase().includes(q) ||
        r.special_rider_id.toLowerCase().includes(q) ||
        (r.vehicle_number && r.vehicle_number.toLowerCase().includes(q)) ||
        r.center_name.toLowerCase().includes(q)
    );
  }, [riders, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: riders.length,
      online: riders.filter((r) => r.is_online).length,
      active: riders.filter((r) => r.status === 'active').length,
      blocked: riders.filter((r) => r.status === 'blocked').length,
    };
  }, [riders]);

  const handleOpenRiderDeliveries = async (rider: DeliveryAgent) => {
    try {
      setSelectedRiderForDeliveries(rider);
      setLoadingDeliveries(true);
      const res = await riderAPI.getDeliveries(rider.id);
      setRiderDeliveries(res.data.data || []);
    } catch (err) {
      console.error('Failed to load rider deliveries:', err);
      setRiderDeliveries([]);
    } finally {
      setLoadingDeliveries(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Rider Partners</h1>
            <p className="text-sm text-slate-500">
              Oversee active delivery agents, monitor live shift logs, and track individual completed deliveries.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition"
          >
            <Plus className="h-4 w-4" />
            Register Rider Partner
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Riders</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight text-slate-900">{stats.total}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Online On Shift</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight text-emerald-600">{stats.online}</span>
              <span className="text-xs text-slate-500">active</span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Approved Accounts</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight text-slate-900">{stats.active}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Deliveries Done</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight text-indigo-600">
                {riders.reduce((acc, r) => acc + (r.completed_deliveries_count || 0), 0)}
              </span>
              <span className="text-xs text-slate-500">completed drops</span>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID, name, vehicle number, or hub..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-11 text-sm outline-none transition focus:border-slate-400"
            />
          </div>
        </div>

        {/* Success / Error notification */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {success}
          </div>
        )}

        {/* Main List Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex h-60 items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Syncing logistics database...
            </div>
          ) : filteredRiders.length === 0 ? (
            <div className="flex h-60 flex-col items-center justify-center text-slate-500">
              <Bike className="h-10 w-10 text-slate-300" />
              <p className="mt-4 text-sm">No delivery agents registered yet matching query.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4">Rider ID</th>
                    <th className="px-6 py-4">Agent Name</th>
                    <th className="px-6 py-4">Contact Phone</th>
                    <th className="px-6 py-4">Vehicle Details</th>
                    <th className="px-6 py-4">Attached Hub</th>
                    <th className="px-6 py-4 text-center">Deliveries Done</th>
                    <th className="px-6 py-4">Shift Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRiders.map((rider) => (
                    <tr key={rider.id} className="hover:bg-slate-50/50 transition duration-150">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900 text-xs">
                        <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-slate-800">
                          {rider.special_rider_id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{rider.rider_name}</div>
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span>{rider.rider_email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {rider.contact_phone ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            <span>{rider.contact_phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <div className="font-medium text-slate-900">{rider.vehicle_type || 'Unspecified'}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{rider.vehicle_number || 'No plate record'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold text-slate-900 text-xs">{rider.center_name}</div>
                            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{rider.center_code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleOpenRiderDeliveries(rider)}
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
                        >
                          <PackageCheck className="h-3.5 w-3.5 text-emerald-600" />
                          {rider.completed_deliveries_count ?? 0} Drops
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              rider.is_online
                                ? 'bg-emerald-500 ring-4 ring-emerald-100'
                                : 'bg-slate-300'
                            }`}
                          />
                          <span className={`text-xs font-semibold ${rider.is_online ? 'text-emerald-700' : 'text-slate-500'}`}>
                            {rider.is_online ? 'On Duty' : 'Off Duty'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenRiderDeliveries(rider)}
                            className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <PackageCheck className="h-3.5 w-3.5 text-slate-500" />
                            History
                          </button>
                          <button
                            disabled={!rider.is_online}
                            onClick={() => setTrackingRiderId(rider.id)}
                            className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold border transition ${
                              rider.is_online
                                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:text-amber-800 shadow-sm cursor-pointer'
                                : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                            }`}
                            title={rider.is_online ? "Track Live Location" : "Rider is offline"}
                          >
                            <Navigation className="h-3 w-3 rotate-45 fill-current" />
                            Live
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Register Form Dialog Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-950">Register Rider Partner</h2>
              <button onClick={() => setIsFormOpen(false)} className="rounded-lg p-1.5 hover:bg-slate-100 transition text-slate-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none transition focus:border-slate-400"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="rider@mtwo.com"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none transition focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Password</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min 6 characters"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none transition focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Fulfillment Hub attachment</label>
                <select
                  value={formData.fulfillment_center_id}
                  onChange={(e) => setFormData({ ...formData, fulfillment_center_id: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none transition focus:border-slate-400"
                >
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code}) - {c.city}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    placeholder="+91 XXXXX XXXXX"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none transition focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Vehicle Type</label>
                  <select
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none transition focus:border-slate-400"
                  >
                    <option value="Motorcycle">Motorcycle</option>
                    <option value="Bicycle">Bicycle</option>
                    <option value="Three-Wheeler / Auto">Three-Wheeler / Auto</option>
                    <option value="Mini-Truck / Van">Mini-Truck / Van</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Vehicle Plate Number</label>
                <input
                  type="text"
                  value={formData.vehicle_number}
                  onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                  placeholder="e.g. MH-12-AB-1234"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none transition focus:border-slate-400"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Register Rider'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RIDER DELIVERIES TRACKING MODAL */}
      {selectedRiderForDeliveries && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-950">
                    Completed Deliveries — {selectedRiderForDeliveries.rider_name}
                  </h2>
                  <span className="rounded-lg bg-emerald-100 text-emerald-800 text-xs font-mono font-bold px-2 py-0.5">
                    {selectedRiderForDeliveries.special_rider_id}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Fulfillment Hub: {selectedRiderForDeliveries.center_name} ({selectedRiderForDeliveries.center_code})
                </p>
              </div>
              <button
                onClick={() => setSelectedRiderForDeliveries(null)}
                className="rounded-lg p-1.5 hover:bg-slate-100 transition text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {loadingDeliveries ? (
                <div className="flex h-40 items-center justify-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                  Loading delivery tracking records...
                </div>
              ) : riderDeliveries.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center text-slate-400">
                  <PackageCheck className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-sm font-medium">No completed deliveries recorded for this partner yet.</p>
                </div>
              ) : (
                riderDeliveries.map((item: any) => (
                  <div key={item.order_id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-bold">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          DELIVERED
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-800">
                          Ref: {item.order_reference}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 font-medium">
                        {item.delivered_at ? new Date(item.delivered_at).toLocaleString() : 'N/A'}
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-slate-900">
                      Client: {item.customer_name}
                    </div>

                    {/* Delivery Route Timeline */}
                    <div className="rounded-lg bg-emerald-50/70 p-3 border border-emerald-200/60 text-xs">
                      <div className="font-bold text-emerald-900 uppercase tracking-wider mb-1 text-[10px]">
                        Delivery Route Timeline:
                      </div>
                      <div className="space-y-1 text-emerald-800 font-medium">
                        <div>1. 📦 Picked Up from Vendor: <strong>{item.vendor_name || 'Partner Vendor'}</strong> {item.vendor_city ? `(${item.vendor_city})` : ''}</div>
                        <div>2. 🏢 Shelved & Scanned at Fulfillment Center Hub</div>
                        <div>3. 👤 Delivered to Client: <strong>{item.customer_name}</strong></div>
                        <div className="text-[11px] text-emerald-900 font-semibold pt-0.5">
                          📅 Completed: {item.delivered_at ? new Date(item.delivered_at).toLocaleString() : 'Recorded'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-1.5 text-xs text-slate-600">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>
                        {item.address_line}, {item.city}, {item.state} ({item.pincode})
                      </span>
                    </div>

                    {Array.isArray(item.items) && item.items.length > 0 && (
                      <div className="mt-2 rounded-lg bg-white p-3 border border-slate-100 text-xs">
                        <div className="font-bold text-slate-700 mb-1">Delivered Contents:</div>
                        <ul className="space-y-0.5 text-slate-600">
                          {item.items.map((prod: any, idx: number) => (
                            <li key={idx}>
                              • <span className="font-medium text-slate-900">{prod.name}</span> — Qty: {prod.quantity}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
              <span>Total Completed Drops: <strong>{riderDeliveries.length}</strong></span>
              <button
                onClick={() => setSelectedRiderForDeliveries(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIVE TRACKING MODAL */}
      {trackingRiderId && (
        <LiveTrackModal
          riderId={trackingRiderId}
          onClose={() => setTrackingRiderId(null)}
        />
      )}
    </DashboardLayout>
  );
}
