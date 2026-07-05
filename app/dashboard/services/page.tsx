'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Loader2,
  XCircle,
  X,
  Edit2,
  Save,
  Trash2,
  Eye,
  Info,
  AlertCircle,
  BellRing,
  ArrowUpRight,
  Plus,
  Wrench,
  Store,
  Layers
} from 'lucide-react';
import DashboardLayout from '../../../components/dashboard-layout';
import { extractApiError, serviceAPI, productAPI } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { Service, Category } from '../../../lib/types';

export default function ServicesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Service Offerings states (for detail drawer)
  const [offerings, setOfferings] = useState<any[]>([]);
  const [offeringsLoading, setOfferingsLoading] = useState(false);

  // Modals / Drawer state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Add / Edit Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('approved');
  const [submitting, setSubmitting] = useState(false);

  // Edit fields
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');

  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await productAPI.getCategories();
        if (response.data?.data) {
          // Filter: only show service categories
          const serviceCats = response.data.data.filter((c: any) => c.category_type === 'service');
          setCategories(serviceCats);
        }
      } catch (err) {
        console.error('Failed to load service categories:', err);
      }
    }
    loadCategories();
  }, []);

  async function fetchServices() {
    try {
      setLoading(true);
      setError('');
      const response = await serviceAPI.getAll();
      if (response.data?.data) {
        setServices(response.data.data);
      }
    } catch (err) {
      setError(extractApiError(err, 'Failed to load services'));
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
      void fetchServices();
    }
  }, [authLoading, isAuthenticated, router]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the service "${name}"? All associated vendor offerings and bookings will be affected.`)) {
      return;
    }
    try {
      setError('');
      await serviceAPI.delete(id);
      setSuccess(`Service "${name}" deleted successfully.`);
      setIsDrawerOpen(false);
      await fetchServices();
    } catch (err) {
      setError(extractApiError(err, 'Failed to delete service'));
    }
  };

  const handleReview = async (id: string, decision: 'approved' | 'rejected') => {
    try {
      setError('');
      setSuccess('');
      await serviceAPI.review(id, decision);
      setSuccess(`Service successfully ${decision}.`);
      if (selectedService?.id === id) {
        await handleOpenDrawer({ ...selectedService, status: decision === 'approved' ? 'approved' : 'rejected' });
      } else {
        await fetchServices();
      }
    } catch (err) {
      setError(extractApiError(err, `Failed to review service as ${decision}`));
    }
  };

  const handleOpenAdd = () => {
    setName('');
    setDescription('');
    setCategoryId(categories[0]?.id || '');
    setStatus('approved');
    setError('');
    setSuccess('');
    setIsAddOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !categoryId) {
      setError('Name and Category are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      await serviceAPI.create({ name, description, categoryId, status });
      setSuccess(`Service "${name}" created successfully.`);
      setIsAddOpen(false);
      await fetchServices();
    } catch (err) {
      setError(extractApiError(err, 'Failed to create service'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDrawer = async (service: Service) => {
    try {
      setError('');
      setSelectedService(service);
      setIsDrawerOpen(true);
      setEditMode(false);
      setEditName(service.name || '');
      setEditDescription(service.description || '');
      setEditCategoryId(service.category_id || '');

      setOfferings([]);
      setOfferingsLoading(true);

      const response = await serviceAPI.getOfferings(service.id);
      if (response.data?.data) {
        setOfferings(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load service offerings:', err);
    } finally {
      setOfferingsLoading(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!selectedService) return;
    try {
      setDrawerLoading(true);
      setError('');
      await serviceAPI.update(selectedService.id, {
        name: editName,
        description: editDescription,
        categoryId: editCategoryId
      });
      setSuccess('Service updated successfully.');
      setEditMode(false);
      
      // Refresh local selectedService and list
      const updatedService: Service = {
        ...selectedService,
        name: editName,
        description: editDescription,
        category_id: editCategoryId,
        category_label: categories.find(c => c.id === editCategoryId)?.label || selectedService.category_label
      };
      setSelectedService(updatedService);
      await fetchServices();
    } catch (err) {
      setError(extractApiError(err, 'Failed to update service details'));
    } finally {
      setDrawerLoading(false);
    }
  };

  // Segments
  const pendingServices = services.filter(s => s.status === 'pending');
  const activeServices = services.filter(s => s.status !== 'pending');

  return (
    <DashboardLayout>
      <div className="relative space-y-6">
        {/* Alert Notifications */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="ml-auto text-emerald-500 hover:text-emerald-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* 🚨 QUEUE 1: NEW SERVICE APPROVALS */}
        <section className="rounded-[1.75rem] border border-rose-200 bg-white p-6 shadow-[0_12px_32px_rgba(244,63,94,0.06)] relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 bg-rose-500/5 rounded-full blur-2xl -mr-8 -mt-8" />
          
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">🚨 Service Approval Queue</h2>
                <p className="text-sm text-slate-500">New vendor service offerings awaiting catalog verification.</p>
              </div>
            </div>
            <div className="self-start sm:self-center rounded-full bg-rose-50 border border-rose-200 px-3 py-1 font-mono text-xs font-bold text-rose-700">
              {pendingServices.length} Awaiting Review
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
            </div>
          ) : pendingServices.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingServices.map((service) => (
                <article
                  key={service.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 hover:border-rose-300 hover:bg-white transition-all shadow-xs duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-slate-900 line-clamp-1">{service.name}</h3>
                      <span className="shrink-0 text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-100 rounded-full px-2 py-0.5 uppercase tracking-wider">
                        New Service
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Category: <span className="font-semibold text-slate-700">{service.category_label || 'Service'}</span>
                    </p>
                    <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {service.description || 'No description provided.'}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenDrawer(service)}
                      className="text-xs font-bold text-blue-700 hover:text-blue-900 transition flex items-center gap-1"
                    >
                      Verify Details <ArrowUpRight className="h-4 w-4" />
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReview(service.id, 'approved')}
                        className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition shadow-xs"
                        title="Approve Service"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleReview(service.id, 'rejected')}
                        className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition shadow-xs"
                        title="Reject Service"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-400">
              Clear! No brand new services need approval.
            </p>
          )}
        </section>

        {/* Global Catalog Registry */}
        <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[0_12px_32px_rgba(96,82,62,0.08)] backdrop-blur-sm">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">📚 Global Services Registry</h2>
              <p className="text-sm text-slate-500">
                View and edit all services that have been registered in the system.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 px-4 py-2.5 text-xs font-bold text-white shadow-md transition"
              >
                <Plus className="h-4 w-4" />
                Add Service
              </button>
              <div className="rounded-2xl bg-slate-100 px-4 py-2 font-mono text-xs uppercase tracking-[0.25em] text-slate-700">
                {activeServices.length} registered services
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {activeServices.length ? (
                activeServices.map((service) => (
                  <article
                    key={service.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 transition"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="cursor-pointer" onClick={() => handleOpenDrawer(service)}>
                        <h3 className="font-bold text-slate-900 hover:text-blue-700 flex items-center gap-2">
                          {service.name}
                          <Eye className="h-4 w-4 text-slate-400" />
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Category: <span className="font-semibold text-slate-700">{service.category_label || 'Unclassified'}</span> • {Number(service.vendor_count || 0)} sellers • {Number(service.booking_count || 0)} bookings
                        </p>
                        <span className={`inline-block rounded-full px-2.5 py-0.5 mt-2 text-[10px] font-bold uppercase border ${
                          service.status === 'approved'
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                            : service.status === 'rejected'
                            ? 'bg-red-50 border-red-100 text-red-700'
                            : 'bg-amber-50 border-amber-100 text-amber-700'
                        }`}>
                          {service.status}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenDrawer(service)}
                          className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                        >
                          Open Details
                        </button>
                        <button
                          onClick={() => handleDelete(service.id, service.name)}
                          className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition"
                          title="Delete catalog entry"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <p className="text-slate-400 text-xs py-8 border border-dashed border-slate-200 rounded-2xl text-center">No services registered yet.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Detail & Verification Drawer */}
      {isDrawerOpen && selectedService && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-slate-50 shadow-2xl overflow-hidden flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Service Verification Drawer
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  {editMode ? 'Edit Service Details' : selectedService.name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {!editMode && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="p-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 transition hover:text-slate-900 flex items-center gap-1.5 text-xs font-medium"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit Details
                  </button>
                )}
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 relative">
              {drawerLoading && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-30">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
                </div>
              )}

              {/* Form / Details */}
              {editMode ? (
                <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Service Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Service Description
                    </label>
                    <textarea
                      rows={4}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Category
                    </label>
                    <select
                      value={editCategoryId}
                      onChange={(e) => setEditCategoryId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setEditMode(false)}
                      className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 text-xs font-bold transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDetails}
                      className="px-4 py-2 bg-blue-700 text-white rounded-xl hover:bg-blue-800 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save Details
                    </button>
                  </div>
                </section>
              ) : (
                <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <div className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Info className="h-5 w-5 text-blue-600" />
                    <h4 className="font-bold text-slate-900">General Information</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400 block text-xs uppercase font-mono tracking-wider">Service Name</span>
                      <span className="font-bold text-slate-800 mt-0.5 block">{selectedService.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs uppercase font-mono tracking-wider">Category</span>
                      <span className="font-bold text-slate-800 mt-0.5 block">{selectedService.category_label || 'Unclassified'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-xs uppercase font-mono tracking-wider">Description</span>
                      <p className="text-slate-600 mt-1 leading-relaxed text-sm whitespace-pre-line">
                        {selectedService.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* Associated Vendor offerings */}
              <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Store className="h-5 w-5 text-blue-600" />
                  <h4 className="font-bold text-slate-900">Vendor Offerings & Rates</h4>
                </div>

                {offeringsLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-700" />
                  </div>
                ) : offerings.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {offerings.map((offering) => (
                      <div key={offering.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                        <div>
                          <span className="font-bold text-slate-900 block text-sm">{offering.company_name}</span>
                          <span className="text-xs text-slate-400 block">
                            Seller: {offering.vendor_name} ({offering.vendor_email})
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-slate-900 text-sm block">
                            ₹{parseFloat(offering.price).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 uppercase tracking-wider inline-block mt-0.5">
                            {offering.pricing_type} • MOQ: {offering.moq}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs py-4 text-center">No vendors are offering this service yet.</p>
                )}
              </section>

              {/* Review Actions if Pending */}
              {selectedService.status === 'pending' && (
                <section className="bg-rose-50 rounded-2xl border border-rose-100 p-5 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-bold text-rose-800 block text-sm">Action Required</span>
                    <span className="text-rose-600 text-xs">Verify this new service and approve it for the public registry.</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleReview(selectedService.id, 'approved')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReview(selectedService.id, 'rejected')}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      Reject
                    </button>
                  </div>
                </section>
              )}
            </div>
          </div>
        </>
      )}

      {/* Add Service Modal */}
      {isAddOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setIsAddOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-slate-50 shadow-2xl overflow-hidden flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
            <header className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Global Catalog Entry
                </span>
                <h3 className="text-lg font-bold text-slate-900">Add Service to Master Catalog</h3>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-6 space-y-6">
              {submitting && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-30">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
                </div>
              )}

              <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Service Name / Title
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Precision CNC Machining Service"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Service Category
                  </label>
                  <select
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  >
                    <option value="" disabled>Select category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide details about the master service catalog entry..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Initial Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  >
                    <option value="approved">Approved (Active immediately)</option>
                    <option value="pending">Pending (Needs verification)</option>
                  </select>
                </div>
              </section>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 transition text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-blue-700 text-white rounded-xl hover:bg-blue-800 transition text-sm font-semibold flex items-center gap-1.5 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                  Add Master Service
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
