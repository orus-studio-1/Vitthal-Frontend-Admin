'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  ImageIcon,
  ArrowLeft,
  Settings,
  Sliders,
  Eye,
  FileCode,
  HelpCircle,
  Check,
  ChevronRight,
  Sparkles,
  Paperclip,
  Calendar,
  ToggleLeft,
  ToggleRight,
  ArrowUpRight,
  ListPlus,
} from 'lucide-react';
import DashboardLayout from '../../../components/dashboard-layout';
import { extractApiError, productAPI, serviceHubAPI } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';

export interface FormFieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'file' | 'image' | 'checkbox' | 'date';
  placeholder?: string;
  required: boolean;
  options?: string[];
  help_text?: string;
}

export default function ServiceCategoriesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Category Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);

  // Subcategory Drawer / Modal state
  const [isSubcatModalOpen, setIsSubcatModalOpen] = useState(false);
  const [subcatCategory, setSubcatCategory] = useState<any | null>(null);
  const [subcategories, setSubcategories] = useState<any[]>([]);
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

  // Dynamic Form Schema Builder state
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [selectedSubcatForSchema, setSelectedSubcatForSchema] = useState<any | null>(null);
  const [schemaFields, setSchemaFields] = useState<FormFieldDefinition[]>([]);
  const [schemaTab, setSchemaTab] = useState<'builder' | 'preview'>('builder');
  const [savingSchema, setSavingSchema] = useState(false);
  const [schemaSuccess, setSchemaSuccess] = useState('');
  const [schemaError, setSchemaError] = useState('');

  // New field in builder
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<FormFieldDefinition['type']>('text');
  const [fieldPlaceholder, setFieldPlaceholder] = useState('');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldOptionsStr, setFieldOptionsStr] = useState('');
  const [fieldHelpText, setFieldHelpText] = useState('');
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);

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
    formData.append('category_type', 'service');
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
      const res = await serviceHubAPI.getCategories();
      if (res.data?.categories) {
        setCategories(res.data.categories);
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
  const handleOpenEdit = (category: any) => {
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

  // Load Subcategories
  const loadSubcategories = async (categoryId: string) => {
    try {
      setLoadingSubcats(true);
      setSubcatError('');
      const res = await serviceHubAPI.getCategories();
      if (res.data?.categories) {
        const current = res.data.categories.find((c: any) => c.id === categoryId);
        setSubcategories(current?.subcategories || []);
      }
    } catch (err) {
      setSubcatError(extractApiError(err, 'Failed to load subcategories.'));
    } finally {
      setLoadingSubcats(false);
    }
  };

  // Open Subcategory Drawer
  const handleOpenSubcatModal = async (category: any) => {
    setSubcatCategory(category);
    setNewSubcatName('');
    setNewSubcatDesc('');
    setEditingSubcatId(null);
    setSubcatError('');
    setSubcatSuccess('');
    setIsSubcatModalOpen(true);
    await loadSubcategories(category.id);
  };

  // Open Schema Builder Modal
  const handleOpenSchemaModal = (subcat: any) => {
    setSelectedSubcatForSchema(subcat);
    const existingSchema = Array.isArray(subcat.form_schema) ? subcat.form_schema : [];
    setSchemaFields(existingSchema);
    setSchemaTab('builder');
    setSchemaSuccess('');
    setSchemaError('');
    resetFieldForm();
    setIsSchemaModalOpen(true);
  };

  const resetFieldForm = () => {
    setFieldLabel('');
    setFieldName('');
    setFieldType('text');
    setFieldPlaceholder('');
    setFieldRequired(false);
    setFieldOptionsStr('');
    setFieldHelpText('');
    setEditingFieldIndex(null);
  };

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldLabel.trim()) return;

    const generatedName =
      fieldName.trim() ||
      fieldLabel
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_');

    const options =
      fieldType === 'select'
        ? fieldOptionsStr
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean)
        : undefined;

    const newField: FormFieldDefinition = {
      name: generatedName,
      label: fieldLabel.trim(),
      type: fieldType,
      placeholder: fieldPlaceholder.trim() || undefined,
      required: fieldRequired,
      options,
      help_text: fieldHelpText.trim() || undefined,
    };

    if (editingFieldIndex !== null) {
      const updated = [...schemaFields];
      updated[editingFieldIndex] = newField;
      setSchemaFields(updated);
    } else {
      setSchemaFields([...schemaFields, newField]);
    }

    resetFieldForm();
  };

  const handleEditField = (index: number) => {
    const f = schemaFields[index];
    setFieldLabel(f.label);
    setFieldName(f.name);
    setFieldType(f.type);
    setFieldPlaceholder(f.placeholder || '');
    setFieldRequired(f.required);
    setFieldOptionsStr(f.options?.join(', ') || '');
    setFieldHelpText(f.help_text || '');
    setEditingFieldIndex(index);
  };

  const handleDeleteField = (index: number) => {
    setSchemaFields(schemaFields.filter((_, i) => i !== index));
    if (editingFieldIndex === index) resetFieldForm();
  };

  const handleSaveSchema = async () => {
    if (!selectedSubcatForSchema) return;
    try {
      setSavingSchema(true);
      setSchemaError('');
      setSchemaSuccess('');

      await serviceHubAPI.updateSubcategorySchema(selectedSubcatForSchema.id, schemaFields);
      setSchemaSuccess('Dynamic Form Schema saved successfully!');
      
      // Update local subcategories state
      setSubcategories((prev) =>
        prev.map((s) => (s.id === selectedSubcatForSchema.id ? { ...s, form_schema: schemaFields } : s))
      );
      await fetchCategories();
      setTimeout(() => setIsSchemaModalOpen(false), 800);
    } catch (err) {
      setSchemaError(extractApiError(err, 'Failed to save form schema.'));
    } finally {
      setSavingSchema(false);
    }
  };

  // Submit Add Category
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      const formData = buildCategoryFormData();
      await productAPI.createCategory(formData);
      setSuccess('Service category created successfully.');
      setIsAddOpen(false);
      await fetchCategories();
    } catch (err) {
      setError(extractApiError(err, 'Failed to create service category.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Edit Category
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      const formData = buildCategoryFormData();
      await productAPI.updateCategory(selectedCategory.id, formData);
      setSuccess('Service category updated successfully.');
      setIsEditOpen(false);
      await fetchCategories();
    } catch (err) {
      setError(extractApiError(err, 'Failed to update service category.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Category Active Status
  const handleToggleStatus = async (category: any) => {
    try {
      setError('');
      await serviceHubAPI.updateCategory(category.id, { is_active: !category.is_active });
      setSuccess(`Category "${category.label}" is now ${!category.is_active ? 'Active' : 'Inactive'}.`);
      await fetchCategories();
    } catch (err) {
      setError(extractApiError(err, 'Failed to toggle category status.'));
    }
  };

  // Delete Category
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete service category "${name}"?`)) return;

    try {
      setError('');
      await serviceHubAPI.deleteCategory(id);
      setSuccess(`Category "${name}" deleted.`);
      await fetchCategories();
    } catch (err) {
      setError(extractApiError(err, 'Failed to delete service category.'));
    }
  };

  // Create Subcategory
  const handleCreateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subcatCategory || !newSubcatName.trim()) return;

    try {
      setSubcatSubmitting(true);
      setSubcatError('');
      setSubcatSuccess('');

      await serviceHubAPI.createSubcategory({
        category_id: subcatCategory.id,
        name: newSubcatName.trim(),
        description: newSubcatDesc.trim() || undefined,
        form_schema: [],
      });

      setSubcatSuccess(`Subcategory "${newSubcatName}" created.`);
      setNewSubcatName('');
      setNewSubcatDesc('');
      await loadSubcategories(subcatCategory.id);
      await fetchCategories();
    } catch (err) {
      setSubcatError(extractApiError(err, 'Failed to create subcategory.'));
    } finally {
      setSubcatSubmitting(false);
    }
  };

  // Save Edit Subcategory
  const handleSaveEditSubcat = async (subcatId: string) => {
    if (!editSubcatName.trim()) return;

    try {
      setSubcatSubmitting(true);
      setSubcatError('');
      setSubcatSuccess('');

      await serviceHubAPI.updateSubcategory(subcatId, {
        name: editSubcatName.trim(),
        description: editSubcatDesc.trim() || undefined,
      });

      setSubcatSuccess('Subcategory updated.');
      setEditingSubcatId(null);
      if (subcatCategory) await loadSubcategories(subcatCategory.id);
      await fetchCategories();
    } catch (err) {
      setSubcatError(extractApiError(err, 'Failed to update subcategory.'));
    } finally {
      setSubcatSubmitting(false);
    }
  };

  // Delete Subcategory
  const handleDeleteSubcat = async (subcatId: string, subcatName: string) => {
    if (!confirm(`Delete subcategory "${subcatName}"?`)) return;

    try {
      setSubcatError('');
      setSubcatSuccess('');

      await serviceHubAPI.deleteSubcategory(subcatId);
      setSubcatSuccess(`Subcategory "${subcatName}" removed.`);
      if (subcatCategory) await loadSubcategories(subcatCategory.id);
      await fetchCategories();
    } catch (err) {
      setSubcatError(extractApiError(err, 'Failed to delete subcategory.'));
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/service-hub"
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition flex items-center gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Service Hub
              </Link>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              Service Categories & Dynamic Form Builder
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Configure top-level service verticals, add specific service subcategories, and define custom dynamic intake form fields (including text, number, dropdown, images, and file uploads).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Add Service Category
            </button>
          </div>
        </div>

        {/* Global Feedback */}
        {error && (
          <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <p className="font-medium">{error}</p>
            </div>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {success && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <p className="font-medium">{success}</p>
            </div>
            <button onClick={() => setSuccess('')} className="text-emerald-500 hover:text-emerald-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Categories Grid */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Registered Service Verticals ({categories.length})
            </h2>
            <div className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-semibold text-slate-700">
              {categories.filter((c) => c.is_active).length} Active / {categories.filter((c) => !c.is_active).length} Inactive
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : categories.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <article
                  key={category.id}
                  className={`group flex flex-col justify-between overflow-hidden rounded-2xl border bg-white shadow-xs transition duration-200 ${
                    category.is_active ? 'border-slate-200 hover:border-blue-400' : 'border-slate-100 opacity-75'
                  }`}
                >
                  <div>
                    {/* Header S3 Image Banner */}
                    <div className="relative h-40 w-full bg-slate-100 overflow-hidden border-b border-slate-100">
                      {category.image ? (
                        <img
                          src={category.image}
                          alt={category.label}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                          <ImageIcon className="h-10 w-10 text-slate-300" />
                        </div>
                      )}
                      <span
                        className={`absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                          category.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {category.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">{category.label}</h3>
                          <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                            {category.code}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleOpenEdit(category)}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition"
                            title="Edit Category Details"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(category.id, category.label)}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                            title="Delete Category"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="line-clamp-2 text-xs text-slate-500 min-h-[32px]">
                        {category.description || 'No description provided.'}
                      </p>

                      {/* Subcategories Snapshot */}
                      <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                          <span className="flex items-center gap-1">
                            <Tag className="h-3 w-3 text-blue-600" />
                            Registered Services
                          </span>
                          <span className="rounded bg-blue-100 px-1.5 py-0.2 font-mono text-[10px] font-bold text-blue-800">
                            {category.subcategories?.length || 0}
                          </span>
                        </div>

                        {category.subcategories && category.subcategories.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto py-0.5">
                            {category.subcategories.slice(0, 4).map((sub: any) => (
                              <span
                                key={sub.id}
                                className="inline-flex items-center text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 font-medium truncate max-w-[140px]"
                              >
                                {sub.name}
                              </span>
                            ))}
                            {category.subcategories.length > 4 && (
                              <span className="text-[10px] text-blue-600 font-semibold px-1 py-0.5">
                                +{category.subcategories.length - 4} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">No subcategories created yet.</p>
                        )}
                      </div>

                      {/* PROMINENT LONG BUTTON: Manage Subcategories & Dynamic Intake Forms */}
                      <button
                        type="button"
                        onClick={() => handleOpenSubcatModal(category)}
                        className="w-full flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition shadow-2xs group/btn"
                      >
                        <span className="flex items-center gap-2">
                          <Sliders className="h-4 w-4 text-blue-600 group-hover/btn:text-white transition" />
                          <span>Manage Subcategories & Form Fields</span>
                        </span>
                        <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="border-t border-slate-100 px-5 py-3 bg-slate-50/50 flex items-center justify-between">
                    <button
                      onClick={() => handleToggleStatus(category)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                        category.is_active
                          ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                          : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      {category.is_active ? 'Deactivate' : 'Activate'}
                    </button>

                    <span className="font-mono text-[11px] text-slate-400">
                      Sort #{category.sort_order}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-400">
              No service categories found. Click Add Service Category to get started.
            </p>
          )}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────
          MODAL 1: SUBCATEGORY MANAGEMENT DRAWER
          ──────────────────────────────────────────────────────────────────── */}
      {isSubcatModalOpen && subcatCategory && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 transition-opacity"
            onClick={() => setIsSubcatModalOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl overflow-hidden flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
            <header className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-blue-400">
                  Subcategories & Dynamic Form Setup
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

              {/* Add New Subcategory Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-2xs">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-blue-600" />
                  Create New Subcategory Service
                </h4>
                <form onSubmit={handleCreateSubcategory} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Subcategory / Service Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 5-Axis CNC Milling, Laser Cutting, VMC Spindle Repair..."
                      value={newSubcatName}
                      onChange={(e) => setNewSubcatName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Short Description (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Brief details about what this service covers..."
                      value={newSubcatDesc}
                      onChange={(e) => setNewSubcatDesc(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={subcatSubmitting || !newSubcatName.trim()}
                      className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50 shadow-xs"
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

              {/* Subcategories List & Form Builder Buttons */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Available Subcategories ({subcategories.length})
                  </h4>
                  {loadingSubcats && <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />}
                </div>

                {subcategories.length > 0 ? (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                    {subcategories.map((sub) => (
                      <div key={sub.id} className="p-4 hover:bg-slate-50/80 transition flex flex-col gap-3">
                        {editingSubcatId === sub.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editSubcatName}
                              onChange={(e) => setEditSubcatName(e.target.value)}
                              className="w-full rounded-lg border border-blue-400 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Description..."
                              value={editSubcatDesc}
                              onChange={(e) => setEditSubcatDesc(e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 focus:outline-none"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleSaveEditSubcat(sub.id)}
                                disabled={subcatSubmitting || !editSubcatName.trim()}
                                className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingSubcatId(null)}
                                className="px-3 py-1 border border-slate-200 text-slate-600 rounded-lg text-xs hover:bg-slate-100 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-900 text-sm truncate">{sub.name}</p>
                                {sub.description && (
                                  <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{sub.description}</p>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSubcatId(sub.id);
                                    setEditSubcatName(sub.name);
                                    setEditSubcatDesc(sub.description || '');
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                                  title="Edit subcategory name"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubcat(sub.id, sub.name)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Delete subcategory"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* PROMINENT SUB-BUTTON: Create / Edit Dynamic Intake Form */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[11px] font-medium text-slate-500">
                                {sub.form_schema?.length || 0} custom field(s) defined
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenSchemaModal(sub)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-600 transition shadow-xs"
                              >
                                <Sliders className="h-3.5 w-3.5" />
                                <span>Create / Edit Dynamic Form Fields</span>
                                <ArrowUpRight className="h-3 w-3" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400 bg-slate-50/50">
                    No subcategories added under this service vertical yet.
                  </div>
                )}
              </div>
            </div>

            <footer className="border-t border-slate-200 p-4 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSubcatModalOpen(false)}
                className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition shadow-xs"
              >
                Done
              </button>
            </footer>
          </div>
        </>
      )}

      {/* ────────────────────────────────────────────────────────────────────
          MODAL 2: DYNAMIC FORM SCHEMA BUILDER STUDIO
          ──────────────────────────────────────────────────────────────────── */}
      {isSchemaModalOpen && selectedSubcatForSchema && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 transition-opacity"
            onClick={() => setIsSchemaModalOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-55 w-full max-w-3xl bg-white shadow-2xl overflow-hidden flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
            <header className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-blue-400">
                  Dynamic Client Intake Form Configurator
                </span>
                <h3 className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
                  <FileCode className="h-4 w-4 text-blue-400" />
                  {selectedSubcatForSchema.name}
                </h3>
              </div>

              {/* Tab Switcher */}
              <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSchemaTab('builder')}
                  className={`px-3.5 py-1 text-xs font-semibold rounded-lg transition ${
                    schemaTab === 'builder' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sliders className="h-3 w-3 inline mr-1" /> Form Builder ({schemaFields.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSchemaTab('preview')}
                  className={`px-3.5 py-1 text-xs font-semibold rounded-lg transition ${
                    schemaTab === 'preview' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Eye className="h-3 w-3 inline mr-1" /> Live Client Preview
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {schemaError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <p className="flex-1 font-medium">{schemaError}</p>
                </div>
              )}
              {schemaSuccess && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <p className="flex-1 font-medium">{schemaSuccess}</p>
                </div>
              )}

              {schemaTab === 'builder' ? (
                <>
                  {/* Add / Edit Field Form */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5 text-blue-600" />
                        {editingFieldIndex !== null ? 'Edit Form Field' : 'Add New Field to Intake Form'}
                      </h4>
                      {editingFieldIndex !== null && (
                        <button
                          type="button"
                          onClick={resetFieldForm}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>

                    <form onSubmit={handleAddField} className="space-y-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Field Label (Shown to Client) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Spindle Taper, Broken Part Photo, Laser Power (kW)"
                            value={fieldLabel}
                            onChange={(e) => {
                              setFieldLabel(e.target.value);
                              if (editingFieldIndex === null && !fieldName) {
                                setFieldName(
                                  e.target.value
                                    .toLowerCase()
                                    .replace(/[^a-z0-9]/g, '_')
                                    .replace(/_+/g, '_')
                                );
                              }
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Field Key / ID (Database Key) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. spindle_taper, broken_part_photo"
                            value={fieldName}
                            onChange={(e) =>
                              setFieldName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Input Type *
                          </label>
                          <select
                            value={fieldType}
                            onChange={(e) => setFieldType(e.target.value as FormFieldDefinition['type'])}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          >
                            <option value="text">📝 Single Line Text (text)</option>
                            <option value="number">🔢 Numeric Value (number)</option>
                            <option value="textarea">📑 Multi-line Paragraph (textarea)</option>
                            <option value="select">🔽 Dropdown Options (select)</option>
                            <option value="image">🖼️ Image Upload (Broken Part / Machine Photo)</option>
                            <option value="file">📁 CAD Drawing / Technical File Upload (.STEP, .DWG, .PDF)</option>
                            <option value="checkbox">☑️ Yes / No Switch (checkbox)</option>
                            <option value="date">📅 Date Picker (date)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Placeholder / Description
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Upload clear photo of the machine or damaged component..."
                            value={fieldPlaceholder}
                            onChange={(e) => setFieldPlaceholder(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {fieldType === 'select' && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Dropdown Options (Comma separated) *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. BT40, BT50, HSK-A63, Capto C6"
                            value={fieldOptionsStr}
                            onChange={(e) => setFieldOptionsStr(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={fieldRequired}
                            onChange={(e) => setFieldRequired(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          Is Required (Client must fill this field)
                        </label>

                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition shadow-xs"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {editingFieldIndex !== null ? 'Update Field' : 'Add Field to Form'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Configured Fields List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Configured Form Fields ({schemaFields.length})
                    </h4>

                    {schemaFields.length > 0 ? (
                      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-2xs">
                        {schemaFields.map((field, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50 transition">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900">{field.label}</span>
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                                  {field.name}
                                </span>
                                <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase">
                                  {field.type}
                                </span>
                                {field.required && (
                                  <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                                    Required
                                  </span>
                                )}
                              </div>
                              {field.options && field.options.length > 0 && (
                                <p className="text-[11px] text-slate-500">
                                  Options: {field.options.join(', ')}
                                </p>
                              )}
                              {field.placeholder && (
                                <p className="text-[11px] text-slate-400 italic">
                                  Placeholder: "{field.placeholder}"
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleEditField(idx)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition"
                                title="Edit Field"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteField(idx)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                                title="Delete Field"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400 bg-slate-50/50">
                        No custom fields configured yet. Add fields above to build this service's intake form.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* LIVE CLIENT FORM PREVIEW */
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                      Live Preview (As Rendered On Client Portal)
                    </span>
                    <h3 className="font-heading text-base font-bold text-slate-900 mt-1">
                      {selectedSubcatForSchema.name} Request Form
                    </h3>
                  </div>

                  {schemaFields.length === 0 ? (
                    <p className="text-center py-12 text-xs text-slate-400 italic">
                      No custom fields added yet. Switch to Form Builder to add fields.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {schemaFields.map((f, i) => {
                        const isFull = f.type === 'textarea' || f.type === 'file' || f.type === 'image';
                        return (
                          <div key={i} className={isFull ? 'sm:col-span-2 space-y-1' : 'space-y-1'}>
                            <label className="block text-xs font-semibold text-slate-700">
                              {f.label} {f.required && <span className="text-rose-500">*</span>}
                            </label>

                            {f.type === 'textarea' ? (
                              <textarea
                                rows={3}
                                placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}...`}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800"
                                disabled
                              />
                            ) : f.type === 'select' ? (
                              <select
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800"
                                disabled
                              >
                                <option>Select {f.label}...</option>
                                {f.options?.map((opt, oi) => (
                                  <option key={oi} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : f.type === 'image' || f.type === 'file' ? (
                              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500">
                                {f.type === 'image' ? (
                                  <ImageIcon className="mx-auto h-5 w-5 text-blue-600 mb-1" />
                                ) : (
                                  <Upload className="mx-auto h-5 w-5 text-blue-600 mb-1" />
                                )}
                                <span className="font-semibold block text-slate-700">
                                  {f.placeholder || `Click to upload ${f.label}`}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {f.type === 'image' ? 'JPG, PNG, WEBP up to 10MB' : 'STEP, DWG, PDF, ZIP'}
                                </span>
                              </div>
                            ) : f.type === 'checkbox' ? (
                              <label className="inline-flex items-center gap-2 text-xs text-slate-700 pt-2">
                                <input type="checkbox" className="rounded border-slate-300" disabled />
                                {f.placeholder || `Enable / Required for ${f.label}`}
                              </label>
                            ) : (
                              <input
                                type={f.type}
                                placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}...`}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800"
                                disabled
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer with Save Schema button */}
            <footer className="border-t border-slate-200 p-4 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">
                {schemaFields.length} field(s) configured
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsSchemaModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveSchema}
                  disabled={savingSchema}
                  className="inline-flex items-center gap-1.5 px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50 shadow-xs"
                >
                  {savingSchema ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Form Schema
                </button>
              </div>
            </footer>
          </div>
        </>
      )}

      {/* ────────────────────────────────────────────────────────────────────
          MODAL 3: ADD / EDIT SERVICE CATEGORY MODAL
          ──────────────────────────────────────────────────────────────────── */}
      {(isAddOpen || isEditOpen) && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 transition-opacity"
            onClick={() => {
              setIsAddOpen(false);
              setIsEditOpen(false);
            }}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl overflow-hidden flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
            <header className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  {isAddOpen ? 'Add Service Category' : 'Edit Service Category'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure top-level manufacturing & service vertical.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAddOpen(false);
                  setIsEditOpen(false);
                }}
                className="text-slate-400 hover:text-white rounded-lg p-1 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <form
              onSubmit={isAddOpen ? handleAddSubmit : handleEditSubmit}
              className="flex-1 overflow-y-auto p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category Name / Label *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Precision CNC Machining, Industrial Maintenance, Plant Automation"
                  value={label}
                  onChange={(e) => {
                    setLabel(e.target.value);
                    if (isAddOpen && !code) {
                      setCode(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]/g, '_')
                          .replace(/_+/g, '_')
                      );
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  System Code Slug *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. cnc_machining"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe this service vertical..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category Banner Image (Uploaded to S3)
                </label>
                <label className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50 hover:bg-slate-100 cursor-pointer transition">
                  <Upload className="h-5 w-5 text-blue-600 mb-1" />
                  <span className="text-xs font-semibold text-slate-700">
                    {imageFile ? imageFile.name : 'Upload Category Banner'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, or WEBP up to 5MB</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={(e) => handleImageSelect(e.target.files?.[0])}
                    className="hidden"
                  />
                </label>
                {imagePreview && (
                  <div className="mt-2 h-28 rounded-xl overflow-hidden border border-slate-200">
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600"
                    />
                    Active & Visible
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setIsEditOpen(false);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50 shadow-xs"
                >
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
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
