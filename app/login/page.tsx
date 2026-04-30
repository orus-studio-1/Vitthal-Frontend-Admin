'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe,transparent_35%),linear-gradient(180deg,#eff6ff,#f8fafc)] px-4 py-12">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="hidden rounded-[2rem] bg-[linear-gradient(180deg,#1d4ed8,#1e3a8a)] p-10 text-white shadow-2xl lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-blue-200">MTWO</p>
            <h1 className="mt-6 max-w-md text-5xl font-semibold leading-tight">
              Admin control for products, vendors, orders, payroll, and analytics.
            </h1>
            <p className="mt-6 max-w-lg text-base text-blue-100">
              This console is now aligned with your admin backend so the core operations flow can run from one place.
            </p>
          </div>
          <div className="grid gap-4 text-sm text-blue-100 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">Live dashboard totals and recent orders</div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">Vendor, product, user, and order workflows</div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl sm:p-10">
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-2xl bg-blue-700 p-3 text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Sign in to admin</h2>
              <p className="text-sm text-slate-500">Use your admin or super admin credentials.</p>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="form-label">Email address</label>
              <input
                id="email"
                type="email"
                required
                className="form-input"
                placeholder="admin@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="form-input pr-12"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? 'Signing in...' : 'Open admin dashboard'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
