'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/sidebar';
import { getStoredToken } from '../../lib/auth';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
