'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  ArrowLeft,
  Upload,
  User,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Plus,
  X,
  FileText,
  Percent,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  ImageIcon,
} from 'lucide-react';
import DashboardLayout from '../../../../components/dashboard-layout';
import { extractApiError, hiringAPI } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth-context';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_CLIENT_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

const SUGGESTED_SKILLS = [
  'CNC Machine Operation',
  'VMC Programming',
  'MIG / TIG Welding',
  'Lathe Turning',
  'Sheet Metal Fabrication',
  'PLC Automation',
  'Hydraulics & Pneumatics',
  'Quality Control (QC)',
  'Industrial Electrical',
  'AutoCAD / SolidWorks',
  'Preventive Maintenance',
  'Die & Mould Making',
  'Forklift Operation',
];

const COMMON_DOC_TYPES = [
  { value: 'aadhaar', label: 'Aadhaar Card' },
  { value: 'pan', label: 'PAN Card' },
  { value: 'resume', label: 'Resume / CV' },
  { value: 'certificate', label: 'Trade / Skill Certificate' },
  { value: 'experience', label: 'Experience Letter' },
  { value: 'other', label: 'Other Document' },
];

interface PendingDoc {
  doc_type: string;
  doc_number: string;
  doc_name: string;
  doc_url: string;
}

