'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import {
  BarChart3,
  Building2,
  MessageSquare,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  FileText,
  ShoppingCart,
  Users,
  X,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Products', href: '/dashboard/products', icon: Package },
  { name: 'Vendors', href: '/dashboard/vendors', icon: Building2 },
  { name: 'Vendor Chat', href: '/dashboard/vendor-chat', icon: MessageSquare },
  { name: 'Quotations', href: '/dashboard/quotations', icon: FileText },
  { name: 'Client Quotations', href: '/dashboard/client-quotations', icon: FileText },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
  { name: 'Users', href: '/dashboard/users', icon: Users },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-900">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-[#1d232f]/45 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[var(--sidebar-border)] bg-[linear-gradient(180deg,#1f2d2d,#172222)] text-[var(--sidebar-foreground)] shadow-2xl transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between border-b border-[var(--sidebar-border)] px-6 py-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.42em] text-[#ccb27a]">MTWO</p>
            <h1 className="mt-2 text-xl font-semibold">Control Room</h1>
            <p className="mt-1 text-xs text-[#c9bfb0]">Admin operations and approvals</p>
          </div>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-6">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? 'bg-[#f5ecdf] text-[#1d232f] shadow-lg'
                    : 'text-[#e8dbc4] hover:bg-[var(--sidebar-accent)] hover:text-white'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--sidebar-border)] px-6 py-5">
          <p className="text-sm font-medium">{user?.name || 'Admin User'}</p>
          <p className="text-xs text-[#ccbfa8]">{user?.email || 'No active session'}</p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.3em] text-[#ccb27a]">{user?.role || 'guest'}</p>
          <button
            onClick={handleLogout}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/14"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[rgba(244,239,230,0.88)] backdrop-blur">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.36em] text-[#746b5f]">Operations Grid</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">MTWO Admin Management</h2>
            </div>
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-2 text-slate-700 shadow-sm lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
