'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../lib/auth-context';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    router.replace(isAuthenticated ? '/dashboard' : '/login');
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-700">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-blue-700" />
        Redirecting to the admin workspace...
      </div>
    </div>
  );
}
