'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Loader2, Shield, ToggleLeft, ToggleRight, Users } from 'lucide-react';
import DashboardLayout from '../../../components/dashboard-layout';
import UserDetailsModal from '../../../components/user-details-modal';
import { adminAPI, extractApiError } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { User, UserDetailsData, UserManagementData } from '../../../lib/types';

export default function UsersPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<UserManagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetailsData | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  const clients = useMemo(() => {
    return data?.users.filter(user => user.role === 'client') || [];
  }, [data?.users]);

  const clientStats = useMemo(() => {
    const total = clients.length;
    const active = clients.filter((c: User) => c.is_active).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [clients]);

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

  async function openUserDetails(id: string) {
    try {
      setSelectedUserId(id);
      setDetailsLoading(true);
      setDetailsError('');
      setUserDetails(null);
      const response = await adminAPI.getUserDetails(id);
      setUserDetails(response.data.data);
    } catch (detailsErr) {
      setDetailsError(extractApiError(detailsErr, 'Failed to load user details'));
    } finally {
      setDetailsLoading(false);
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
      if (selectedUserId === id) {
        await openUserDetails(id);
      }
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
            <p className="text-sm text-slate-500">Total Clients</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{clientStats.total}</p>
          </article>
          <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Active Clients</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-700">{clientStats.active}</p>
          </article>
          <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Inactive Clients</p>
            <p className="mt-2 text-3xl font-semibold text-amber-700">{clientStats.inactive}</p>
          </article>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Client Management</h1>
              <p className="text-sm text-slate-500">Use View to inspect the complete account details, address, and order history for a client.</p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-700"><Users className="h-5 w-5" /></div>
          </div>

          {error ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-700" /></div>
          ) : (
            <div className="space-y-4">
              {clients.length ? clients.map((user: User) => (
                <article key={user.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-slate-100 p-3 text-slate-700"><Shield className="h-5 w-5" /></div>
                      <div>
                        <h2 className="font-semibold text-slate-900">{user.name}</h2>
                        <p className="text-sm text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Registered: {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => void openUserDetails(user.id)} className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                    <button onClick={() => toggleUser(user.id, Boolean(user.is_active))} className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                      {user.is_active ? <ToggleRight className="h-5 w-5 text-emerald-600" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
                      {user.is_active ? 'Set inactive' : 'Set active'}
                    </button>
                  </div>
                </article>
              )) : <p className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">No clients found.</p>}
            </div>
          )}
        </section>
      </div>

      {selectedUserId ? (
        <UserDetailsModal
          data={userDetails}
          loading={detailsLoading}
          error={detailsError}
          onClose={() => {
            setSelectedUserId(null);
            setUserDetails(null);
            setDetailsError('');
          }}
        />
      ) : null}
    </DashboardLayout>
  );
}
