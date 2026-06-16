'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Upload,
  X,
  Check,
  Plus,
  Package2,
  HelpCircle,
  Info,
  ChevronRight,
  Image as ImageIcon,
  FileText,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import DashboardLayout from '../../../../components/dashboard-layout';
import { extractApiError, productAPI } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth-context';

type SpecificationDraft = {
  id: string;
  key: string;
  value: string;
};

type AttributeDraft = {
  id: string;
  key: string;
  value: string;
};

function createSpecificationDraft(): SpecificationDraft {
  return {
    id: `spec-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    key: "",
    value: "",
  };
}

function createAttributeDraft(key = "", value = ""): AttributeDraft {
  return {
    id: `attr-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    key,
    value,
  };
}

export default function AddProductPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Categories loading
  const [categoriesOptions, setCategoriesOptions] = useState<any[]>([]);
  const [isLoadingCats, setIsLoadingCats] = useState(true);

  // Status states
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [productName, setProductName] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [productType, setProductType] = useState("");
  const [productTypes, setProductTypes] = useState<string[]>([]);
  const [quotationLimit, setQuotationLimit] = useState("");

  const [attributes, setAttributes] = useState<AttributeDraft[]>([
    createAttributeDraft("Material", ""),
    createAttributeDraft("Grade", ""),
    createAttributeDraft("Application", ""),
    createAttributeDraft("Standard", ""),
  ]);

  const [specifications, setSpecifications] = useState<SpecificationDraft[]>([
    createSpecificationDraft(),
  ]);

  // Images states
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState<number>(0);
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
          setCategoriesOptions(response.data.data);
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      } finally {
        setIsLoadingCats(false);
      }
    }
    async function loadTypes() {
      try {
        const response = await productAPI.getProductTypes();
        if (response.data?.data) {
          setProductTypes(response.data.data);
        }
      } catch (err) {
        console.error("Failed to load product types:", err);
      }
    }
    loadCats();
    loadTypes();
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      const isValidType = ["image/jpeg", "image/png", "image/jpg"].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
      if (!isValidType) {
        setError(`${file.name} - Invalid format. Use JPG or PNG.`);
      }
      if (!isValidSize) {
        setError(`${file.name} - File too large. Max 5MB.`);
      }
      return isValidType && isValidSize;
    });
    setUploadedImages((prev) => [...prev, ...validFiles]);
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
    if (primaryImageIndex === index) {
      setPrimaryImageIndex(0);
    } else if (primaryImageIndex > index) {
      setPrimaryImageIndex((prev) => prev - 1);
    }
  };

  const updateSpecification = (
    index: number,
    field: keyof SpecificationDraft,
    value: string,
  ) => {
    setSpecifications((current) =>
      current.map((specification, currentIndex) =>
        currentIndex === index
          ? { ...specification, [field]: value }
          : specification,
      ),
    );
  };

  const addSpecificationRow = () => {
    setSpecifications((current) => [...current, createSpecificationDraft()]);
  };

  const removeSpecificationRow = (index: number) => {
    setSpecifications((current) =>
      current.length === 1
        ? [createSpecificationDraft()]
        : current.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const updateAttribute = (
    index: number,
    field: keyof AttributeDraft,
    value: string,
  ) => {
    setAttributes((current) =>
      current.map((attribute, currentIndex) =>
        currentIndex === index
          ? { ...attribute, [field]: value }
          : attribute,
      ),
    );
  };

  const addAttributeRow = () => {
    setAttributes((current) => [...current, createAttributeDraft()]);
  };

  const removeAttributeRow = (index: number) => {
    setAttributes((current) =>
      current.length === 1
        ? [createAttributeDraft()]
        : current.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!productName || !category || !productType) {
      setError("Please fill out all required details (Product Name, Category, Product Type).");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSaving(true);
    try {
      const specificationPayload = specifications
        .map((spec) => ({
          key: spec.key.trim(),
          value: spec.value.trim(),
        }))
        .filter((spec) => spec.key.length > 0 || spec.value.length > 0);

      const attributesPayload: Record<string, string> = {};
      attributes.forEach((attr) => {
        const k = attr.key.trim();
        if (k) {
          attributesPayload[k] = attr.value.trim();
        }
      });

      const materialVal = attributesPayload["Material"] || attributesPayload["material"] || "";
      const gradeVal = attributesPayload["Grade"] || attributesPayload["grade"] || "";
      const applicationVal = attributesPayload["Application"] || attributesPayload["application"] || "";
      const standardVal = attributesPayload["Standard"] || attributesPayload["standard"] || "";

      // 1. Create product catalog entry
      const prodRes = await productAPI.create({
        name: productName,
        description,
        category,
        productType,
        grade: gradeVal,
        material: materialVal,
        application: applicationVal,
        standard: standardVal,
        attributes: attributesPayload,
        specifications: specificationPayload,
        itemCode: itemCode.trim() || null,
        quotationLimit: quotationLimit ? Number(quotationLimit) : null,
      });

      const finalProductId = prodRes.data?.data?.id;

      if (!finalProductId) {
        throw new Error("Failed to retrieve product ID from registry response.");
      }

      // 2. Upload images if selected
      if (uploadedImages.length > 0) {
        const formData = new FormData();
        formData.append("productId", finalProductId);
        formData.append("primaryImageIndex", primaryImageIndex.toString());
        uploadedImages.forEach((image) => {
          formData.append("images", image);
        });

        await productAPI.uploadProductImages(formData);
      }

      setSuccess("Product submitted successfully to the global catalog registry.");
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Redirect after brief delay
      setTimeout(() => {
        router.push('/dashboard/products');
      }, 1500);

    } catch (err) {
      setError(extractApiError(err, "Failed to create product"));
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
    const validFiles = files.filter((file) => {
      const isValidType = ["image/jpeg", "image/png", "image/jpg"].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
      if (!isValidType) {
        setError(`${file.name} - Invalid format. Use JPG or PNG.`);
      }
      if (!isValidSize) {
        setError(`${file.name} - File too large. Max 5MB.`);
      }
      return isValidType && isValidSize;
    });
    setUploadedImages((prev) => [...prev, ...validFiles]);
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
            href="/dashboard/products"
            className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Create Global Catalog Product
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Compile parameters, key properties, specifications, and images to declare a new catalog definition.
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
              <Package2 className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">General Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Product Name */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. PP Copolymer Granules - Grade A"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  required
                />
              </div>

              {/* Item Code (Optional SKU ID) */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Product Item Code / SKU
                  </label>
                  <div className="relative group">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-slate-900 text-white text-[10px] p-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-md">
                      Unique identifier used for matching catalog products and stock tracking.
                    </div>
                  </div>
                </div>
                <input
                  type="text"
                  value={itemCode}
                  onChange={(e) => setItemCode(e.target.value)}
                  placeholder="e.g. PP-COP-102"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-mono"
                />
              </div>

              {/* Quotation Limit */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Quotation Limit
                  </label>
                  <div className="relative group">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-slate-900 text-white text-[10px] p-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-md">
                      Minimum order quantity threshold at which vendors are forced to receive customized quotation requests instead of instant purchase.
                    </div>
                  </div>
                </div>
                <input
                  type="number"
                  value={quotationLimit}
                  onChange={(e) => setQuotationLimit(e.target.value)}
                  placeholder="e.g. 500"
                  min="1"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
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
                  <option value="">
                    {isLoadingCats ? "Loading categories..." : "Select Category"}
                  </option>
                  {categoriesOptions.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Type Custom Input with Datalist */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Product Type *
                </label>
                <input
                  type="text"
                  list="product-types-list"
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  placeholder="Enter or select type"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  required
                />
                <datalist id="product-types-list">
                  {productTypes.map((type) => (
                    <option key={type} value={type} />
                  ))}
                </datalist>
              </div>

            </div>
          </section>

          {/* Key Properties (Attributes) */}
          <section className="bg-white rounded-[1.75rem] border border-slate-200 p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Key Properties (Attributes)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Define the primary parameters representing this catalog item. Key attributes include Material, Grade, Application, and Standard.
              </p>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              {attributes.map((attr, index) => (
                <div key={attr.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-center">
                  <input
                    type="text"
                    value={attr.key}
                    onChange={(e) => updateAttribute(index, "key", e.target.value)}
                    placeholder="Property name (e.g. Material)"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={attr.value}
                    onChange={(e) => updateAttribute(index, "value", e.target.value)}
                    placeholder="Value (e.g. Polypropylene)"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeAttributeRow(index)}
                    className="p-2 border border-slate-200 rounded-xl bg-white text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addAttributeRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-slate-350 hover:border-blue-500 hover:text-blue-600 rounded-lg text-xs font-semibold text-slate-600 transition bg-white"
              >
                <Plus className="w-3.5 h-3.5" /> Add Property Field
              </button>
            </div>
          </section>

          {/* Specifications */}
          <section className="bg-white rounded-[1.75rem] border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText className="h-5 w-5 text-emerald-600" />
              <div>
                <h2 className="text-lg font-bold text-slate-900">Technical Specifications</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Provide detailed parameter cards (e.g. density, melting point, tensile strength).
                </p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              {specifications.map((spec, index) => (
                <div key={spec.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-center">
                  <input
                    type="text"
                    value={spec.key}
                    onChange={(e) => updateSpecification(index, "key", e.target.value)}
                    placeholder="Key (e.g. Tensile Strength)"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={spec.value}
                    onChange={(e) => updateSpecification(index, "value", e.target.value)}
                    placeholder="Value (e.g. 25 MPa)"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeSpecificationRow(index)}
                    className="p-2 border border-slate-200 rounded-xl bg-white text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addSpecificationRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-slate-350 hover:border-blue-500 hover:text-blue-600 rounded-lg text-xs font-semibold text-slate-600 transition bg-white"
              >
                <Plus className="w-3.5 h-3.5" /> Add Specification Row
              </button>
            </div>
          </section>

          {/* Description */}
          <section className="bg-white rounded-[1.75rem] border border-slate-200 p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Product Description</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Describe the material, capabilities, parameters, and applications.
              </p>
            </div>

            <div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write catalog product description..."
                rows={6}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition leading-relaxed"
              />
            </div>
          </section>

          {/* Media Files */}
          <section className="bg-white rounded-[1.75rem] border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <ImageIcon className="h-5 w-5 text-amber-500" />
              <div>
                <h2 className="text-lg font-bold text-slate-900">Product Media</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload catalog product photos (PNG, JPG, max 5MB). Select which image serves as primary object.
                </p>
              </div>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-2xl p-8 hover:border-blue-500 hover:bg-slate-50/30 transition-all cursor-pointer text-center group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                multiple
                accept="image/jpeg,image/png,image/jpg"
                className="hidden"
              />
              <div className="mx-auto w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition">
                <Upload className="w-6 h-6" />
              </div>
              <p className="mt-3 font-bold text-sm text-slate-700">
                Drag and drop images here, or <span className="text-blue-600 group-hover:underline">browse files</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">Supports JPEG, JPG, and PNG files up to 5MB.</p>
            </div>

            {/* Uploaded Images List */}
            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                {uploadedImages.map((file, index) => {
                  const isPrimary = index === primaryImageIndex;
                  return (
                    <div
                      key={index}
                      className={`relative group border rounded-xl overflow-hidden bg-slate-50 p-1 flex flex-col justify-between ${
                        isPrimary ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200'
                      }`}
                    >
                      <div className="aspect-video w-full relative bg-white border border-slate-100 rounded-lg overflow-hidden">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Uploaded preview ${index}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black text-white rounded-lg transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="mt-2 pt-1 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setPrimaryImageIndex(index)}
                          className={`flex-1 py-1 rounded text-[10px] font-bold transition ${
                            isPrimary
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-white hover:bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {isPrimary ? 'Primary Image' : 'Set as Primary'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-6">
            <Link
              href="/dashboard/products"
              className="px-5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 transition text-sm font-semibold"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl transition text-sm font-bold flex items-center gap-2 disabled:opacity-50 shadow-md"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Product...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
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