export default function AddCandidatePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [designation, setDesignation] = useState('');
  const [experienceYears, setExperienceYears] = useState<number>(0);
  const [hiringType, setHiringType] = useState<'permanent' | 'contract' | 'freelance' | 'all'>('all');
  const [expectedSalary, setExpectedSalary] = useState('');
  const [commissionPercentage, setCommissionPercentage] = useState<number>(0);
  const [bio, setBio] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);

  // Skills
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

  // Photo
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);

  // Documents
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const [docTypeInput, setDocTypeInput] = useState('aadhaar');
  const [docNumberInput, setDocNumberInput] = useState('');
  const [docUploading, setDocUploading] = useState(false);

  // Form states
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated]);

  const handleAddSkill = (skillToAdd: string) => {
    const trimmed = skillToAdd.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setPhotoUploading(true);
      setError('');
      const formData = new FormData();
      formData.append('file', file);

      const res = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      });

      const fileKey = res.data.fileName;
      // Fetch signed or direct url
      const urlRes = await axios.get(`${API_BASE_URL}/api/upload/file?fileName=${encodeURIComponent(fileKey)}`, {
        withCredentials: true,
      });

      setPhotoUrl(urlRes.data.url || fileKey);
      setPhotoPreview(URL.createObjectURL(file));
    } catch (err) {
      console.error('Error uploading photo:', err);
      // Fallback: create object URL for preview if S3 upload not configured in dev
      setPhotoPreview(URL.createObjectURL(file));
      setPhotoUrl(URL.createObjectURL(file));
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setDocUploading(true);
      setError('');
      const formData = new FormData();
      formData.append('file', file);

      const res = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      });

      const fileKey = res.data.fileName;
      const urlRes = await axios.get(`${API_BASE_URL}/api/upload/file?fileName=${encodeURIComponent(fileKey)}`, {
        withCredentials: true,
      });

      setPendingDocs([
        ...pendingDocs,
        {
          doc_type: docTypeInput,
          doc_number: docNumberInput,
          doc_name: file.name,
          doc_url: urlRes.data.url || fileKey,
        },
      ]);
      setDocNumberInput('');
    } catch (err) {
      console.error('Error uploading document:', err);
      // Fallback
      setPendingDocs([
        ...pendingDocs,
        {
          doc_type: docTypeInput,
          doc_number: docNumberInput,
          doc_name: file.name,
          doc_url: file.name,
        },
      ]);
      setDocNumberInput('');
    } finally {
      setDocUploading(false);
    }
  };

  const handleRemoveDoc = (index: number) => {
    setPendingDocs(pendingDocs.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      setError('Full Name and Contact Phone are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const candidatePayload = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        pincode: pincode.trim() || null,
        address_line: addressLine.trim() || null,
        designation: designation.trim() || 'Industrial Worker',
        experience_years: Number(experienceYears) || 0,
        skills,
        metadata: {
          hiring_type: hiringType,
          expected_salary: expectedSalary.trim() || undefined,
          bio: bio.trim() || undefined,
        },
        photo_url: photoUrl || null,
        commission_percentage: Number(commissionPercentage) || 0,
        is_available: isAvailable,
      };

      const res = await hiringAPI.createCandidate(candidatePayload);
      const createdCandidate = res.data.data;

      // Upload any pending documents
      if (pendingDocs.length > 0 && createdCandidate?.id) {
        for (const doc of pendingDocs) {
          try {
            await hiringAPI.addDocument(createdCandidate.id, {
              doc_type: doc.doc_type,
              doc_number: doc.doc_number || undefined,
              doc_url: doc.doc_url,
              doc_name: doc.doc_name,
            });
          } catch (docErr) {
            console.warn('Non-fatal: Document attachment failed:', docErr);
          }
        }
      }

      setSuccess(`✅ Candidate "${fullName}" has been added to the registry!`);
      setTimeout(() => {
        router.push(`/dashboard/hiring/${createdCandidate.id}`);
      }, 1200);
    } catch (err) {
      setError(extractApiError(err, 'Failed to create candidate record.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-8 p-6 lg:p-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/hiring"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                Register New Candidate
              </h1>
              <p className="text-sm text-slate-500">
                Add an industrial worker or technical candidate to the staffing registry.
              </p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Basic Information */}
          <div className="space-y-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm md:p-8">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <User className="h-5 w-5 text-[#ccb27a]" />
              <h2 className="text-lg font-bold text-slate-900">Personal & Contact Information</h2>
            </div>

            {/* Profile Photo Upload */}
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-slate-400" />
                )}
                {photoUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}
              </div>
              <div className="space-y-1 text-center sm:text-left">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                  <Upload className="h-3.5 w-3.5" />
                  Upload Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={photoUploading}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-slate-400">JPG, PNG or WEBP up to 5MB.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-[#ccb27a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ccb27a]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Contact Phone <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-[#ccb27a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ccb27a]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="rajesh@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-[#ccb27a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ccb27a]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  City / Industrial Hub
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pune, Chakan, Bhosari"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-[#ccb27a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ccb27a]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  State
                </label>
                <input
                  type="text"
                  placeholder="Maharashtra"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-[#ccb27a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ccb27a]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Pincode
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="411026"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-[#ccb27a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ccb27a]/20"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Residential / Local Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Complete street address..."
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-[#ccb27a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ccb27a]/20"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Professional & Skills */}
          <div className="space-y-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm md:p-8">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <Briefcase className="h-5 w-5 text-[#ccb27a]" />
              <h2 className="text-lg font-bold text-slate-900">Professional Experience & Skills</h2>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Primary Designation
                </label>
                <input
                  type="text"
                  placeholder="e.g. CNC Machine Operator"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-[#ccb27a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ccb27a]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Years of Experience
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(parseFloat(e.target.value) || 0)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-[#ccb27a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ccb27a]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Hiring Category
                </label>
                <select
                  value={hiringType}
                  onChange={(e) => setHiringType(e.target.value as any)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-[#ccb27a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ccb27a]/20"
                >
                  <option value="all">Any (Contract / Permanent / Freelance)</option>
                  <option value="permanent">Permanent Placement</option>
                  <option value="contract">Contract Staffing</option>
                  <option value="freelance">Freelance / Gig Worker</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Expected Salary / Rate
                </label>
                <input
                  type="text"
                  placeholder="₹25,000 / month or ₹800/day"
                  value={expectedSalary}
                  onChange={(e) => setExpectedSalary(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-[#ccb27a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ccb27a]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Admin Commission (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={commissionPercentage}
                  onChange={(e) => setCommissionPercentage(parseFloat(e.target.value) || 0)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-[#ccb27a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ccb27a]/20"
                />
                <p className="mt-1 text-[11px] text-slate-400">Currently set to 0% by default.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Availability
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAvailable(!isAvailable)}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isAvailable ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isAvailable ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-sm font-medium text-slate-700">
                    {isAvailable ? 'Available for hiring' : 'Engaged / Busy'}
                  </span>
                </div>
              </div>
            </div>

            {/* Skills Tag Input */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Skills & Technical Competencies
              </label>

              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
                {skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-sm"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder="Type skill & press Enter..."
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill(skillInput);
                    }
                  }}
                  className="min-w-[180px] flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>

              {/* Suggestions */}
              <div>
                <p className="text-xs font-medium text-slate-400">Quick suggestions:</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {SUGGESTED_SKILLS.filter((s) => !skills.includes(s)).slice(0, 8).map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => handleAddSkill(skill)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-[#ccb27a] hover:text-slate-900"
                    >
                      <Plus className="h-2.5 w-2.5 text-[#ccb27a]" />
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Candidate Bio */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Professional Bio / Background
              </label>
              <textarea
                rows={3}
                placeholder="Brief summary of candidate's strengths, machines worked on, shifts preferred, etc..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-[#ccb27a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ccb27a]/20"
              />
            </div>
          </div>

          {/* Section 3: Document Attachments */}
          <div className="space-y-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm md:p-8">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <FileText className="h-5 w-5 text-[#ccb27a]" />
              <h2 className="text-lg font-bold text-slate-900">Verification Documents (Optional)</h2>
            </div>

            {/* Document upload picker */}
            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Document Type
                </label>
                <select
                  value={docTypeInput}
                  onChange={(e) => setDocTypeInput(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#ccb27a] focus:outline-none"
                >
                  {COMMON_DOC_TYPES.map((dt) => (
                    <option key={dt.value} value={dt.value}>
                      {dt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Document ID / Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1234-5678-9012"
                  value={docNumberInput}
                  onChange={(e) => setDocNumberInput(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-[#ccb27a] focus:outline-none"
                />
              </div>

              <div className="flex items-end">
                <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1f2d2d] px-4 py-2 text-xs font-semibold text-[#f5ecdf] shadow-sm transition hover:brightness-110">
                  {docUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#ccb27a]" />
                  ) : (
                    <Upload className="h-4 w-4 text-[#ccb27a]" />
                  )}
                  Select & Upload File
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleDocUpload}
                    disabled={docUploading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Uploaded doc list */}
            {pendingDocs.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Uploaded Documents ({pendingDocs.length})
                </p>
                <div className="space-y-2">
                  {pendingDocs.map((doc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{doc.doc_name}</p>
                          <p className="text-[11px] text-slate-400">
                            Type: <span className="capitalize">{doc.doc_type}</span>
                            {doc.doc_number ? ` • Number: ${doc.doc_number}` : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc(idx)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-4 border-t border-slate-200 pt-6">
            <Link
              href="/dashboard/hiring"
              className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#1f2d2d] to-[#2a3c3c] px-8 py-3 text-sm font-semibold text-[#f5ecdf] shadow-lg shadow-slate-900/10 transition hover:brightness-110 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#ccb27a]" />
                  Saving Profile...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-[#ccb27a]" />
                  Save Candidate
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
