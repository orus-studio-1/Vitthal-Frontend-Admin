'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Upload,
  X,
  Plus,
  Wrench,
  HelpCircle,
  Image as ImageIcon,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import DashboardLayout from '../../../../components/dashboard-layout';
import { extractApiError, serviceAPI, productAPI } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth-context';
import { Category } from '../../../../lib/types';

export default function AddServicePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Categories loading
  const [categoriesOptions, setCategoriesOptions] = useState<Category[]>([]);
  const [isLoadingCats, setIsLoadingCats] = useState(true);

  // Status states
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [serviceName, setServiceName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("approved");

  // Media states (accepts single file)
  const [uploadedMedia, setUploadedMedia] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    async function loadCats() {
      setIsLoadingCats(true);
      try {
        const response = await productAPI.getCategories();
        if (response.data?.data) {
          // Filter: only service categories
          const serviceCats = response.data.data.filter((c: any) => c.category_type === 'service');
          setCategoriesOptions(serviceCats);
          if (serviceCats.length > 0) {
            setCategory(serviceCats[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load service categories:", err);
      } finally {
        setIsLoadingCats(false);
      }
    }
    loadCats();
  }, []);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const file = files[0];

    const isVideo = file.type.startsWith("video/");
    const isValidType = ["image/jpeg", "image/png", "image/jpg", "image/webp", "video/mp4", "video/quicktime", "video/x-msvideo"].includes(file.type);
    const maxSize = isVideo ? 100 * 1024 * 1024 : 5 * 1024 * 1024; // 100MB video, 5MB image

    if (!isValidType) {
      setError(`${file.name} - Invalid format. Use JPG, PNG, WEBP, or MP4/MOV/AVI video.`);
      return;
    }
    if (file.size > maxSize) {
      setError(`${file.name} - File too large. Max ${isVideo ? "100MB for video" : "5MB for image"}.`);
      return;
    }

    setError('');
    setUploadedMedia(file);
  };

  const removeMedia = () => {
    setUploadedMedia(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!serviceName || !category) {
      setError("Please fill out all required details (Service Name, Category).");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSaving(true);

    try {
      // 1. Create service catalog entry
      const serviceRes = await serviceAPI.create({
        name: serviceName,
        description,
        categoryId: category,
        status,
      });

      const finalServiceId = serviceRes.data?.data?.id;

      if (!finalServiceId) {
        throw new Error("Failed to retrieve service ID from registry response.");
      }

      // 2. Upload media if selected
      if (uploadedMedia) {
        const formData = new FormData();
        formData.append("file", uploadedMedia);

        await serviceAPI.uploadMedia(finalServiceId, formData);
      }

      setSuccess("Service submitted successfully to the global catalog registry.");
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Redirect after brief delay
      setTimeout(() => {
        router.push('/dashboard/services');
      }, 1500);

    } catch (err) {
      setError(extractApiError(err, "Failed to create service"));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;
    const file = files[0];

    const isVideo = file.type.startsWith("video/");
    const isValidType = ["image/jpeg", "image/png", "image/jpg", "image/webp", "video/mp4", "video/quicktime", "video/x-msvideo"].includes(file.type);
    const maxSize = isVideo ? 100 * 1024 * 1024 : 5 * 1024 * 1024; // 100MB video, 5MB image

    if (!isValidType) {
      setError(`${file.name} - Invalid format. Use JPG, PNG, WEBP, or MP4/MOV/AVI video.`);
      return;
    }
    if (file.size > maxSize) {
      setError(`${file.name} - File too large. Max ${isVideo ? "100MB for video" : "5MB for image"}.`);
      return;
    }

    setError('');
    setUploadedMedia(file);
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
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-slate-200 pb-5">
          <Link
            href="/dashboard/services"
            className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Create Global Catalog Service
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Compile parameters, key properties, descriptions, and media to declare a new catalog service definition.
            </p>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2 animate-in fade-in duration-300">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2 animate-in fade-in duration-300">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Main Info Card */}
          <section className="bg-white rounded-[1.75rem] border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Wrench className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">General Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Service Name */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Service Name *
                </label>
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="e.g. Industrial Wiring & Installation"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  required
                />
              </div>

              {/* Category Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  disabled={isLoadingCats}
                  required
                >
                  <option value="" disabled>
                    {isLoadingCats ? "Loading categories..." : "Select Category"}
                  </option>
                  {categoriesOptions.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Initial Status Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Initial Status *
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  required
                >
                  <option value="approved">Approved (Active immediately)</option>
                  <option value="pending">Pending (Needs verification)</option>
                </select>
              </div>

            </div>
          </section>

          {/* Service Description Card */}
          <section className="bg-white rounded-[1.75rem] border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">Service Description</h2>
            </div>
            <p className="text-xs text-slate-500">Describe the service scope, operations, safety requirements, and capabilities.</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write catalog service description..."
              rows={6}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </section>

          {/* Service Media Card */}
          <section className="bg-white rounded-[1.75rem] border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <ImageIcon className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">Service Media</h2>
            </div>
            <p className="text-xs text-slate-500">Upload a photo or video representation (PNG, JPG, WEBP max 5MB; MP4 max 100MB).</p>

            <div className="grid grid-cols-1 gap-6">
              {uploadedMedia ? (
                <div className="relative group rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 text-sm block truncate max-w-[240px] md:max-w-xs">{uploadedMedia.name}</span>
                      <span className="text-xs text-slate-400 block">{(uploadedMedia.size / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeMedia}
                    className="p-2 border border-slate-200 bg-white rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100 transition shadow-xs"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-[1.25rem] py-10 px-4 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/20 transition-all flex flex-col items-center justify-center"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleMediaSelect}
                    accept="image/*,video/*"
                    className="hidden"
                  />
                  <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                    <Upload className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">Drag and drop service media here, or <span className="text-blue-600">browse files</span></p>
                  <p className="text-xs text-slate-400 mt-1">Supports JPEG, PNG, WEBP and MP4 files</p>
                </div>
              )}
            </div>
          </section>

          {/* Form Actions */}
          <div className="flex justify-end items-center gap-4 pt-4 border-t border-slate-200">
            <Link
              href="/dashboard/services"
              className="px-6 py-3 border border-slate-200 bg-white text-slate-600 rounded-xl hover:bg-slate-50 transition text-sm font-bold shadow-xs"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-blue-700 text-white rounded-xl hover:bg-blue-800 transition text-sm font-bold flex items-center gap-2 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Catalog Entry...
                </>
              ) : (
                <>
                  Create Catalog Entry
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </DashboardLayout>
  );
}
