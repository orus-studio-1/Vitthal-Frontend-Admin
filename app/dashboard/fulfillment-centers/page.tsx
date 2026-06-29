'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Search, MapPin, Loader2, X, Eye, Edit2, Trash2, 
  Mail, Phone, ShieldAlert, Building2, Layers, Clock, Settings
} from 'lucide-react';
import DashboardLayout from '../../../components/dashboard-layout';
import { extractApiError, fulfillmentCenterAPI } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { FulfillmentCenter } from '../../../lib/types';

const STORAGE_TYPES = [
  "Ambient",
  "Cold Storage",
  "Climate Controlled",
  "Dry Storage",
  "Hazardous Materials",
  "Cross-Dock",
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "inactive", label: "Inactive", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "maintenance", label: "Maintenance", color: "bg-amber-50 text-amber-700 border-amber-200" },
];

export default function FulfillmentCentersPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [centers, setCenters] = useState<FulfillmentCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modals / Drawers
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<FulfillmentCenter | null>(null);
  const [viewingCenter, setViewingCenter] = useState<FulfillmentCenter | null>(null);
  const [deletingCenter, setDeletingCenter] = useState<FulfillmentCenter | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    email: '',
    password: '',
    contact_phone: '',
    contact_email: '',
    manager_name: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    latitude: '',
    longitude: '',
    total_area_sqft: '',
    capacity_packages: '',
    storage_type: 'Ambient',
    operating_hours: '09:00 - 18:00',
    status: 'active',
  });
  const [submitting, setSubmitting] = useState(false);

  async function fetchCenters() {
    try {
      setLoading(true);
      setError('');
      const response = await fulfillmentCenterAPI.getAll();
      setCenters(response.data.data);
    } catch (err) {
      setError(extractApiError(err, 'Failed to load fulfillment centers'));
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
      void fetchCenters();
    }
  }, [authLoading, isAuthenticated, router]);

  const handleOpenCreate = () => {
    setEditingCenter(null);
    setFormData({
      name: '',
      code: '',
      email: '',
      password: '',
      contact_phone: '',
      contact_email: '',
      manager_name: '',
      address: '',
      city: '',
      state: '',
      country: 'India',
      pincode: '',
      latitude: '',
      longitude: '',
      total_area_sqft: '',
      capacity_packages: '',
      storage_type: 'Ambient',
      operating_hours: '09:00 - 18:00',
      status: 'active',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (center: FulfillmentCenter) => {
    setEditingCenter(center);
    setFormData({
      name: center.name,
      code: center.code,
      email: center.email || '',
      password: '', // Leave blank unless changing
      contact_phone: center.contact_phone || '',
      contact_email: center.contact_email || '',
      manager_name: center.manager_name || '',
      address: center.address,
      city: center.city,
      state: center.state,
      country: center.country || 'India',
      pincode: center.pincode,
      latitude: center.latitude ? String(center.latitude) : '',
      longitude: center.longitude ? String(center.longitude) : '',
      total_area_sqft: center.total_area_sqft ? String(center.total_area_sqft) : '',
      capacity_packages: center.capacity_packages ? String(center.capacity_packages) : '',
      storage_type: center.storage_type || 'Ambient',
      operating_hours: center.operating_hours || '09:00 - 18:00',
      status: center.status || 'active',
    });
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const payload = {
        ...formData,
        latitude: formData.latitude ? Number(formData.latitude) : undefined,
        longitude: formData.longitude ? Number(formData.longitude) : undefined,
        total_area_sqft: formData.total_area_sqft ? Number(formData.total_area_sqft) : undefined,
        capacity_packages: formData.capacity_packages ? Number(formData.capacity_packages) : undefined,
      };

      if (editingCenter) {
        // Remove password payload if empty
        if (!payload.password) {
          delete (payload as any).password;
        }
        await fulfillmentCenterAPI.update(editingCenter.id, payload);
        setSuccess('Fulfillment center updated successfully.');
      } else {
        await fulfillmentCenterAPI.create(payload);
        setSuccess('Fulfillment center created successfully with login user details.');
      }

      setIsFormOpen(false);
      await fetchCenters();
    } catch (err) {
      setError(extractApiError(err, 'Failed to save fulfillment center'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingCenter) return;
    try {
      setLoading(true);
      setError('');
      await fulfillmentCenterAPI.delete(deletingCenter.id);
      setSuccess('Fulfillment center deleted successfully.');
      setDeletingCenter(null);
      await fetchCenters();
    } catch (err) {
      setError(extractApiError(err, 'Failed to delete fulfillment center'));
    } finally {
      setLoading(false);
    }
  };

  // Search filter
  const filteredCenters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return centers;
    return centers.filter(c => 
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.state.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.manager_name?.toLowerCase().includes(q)
    );
  }, [centers, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = centers.length;
    const active = centers.filter(c => c.status === 'active').length;
    const maintenance = centers.filter(c => c.status === 'maintenance').length;
    const totalCapacity = centers.reduce((sum, c) => sum + (c.capacity_packages || 0), 0);

    return { total, active, maintenance, totalCapacity };
  }, [centers]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Fulfillment Centers</h1>
            <p className="text-sm text-slate-500 font-normal">Manage warehouse hubs, specifications, and login credentials.</p>
          </div>
          <button 
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-amber-600/20 hover:bg-amber-700 transition"
          >
            <Plus className="h-4 w-4" />
            Create Center
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
            <div className="rounded-xl bg-amber-50 p-3 text-amber-700">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Hubs</p>
              <h3 className="text-2xl font-bold text-slate-800">{stats.total}</h3>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Hubs</p>
              <h3 className="text-2xl font-bold text-slate-800">{stats.active}</h3>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
            <div className="rounded-xl bg-amber-50 p-3 text-amber-500">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Under Maintenance</p>
              <h3 className="text-2xl font-bold text-slate-800">{stats.maintenance}</h3>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total capacity (Pkg)</p>
              <h3 className="text-2xl font-bold text-slate-800">{stats.totalCapacity.toLocaleString()}</h3>
            </div>
          </div>
        </div>

        {/* Search Bar & Messages */}
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search hubs by name, code, manager, city, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm placeholder-slate-400 outline-none focus:border-amber-500 focus:bg-white transition"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          )}

          {/* Table / Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          ) : filteredCenters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Building2 className="h-12 w-12 text-slate-300 mb-2" />
              <p className="text-sm font-medium">No fulfillment centers found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="pb-3 pt-1">Code / Name</th>
                    <th className="pb-3 pt-1">Location</th>
                    <th className="pb-3 pt-1">Capacity / Size</th>
                    <th className="pb-3 pt-1">Manager / Contact</th>
                    <th className="pb-3 pt-1">Status</th>
                    <th className="pb-3 pt-1 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCenters.map((center) => {
                    const statusObj = STATUS_OPTIONS.find(o => o.value === center.status) || STATUS_OPTIONS[0];

                    return (
                      <tr key={center.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <span className="rounded-[10px] bg-amber-50 border border-amber-200 px-2 py-1 font-mono text-xs font-semibold text-amber-700">
                              {center.code}
                            </span>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{center.name}</p>
                              <p className="text-xs text-slate-400">{center.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <p className="text-sm font-medium text-slate-700">{center.city}, {center.state}</p>
                          <p className="text-xs text-slate-400">{center.pincode}</p>
                        </td>
                        <td className="py-4 font-normal text-slate-600 text-sm">
                          <p>{center.capacity_packages ? `${center.capacity_packages.toLocaleString()} pkgs` : 'N/A'}</p>
                          <p className="text-xs text-slate-400">{center.total_area_sqft ? `${center.total_area_sqft} sqft` : ''}</p>
                        </td>
                        <td className="py-4">
                          <p className="text-sm font-medium text-slate-700">{center.manager_name || 'No Manager'}</p>
                          <p className="text-xs text-slate-400">{center.contact_phone || 'No phone'}</p>
                        </td>
                        <td className="py-4">
                          <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${statusObj.color}`}>
                            {center.status}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setViewingCenter(center)}
                              className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 transition"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(center)}
                              className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 transition"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeletingCenter(center)}
                              className="rounded-xl border border-red-200 p-2 text-red-600 hover:bg-red-50 transition"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CREATE & EDIT MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-[2rem] border border-slate-100 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {editingCenter ? 'Edit Fulfillment Center' : 'Create Fulfillment Center'}
              </h2>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-6">
              {/* Account Credentials */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 border-b border-slate-100 pb-2">Account Login details</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Login Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. pune-hub@mtwo.in"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      {editingCenter ? 'Change Password (leave empty to keep current)' : 'Login Password *'}
                    </label>
                    <input
                      type="password"
                      required={!editingCenter}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter secure password"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Hub Profile */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 border-b border-slate-100 pb-2">Hub profile & details</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Hub Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Pune Main Hub"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Hub Code * (Unique)</label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="e.g. FC-PUNE-01"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-amber-500 uppercase transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Manager Name</label>
                    <input
                      type="text"
                      value={formData.manager_name}
                      onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                      placeholder="Hub Manager"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      placeholder="Phone number"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      placeholder="Secondary contact email"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Warehouse Specifications */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 border-b border-slate-100 pb-2">Specifications & logistics</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Total Area (sqft)</label>
                    <input
                      type="number"
                      value={formData.total_area_sqft}
                      onChange={(e) => setFormData({ ...formData, total_area_sqft: e.target.value })}
                      placeholder="e.g. 5000"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Capacity (packages)</label>
                    <input
                      type="number"
                      value={formData.capacity_packages}
                      onChange={(e) => setFormData({ ...formData, capacity_packages: e.target.value })}
                      placeholder="e.g. 10000"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Storage Type</label>
                    <select
                      value={formData.storage_type}
                      onChange={(e) => setFormData({ ...formData, storage_type: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition"
                    >
                      {STORAGE_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Operating Hours</label>
                    <input
                      type="text"
                      value={formData.operating_hours}
                      onChange={(e) => setFormData({ ...formData, operating_hours: e.target.value })}
                      placeholder="e.g. 24/7 or 09:00 - 18:00"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Physical Location */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 border-b border-slate-100 pb-2">Physical Location & Address</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Street Address *</label>
                    <input
                      type="text"
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Street address / Landmark"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">City *</label>
                      <input
                        type="text"
                        required
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="City"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">State *</label>
                      <input
                        type="text"
                        required
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        placeholder="State"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Pincode *</label>
                      <input
                        type="text"
                        required
                        pattern="^[0-9]{6}$"
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                        placeholder="Pincode"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Country *</label>
                      <input
                        type="text"
                        required
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.latitude}
                        onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                        placeholder="e.g. 18.5204"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.longitude}
                        onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                        placeholder="e.g. 73.8567"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Operating Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-amber-500 capitalize transition"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  disabled={submitting}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-sm font-medium text-white hover:bg-amber-700 transition"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingCenter ? 'Save Changes' : 'Create Hub'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewingCenter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[2rem] border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="rounded-[10px] bg-amber-50 border border-amber-200 px-2 py-0.5 font-mono text-xs font-semibold text-amber-700 mr-2">
                  {viewingCenter.code}
                </span>
                <h2 className="inline text-lg font-bold text-slate-900">{viewingCenter.name}</h2>
              </div>
              <button 
                onClick={() => setViewingCenter(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Detailed specs */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Manager Name</p>
                  <p className="font-medium text-slate-800">{viewingCenter.manager_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Login / Contact Email</p>
                  <p className="font-medium text-slate-800">{viewingCenter.email}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Phone Number</p>
                  <p className="font-medium text-slate-800">{viewingCenter.contact_phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Secondary Email</p>
                  <p className="font-medium text-slate-800">{viewingCenter.contact_email || 'N/A'}</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 text-sm">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Storage Capacity</p>
                  <p className="font-medium text-slate-800">
                    {viewingCenter.capacity_packages ? `${viewingCenter.capacity_packages.toLocaleString()} packages` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Area</p>
                  <p className="font-medium text-slate-800">
                    {viewingCenter.total_area_sqft ? `${viewingCenter.total_area_sqft} sqft` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Storage Type</p>
                  <p className="font-medium text-slate-800">{viewingCenter.storage_type || 'Ambient'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Operating Hours</p>
                  <p className="font-medium text-slate-800">{viewingCenter.operating_hours || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Coordinates</p>
                  <p className="font-medium text-slate-800">
                    {viewingCenter.latitude && viewingCenter.longitude 
                      ? `${viewingCenter.latitude}, ${viewingCenter.longitude}` 
                      : 'Not configured'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</p>
                  <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize mt-1
                    ${viewingCenter.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                      viewingCenter.status === 'maintenance' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                      'bg-slate-100 text-slate-700 border-slate-200'}`}
                  >
                    {viewingCenter.status}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 text-sm">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Full Address</p>
                <div className="flex items-start gap-1.5 mt-1">
                  <MapPin className="h-4.5 w-4.5 text-slate-400 shrink-0 mt-0.5" />
                  <p className="font-medium text-slate-800">
                    {viewingCenter.address}, {viewingCenter.city}, {viewingCenter.state} - {viewingCenter.pincode}, {viewingCenter.country}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-4 mt-6">
              <button
                onClick={() => setViewingCenter(null)}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingCenter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="rounded-full bg-red-50 p-3">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Delete Center?</h2>
            </div>
            
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to delete <strong>{deletingCenter.name} ({deletingCenter.code})</strong>? 
              This will permanently delete the associated user account and its hub record. This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingCenter(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubmit}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition"
              >
                Delete Hub
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
