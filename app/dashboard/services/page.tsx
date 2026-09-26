'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ServicesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/services/catalog');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm font-medium text-slate-300">
          Redirecting to Service Categories & Dynamic Form Builder...
        </p>
      </div>
    </div>
  );
}
