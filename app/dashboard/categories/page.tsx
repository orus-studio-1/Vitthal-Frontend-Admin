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
  AlertCircle,
  Tag,
  Layers,
  Upload,
  ImageIcon
} from 'lucide-react';
import DashboardLayout from '../../../components/dashboard-layout';
import { extractApiError, productAPI } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { Category, Subcategory } from '../../../lib/types';

export default function CategoriesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Category Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Subcategory Modal state
  const [isSubcatModalOpen, setIsSubcatModalOpen] = useState(false);
  const [subcatCategory, setSubcatCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loadingSubcats, setLoadingSubcats] = useState(false);
  const [newSubcatName, setNewSubcatName] = useState('');
  const [newSubcatDesc, setNewSubcatDesc] = useState('');
  const [subcatSubmitting, setSubcatSubmitting] = useState(false);
  const [subcatError, setSubcatError] = useState('');
  const [subcatSuccess, setSubcatSuccess] = useState('');

  // Editing subcategory state
  const [editingSubcatId, setEditingSubcatId] = useState<string | null>(null);
  const [editSubcatName, setEditSubcatName] = useState('');
  const [editSubcatDesc, setEditSubcatDesc] = useState('');

  // Category Form states
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [minCommision, setMinCommision] = useState(0);
  const [maxCommision, setMaxCommision] = useState(10);
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Submit loading
  const [submitting, setSubmitting] = useState(false);

  const buildCategoryFormData = () => {
    const formData = new FormData();
    formData.append('code', code.trim());
    formData.append('label', label.trim());
    formData.append('description', description.trim());
    formData.append('min_commision_percentage', String(Number(minCommision)));
    formData.append('max_commision_percentage', String(Number(maxCommision)));
    formData.append('sort_order', String(Number(sortOrder)));
    formData.append('is_active', String(isActive));
    formData.append('category_type', 'product');
    if (imageFile) {
      formData.append('image', imageFile);
    }
    return formData;
  };

  const handleImageSelect = (file?: File) => {
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a JPG, PNG, or WEBP image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Category image must be 5MB or smaller.');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImage('');
    setError('');
  };

  async function fetchCategories() {
    try {
      setLoading(true);
      setError('');
      const response = await productAPI.getCategories();
      if (response.data?.data) {
        // Filter: only show 'product' categories
        const productCats = response.data.data.filter((c: any) => c.category_type === 'product' || !c.category_type);
        setCategories(productCats);
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
    setImageFile(null);
    setImagePreview('');
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
    setImageFile(null);
    setImagePreview(category.image);
    setMinCommision(category.min_commision_percentage);
    setMaxCommision(category.max_commision_percentage);
    setSortOrder(category.sort_order);
    setIsActive(category.is_active);
    setError('');
    setSuccess('');
    setIsEditOpen(true);
  };

  // Open Subcategory Modal
  const handleOpenSubcatModal = async (category: Category) => {
    setSubcatCategory(category);
    setNewSubcatName('');
    setNewSubcatDesc('');
    setEditingSubcatId(null);
    setSubcatError('');
    setSubcatSuccess('');
    setIsSubcatModalOpen(true);
    await loadSubcategories(category.id);
  };

  const loadSubcategories = async (categoryId: string) => {
    try {
      setLoadingSubcats(true);
      setSubcatError('');
      const res = await productAPI.getSubcategories(categoryId);
      setSubcategories(res.data?.data || []);
    } catch (err) {
      setSubcatError(extractApiError(err, 'Failed to load subcategories'));
    } finally {
      setLoadingSubcats(false);
    }
  };

  const handleCreateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subcatCategory || !newSubcatName.trim()) return;

    try {
      setSubcatSubmitting(true);
      setSubcatError('');
      setSubcatSuccess('');
      await productAPI.createSubcategory(subcatCategory.id, {
        name: newSubcatName.trim(),
        description: newSubcatDesc.trim() || undefined,
      });
      setSubcatSuccess(`Subcategory "${newSubcatName.trim()}" created successfully!`);
      setNewSubcatName('');
      setNewSubcatDesc('');
      await loadSubcategories(subcatCategory.id);
      await fetchCategories();
    } catch (err) {
      setSubcatError(extractApiError(err, 'Failed to create subcategory'));
    } finally {
      setSubcatSubmitting(false);
    }
  };

  const handleStartEditSubcat = (subcat: Subcategory) => {
    setEditingSubcatId(subcat.id);
    setEditSubcatName(subcat.name);
    setEditSubcatDesc(subcat.description || '');
    setSubcatError('');
    setSubcatSuccess('');
  };

  const handleSaveEditSubcat = async (id: string) => {
    if (!editSubcatName.trim() || !subcatCategory) return;
    try {
      setSubcatSubmitting(true);
      setSubcatError('');
      setSubcatSuccess('');
      await productAPI.updateSubcategory(id, {
        name: editSubcatName.trim(),
        description: editSubcatDesc.trim() || undefined,
      });
      setSubcatSuccess('Subcategory updated successfully!');
      setEditingSubcatId(null);
      await loadSubcategories(subcatCategory.id);
      await fetchCategories();
    } catch (err) {
      setSubcatError(extractApiError(err, 'Failed to update subcategory'));
    } finally {
      setSubcatSubmitting(false);
    }
  };

  const handleDeleteSubcat = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete subcategory "${name}"?`) || !subcatCategory) return;
    try {
      setSubcatSubmitting(true);
      setSubcatError('');
      setSubcatSuccess('');
      await productAPI.deleteSubcategory(id);
      setSubcatSuccess(`Subcategory "${name}" deleted!`);
      await loadSubcategories(subcatCategory.id);
      await fetchCategories();
    } catch (err) {
      setSubcatError(extractApiError(err, 'Failed to delete subcategory'));
    } finally {
      setSubcatSubmitting(false);
    }
  };

  // Create category
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !label || !imageFile) {
      setError('Code, label and category image are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      await productAPI.createCategory(buildCategoryFormData());

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

    if (!code || !label || (!imageFile && !image)) {
      setError('Code, label and category image are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      await productAPI.updateCategory(selectedCategory.id, buildCategoryFormData());

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

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Catalog Management
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Product Categories & Subcategories
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Configure product category hierarchies, subcategories, image assets, commission bounds, and global visibility.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 transition"
            >
              <Plus className="h-4 w-4" />
              Add Product Category
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 animate-in fade-in">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
            <p className="flex-1 font-medium">{error}</p>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <p className="flex-1 font-medium">{success}</p>
            <button onClick={() => setSuccess('')} className="text-emerald-500 hover:text-emerald-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Categories Grid */}
        <div>
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : categories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => (
                <article
                  key={category.id}
                  className={`group bg-white rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
                    category.is_active
                      ? 'border-slate-200 hover:border-blue-400'
                      : 'border-slate-200 opacity-75 bg-slate-50/50'
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

                      {/* Subcategories Section */}
                      <div className="border-t border-slate-100 pt-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Tag className="h-3.5 w-3.5 text-blue-600" />
                            Subcategories ({category.subcategory_count || category.subcategories?.length || 0})
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenSubcatModal(category)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add Subcategory
                          </button>
                        </div>

                        {category.subcategories && category.subcategories.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto py-1">
                            {category.subcategories.slice(0, 6).map((sub) => (
                              <span
                                key={sub.id}
                                className="inline-flex items-center text-[11px] font-medium bg-slate-100 text-slate-700 rounded-md px-2 py-0.5 border border-slate-200/60"
                              >
                                {sub.name}
                              </span>
                            ))}
                            {category.subcategories.length > 6 && (
                              <button
                                type="button"
                                onClick={() => handleOpenSubcatModal(category)}
                                className="text-[11px] font-semibold text-blue-600 hover:underline px-1 py-0.5"
                              >
                                +{category.subcategories.length - 6} more
                              </button>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic py-1">
                            No subcategories yet. Click + Add Subcategory.
                          </p>
                        )}
                      </div>

                      {/* Commissions */}
                      <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3 text-center">
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
                        onClick={() => handleOpenSubcatModal(category)}
                        className="p-2 border border-blue-200 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition"
                        title="Manage subcategories"
                      >
                        <Tag className="h-4 w-4" />
                      </button>
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

      {/* Subcategory Management Modal */}
      {isSubcatModalOpen && subcatCategory && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setIsSubcatModalOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white shadow-2xl overflow-hidden flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
            <header className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-blue-400">
                  Subcategory Registry
                </span>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mt-0.5">
                  <Tag className="h-5 w-5 text-blue-400" />
                  {subcatCategory.label}
                </h3>
              </div>
              <button
                onClick={() => setIsSubcatModalOpen(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Modal Feedback */}
              {subcatError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <p className="flex-1 font-medium">{subcatError}</p>
                </div>
              )}
              {subcatSuccess && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <p className="flex-1 font-medium">{subcatSuccess}</p>
                </div>
              )}

              {/* Add New Subcategory Form */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-blue-600" />
                  Add New Subcategory
                </h4>
                <form onSubmit={handleCreateSubcategory} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Subcategory Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Stainless Steel Sheets, Hydraulic Pumps..."
                      value={newSubcatName}
                      onChange={(e) => setNewSubcatName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Brief details about this subcategory..."
                      value={newSubcatDesc}
                      onChange={(e) => setNewSubcatDesc(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={subcatSubmitting || !newSubcatName.trim()}
                      className="inline-flex items-center gap-1.5 bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-800 transition disabled:opacity-50"
                    >
                      {subcatSubmitting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      Save Subcategory
                    </button>
                  </div>
                </form>
              </div>

              {/* Subcategories List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>Existing Subcategories ({subcategories.length})</span>
                  {loadingSubcats && <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />}
                </h4>

                {subcategories.length > 0 ? (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                    {subcategories.map((sub) => (
                      <div key={sub.id} className="p-3.5 hover:bg-slate-50/80 transition flex items-center justify-between gap-3">
                        {editingSubcatId === sub.id ? (
                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              value={editSubcatName}
                              onChange={(e) => setEditSubcatName(e.target.value)}
                              className="w-full rounded-lg border border-blue-400 bg-white px-2.5 py-1 text-sm font-semibold text-slate-900 focus:outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Description..."
                              value={editSubcatDesc}
                              onChange={(e) => setEditSubcatDesc(e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 focus:outline-none"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleSaveEditSubcat(sub.id)}
                                disabled={subcatSubmitting || !editSubcatName.trim()}
                                className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingSubcatId(null)}
                                className="px-2.5 py-1 border border-slate-200 text-slate-600 rounded-lg text-xs hover:bg-slate-100 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 text-sm truncate">{sub.name}</p>
                              {sub.description && (
                                <p className="text-xs text-slate-500 truncate mt-0.5">{sub.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEditSubcat(sub)}
                                className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                                title="Edit subcategory"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSubcat(sub.id, sub.name)}
                                className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                                title="Delete subcategory"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400">
                    No subcategories added under this category yet.
                  </div>
                )}
              </div>
            </div>

            <footer className="border-t border-slate-200 p-4 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSubcatModalOpen(false)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
              >
                Close
              </button>
            </footer>
          </div>
        </>
      )}

      {/* Category Add / Edit Modals */}
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
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <form onSubmit={isAddOpen ? handleCreate : handleUpdate} className="flex-1 overflow-y-auto p-6 space-y-6">
              <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Display Label *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Metal & Fabrication Products"
                    value={label}
                    onChange={(e) => {
                      setLabel(e.target.value);
                      if (isAddOpen && !code) {
                        setCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_'));
                      }
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    System Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. metal_fabrication_products"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Unique slug identifier used across catalog matching.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="High performance industrial goods..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Category Visual Banner/Icon *
                  </label>
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition">
                    <Upload className="h-8 w-8 text-blue-600 mb-2" />
                    <span className="text-sm font-semibold text-slate-700">
                      {imageFile ? imageFile.name : 'Upload New Category Image'}
                    </span>
                    <span className="text-xs text-slate-400 mt-1">
                      PNG, JPG, or WEBP up to 5MB
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={(e) => handleImageSelect(e.target.files?.[0])}
                      className="hidden"
                    />
                  </label>

                  {imagePreview ? (
                    <div className="mt-3 relative h-32 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-slate-900/60 backdrop-blur-xs px-3 py-1.5 text-xs text-white flex items-center justify-between">
                        <span>{imageFile ? 'Selected Image' : 'Current Image'}</span>
                        {imageFile ? (
                          <button
                            type="button"
                            onClick={() => {
                              setImageFile(null);
                              setImagePreview(image);
                            }}
                            className="font-semibold text-slate-300 hover:text-red-400"
                          >
                            Undo
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
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
                  className="px-5 py-2.5 bg-blue-700 text-white rounded-xl hover:bg-blue-800 transition text-sm font-semibold flex items-center gap-1.5 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
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
