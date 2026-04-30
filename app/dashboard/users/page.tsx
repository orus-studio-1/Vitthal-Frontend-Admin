'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Shield, ToggleLeft, ToggleRight, Users } from 'lucide-react';
import DashboardLayout from '../../../components/dashboard-layout';
import { adminAPI, extractApiError } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { UserManagementData } from '../../../lib/types';

export default function UsersPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<UserManagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchUsers() {
    try {
      setLoading(true);
      setError('');
      const response = await adminAPI.getUsers();
      setData(response.data.data);
    } catch (usersError) {
      setError(extractApiError(usersError, 'Failed to load users'));
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
      const timer = window.setTimeout(() => {
        void fetchUsers();
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [authLoading, isAuthenticated, router]);

  const toggleUser = async (id: string, is_active: boolean) => {
    try {
      await adminAPI.updateUserStatus(id, !is_active);
      await fetchUsers();
    } catch (updateError) {
      setError(extractApiError(updateError, 'Failed to update user status'));
    }
  };

  if (authLoading || !isAuthenticated) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100"><Loader2 className="h-8 w-8 animate-spin text-blue-700" /></div>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total users</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{data?.stats.total || 0}</p>
          </article>
          <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Active users</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-700">{data?.stats.active || 0}</p>
          </article>
          <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Inactive users</p>
            <p className="mt-2 text-3xl font-semibold text-amber-700">{data?.stats.inactive || 0}</p>
          </article>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">User management</h1>
              <p className="text-sm text-slate-500">Review active accounts and admin roles.</p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-700"><Users className="h-5 w-5" /></div>
          </div>

          {error ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-700" /></div>
          ) : (
            <div className="space-y-4">
              {data?.users.length ? data.users.map((user) => (
                <article key={user.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-slate-100 p-3 text-slate-700"><Shield className="h-5 w-5" /></div>
                      <div>
                        <h2 className="font-semibold text-slate-900">{user.name}</h2>
                        <p className="text-sm text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.25em] text-slate-400">{user.role}</p>
                  </div>
                  <button onClick={() => toggleUser(user.id, Boolean(user.is_active))} className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                    {user.is_active ? <ToggleRight className="h-5 w-5 text-emerald-600" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
                    {user.is_active ? 'Set inactive' : 'Set active'}
                  </button>
                </article>
              )) : <p className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">No users found.</p>}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
