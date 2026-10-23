'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminMediaUploadPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-slate-500">
      <p>Redirecting to Admin Dashboard...</p>
    </div>
  );
}
