'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Wrench,
  Layers,
  Calendar,
  FileText,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Briefcase
} from 'lucide-react';
import DashboardLayout from '../../../components/dashboard-layout';
import { useAuth } from '../../../lib/auth-context';

export default function ServicesDashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
      </div>
    );
  }

  const sections = [
    {
      title: 'Manage Categories',
      description: 'Setup service industry sectors, commission structure, and classifications.',
      href: '/dashboard/service-categories',
      icon: Layers,
      color: 'bg-amber-50 text-amber-700 border-amber-100',
      hoverColor: 'hover:border-amber-300 hover:bg-amber-50/10',
      badge: 'Categories'
    },
    {
      title: 'Manage Services',
      description: 'View, edit, approve, or delete catalog definitions in the global registry.',
      href: '/dashboard/services/catalog',
      icon: Wrench,
      color: 'bg-blue-50 text-blue-700 border-blue-100',
      hoverColor: 'hover:border-blue-300 hover:bg-blue-50/10',
      badge: 'Registry'
    },
    {
      title: 'Manage Bookings',
      description: 'Track orders, scheduling calendars, payment status, and fulfillment.',
      href: '/dashboard/services/bookings',
      icon: Calendar,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      hoverColor: 'hover:border-emerald-300 hover:bg-emerald-50/10',
      badge: 'Bookings'
    },
    {
      title: 'Manage Quotations',
      description: 'Monitor customized quotation negotiations, agreed rates, and client requests.',
      href: '/dashboard/services/quotations',
      icon: FileText,
      color: 'bg-rose-50 text-rose-700 border-rose-100',
      hoverColor: 'hover:border-rose-300 hover:bg-rose-50/10',
      badge: 'Quotations'
    }
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        
        {/* Banner header */}
        <header className="rounded-3xl border border-slate-200 bg-white p-8 relative overflow-hidden shadow-xs">
          <div className="absolute top-0 right-0 h-40 w-40 bg-blue-500/5 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="absolute bottom-0 right-1/4 h-32 w-32 bg-emerald-500/5 rounded-full blur-2xl -mb-10" />
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-xs font-bold text-blue-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Services Control Center
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
                Service Operations Hub
              </h1>
              <p className="text-slate-500 text-sm max-w-xl">
                Configure your global services catalog, manage category commissions, track scheduled service bookings, and negotiate custom quotations.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 shrink-0 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Workspace</span>
                <span className="text-sm font-bold text-slate-800">Admin Operations</span>
              </div>
            </div>
          </div>
        </header>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <Link 
                key={idx} 
                href={section.href}
                className={`group flex flex-col justify-between rounded-[2rem] border border-slate-200 bg-white p-8 transition-all duration-300 hover:shadow-xl hover:shadow-slate-100 hover:-translate-y-1 ${section.hoverColor}`}
              >
                <div className="space-y-6">
                  {/* Icon and badge */}
                  <div className="flex items-center justify-between">
                    <div className={`h-14 w-14 rounded-2xl border flex items-center justify-center shadow-xs transition group-hover:scale-105 ${section.color}`}>
                      <Icon className="h-7 w-7" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-50 border border-slate-150 text-slate-500 rounded-full px-3 py-1">
                      {section.badge}
                    </span>
                  </div>

                  {/* Title and Description */}
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-700 transition">
                      {section.title}
                    </h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      {section.description}
                    </p>
                  </div>
                </div>

                {/* Footer Link */}
                <div className="mt-8 pt-4 border-t border-slate-100 flex items-center text-slate-400 group-hover:text-blue-700 transition font-bold text-xs gap-1.5 self-end">
                  Open Panel
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>

      </div>
    </DashboardLayout>
  );
}
