'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Loader2,
  Trash2,
  XCircle,
  X,
  Edit2,
  Save,
  Plus,
  FolderPlus,
  AlertCircle,
  Tag,
  Eye,
  Info,
  Calendar,
  Layers,
  Percent,
  TrendingUp
} from 'lucide-react';
import DashboardLayout from '../../../components/dashboard-layout';
import { extractApiError, productAPI } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';

interface Category {
  id: string;
  code: string;
  label: string;
  description: string | null;
  image: string;
  min_commision_percentage: number;
  max_commision_percentage: number;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function CategoriesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [minCommision, setMinCommision] = useState(0);
  const [maxCommision, setMaxCommision] = useState(10);
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Submit loading
  const [submitting, setSubmitting] = useState(false);

  async function fetchCategories() {
    try {
      setLoading(true);
      setError('');
      const response = await productAPI.getCategories();
      if (response.data?.data) {
        setCategories(response.data.data);
      }
    } catch (err) {
      setError(extractApiError(err, 'Failed to load categories'));
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
      void fetchCategories();
    }
  }, [authLoading, isAuthenticated, router]);

  // Open add modal
  const handleOpenAdd = () => {
    setCode('');
    setLabel('');
    setDescription('');
    setImage('');
    setMinCommision(0);
    setMaxCommision(10);
    setSortOrder(0);
    setIsActive(true);
    setError('');
    setSuccess('');
    setIsAddOpen(true);
  };

  // Open edit modal
  const handleOpenEdit = (category: Category) => {
    setSelectedCategory(category);
    setCode(category.code);
    setLabel(category.label);
    setDescription(category.description || '');
    setImage(category.image);
    setMinCommision(category.min_commision_percentage);
    setMaxCommision(category.max_commision_percentage);
    setSortOrder(category.sort_order);
    setIsActive(category.is_active);
    setError('');
    setSuccess('');
    setIsEditOpen(true);
  };

  // Create category
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !label || !image) {
      setError('Code, label and image URL are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      await productAPI.createCategory({
        code,
        label,
        description: description || undefined,
        image,
        min_commision_percentage: Number(minCommision),
        max_commision_percentage: Number(maxCommision),
        sort_order: Number(sortOrder),
        is_active: isActive,
      });

      setSuccess(`Category "${label}" added successfully!`);
      setIsAddOpen(false);
      await fetchCategories();
    } catch (err) {
      setError(extractApiError(err, 'Failed to create category'));
    } finally {
      setSubmitting(false);
    }
  };

  // Update category
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;

    if (!code || !label || !image) {
      setError('Code, label and image URL are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      await productAPI.updateCategory(selectedCategory.id, {
        code,
        label,
        description: description || null,
        image,
        min_commision_percentage: Number(minCommision),
        max_commision_percentage: Number(maxCommision),
        sort_order: Number(sortOrder),
        is_active: isActive,
      });

      setSuccess(`Category "${label}" updated successfully!`);
      setIsEditOpen(false);
      await fetchCategories();
    } catch (err) {
      setError(extractApiError(err, 'Failed to update category'));
    } finally {
      setSubmitting(false);
    }
  };

  // Quick toggle category status
  const handleToggleStatus = async (category: Category) => {
    try {
      setError('');
      setSuccess('');
      await productAPI.updateCategory(category.id, {
        is_active: !category.is_active,
      });
      setSuccess(`Category "${category.label}" status updated!`);
      await fetchCategories();
    } catch (err) {
      setError(extractApiError(err, 'Failed to toggle category status'));
    }
  };

  // Delete category
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the category "${name}"?`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      await productAPI.deleteCategory(id);
      setSuccess(`Category "${name}" deleted successfully!`);
      await fetchCategories();
    } catch (err) {
      setError(extractApiError(err, 'Failed to delete category'));
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="relative space-y-6">
        {/* Alerts */}
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

        {/* Header section */}
        <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[0_12px_32px_rgba(96,82,62,0.04)] backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 bg-[#1d4ed8]/5 rounded-full blur-2xl -mr-8 -mt-8" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Manage Categories</h1>
                <p className="text-sm text-slate-500">Configure client-facing categories, commision structures, and sorting hierarchy.</p>
              </div>
            </div>
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 self-start sm:self-center px-4 py-2.5 rounded-xl bg-blue-750 hover:bg-blue-800 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              Add Category
            </button>
          </div>
        </section>

        {/* Categories registry */}
        <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[0_12px_32px_rgba(96,82,62,0.06)] backdrop-blur-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Registry Categories ({categories.length})</h2>
            <div className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-semibold text-slate-700">
              {categories.filter(c => c.is_active).length} Active / {categories.filter(c => !c.is_active).length} Inactive
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
            </div>
          ) : categories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => (
                <article
                  key={category.id}
                  className={`group overflow-hidden rounded-2xl border bg-white shadow-xs hover:shadow-md transition-all duration-350 flex flex-col justify-between ${
                    category.is_active ? 'border-slate-200' : 'border-slate-100 opacity-75 hover:opacity-100'
                  }`}
                >
                  <div>
                    {/* Category Image Header */}
                    <div className="relative h-40 w-full bg-slate-100 overflow-hidden border-b border-slate-100">
                      <img
                        src={category.image}
                        alt={category.label}
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                      />
                      <span className={`absolute top-3 right-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                        category.is_active
                          ? 'bg-emerald-50 border border-emerald-100 text-emerald-700'
                          : 'bg-rose-50 border border-rose-100 text-rose-700'
                      }`}>
                        {category.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="absolute bottom-3 left-3 rounded-lg bg-slate-900/60 backdrop-blur-xs px-2.5 py-1 text-xs font-mono text-white">
                        Order: {category.sort_order}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-4">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-slate-900 text-lg group-hover:text-blue-700 transition-colors">
                            {category.label}
                          </h3>
                        </div>
                        <span className="text-xs font-mono bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 mt-1 inline-block">
                          {category.code}
                        </span>
                      </div>

                      <p className="text-sm text-slate-500 line-clamp-2 min-h-[40px]">
                        {category.description || 'No description provided.'}
                      </p>

                      {/* Commissions */}
                      <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-center">
                        <div className="bg-slate-50 rounded-xl p-2">
                          <span className="text-[10px] text-slate-400 block uppercase font-mono tracking-wider">Min Commission</span>
                          <span className="font-bold text-slate-800 flex items-center justify-center gap-0.5 text-sm mt-0.5">
                            {category.min_commision_percentage}%
                          </span>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-2">
                          <span className="text-[10px] text-slate-400 block uppercase font-mono tracking-wider">Max Commission</span>
                          <span className="font-bold text-slate-800 flex items-center justify-center gap-0.5 text-sm mt-0.5">
                            {category.max_commision_percentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-5 pb-5 pt-2 border-t border-slate-50 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleToggleStatus(category)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
                        category.is_active
                          ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      {category.is_active ? 'Deactivate' : 'Activate'}
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenEdit(category)}
                        className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition"
                        title="Edit category"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id, category.label)}
                        className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition"
                        title="Delete category"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-400">
              No categories found. Click Add Category to get started.
            </p>
          )}
        </div>
      </div>

      {/* Add / Edit Modals */}
      {(isAddOpen || isEditOpen) && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => {
              setIsAddOpen(false);
              setIsEditOpen(false);
            }}
          />

          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-slate-50 shadow-2xl overflow-hidden flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
            <header className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Category Management
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  {isAddOpen ? 'Add Product Category' : 'Edit Category'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddOpen(false);
                  setIsEditOpen(false);
                }}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <form onSubmit={isAddOpen ? handleCreate : handleUpdate} className="flex-1 overflow-y-auto p-6 space-y-6">
              {submitting && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-30">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
                </div>
              )}

              <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Category Name / Label
                  </label>
                  <input
                    type="text"
                    required
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. Precision CNC Tooling"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Unique Code (Identifier)
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isEditOpen} // Code shouldn't change easily since frontend uses it as path
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. precision_cnc_tooling"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the category..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Image URL
                  </label>
                  <input
                    type="text"
                    required
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                  {image && (
                    <div className="mt-2 h-20 w-32 border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                      <img src={image} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Min Commission (%)
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={100}
                      value={minCommision}
                      onChange={(e) => setMinCommision(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Max Commission (%)
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={100}
                      value={maxCommision}
                      onChange={(e) => setMaxCommision(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Sort Order Hierarchy
                    </label>
                    <input
                      type="number"
                      required
                      value={sortOrder}
                      onChange={(e) => setSortOrder(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                  <div className="flex flex-col justify-center pl-2">
                    <label className="flex items-center gap-2 cursor-pointer mt-4">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 transition"
                      />
                      <span className="text-sm font-semibold text-slate-600">Active (Visible)</span>
                    </label>
                  </div>
                </div>
              </section>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setIsEditOpen(false);
                  }}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 transition text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-blue-750 text-white rounded-xl hover:bg-blue-800 transition text-sm font-semibold flex items-center gap-1.5 shadow-md"
                >
                  <Save className="h-4 w-4" />
                  {isAddOpen ? 'Create Category' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
