'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AuthTokenPayload } from '@scorra/types';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthTokenPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!api.isAuthenticated) {
      router.replace('/login');
      return;
    }

    api.me()
      .then(setUser)
      .catch(() => {
        router.replace('/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await api.logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">Scorra</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-400">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-zinc-400 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold mb-2">Welcome{user?.email ? `, ${user.email}` : ''}</h2>
        <p className="text-zinc-400 mb-8">Your AI quality dashboard</p>

        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/datasets"
            className="rounded-lg border border-zinc-800 p-6 hover:border-zinc-700 transition-colors"
          >
            <h3 className="font-semibold mb-1">Datasets</h3>
            <p className="text-sm text-zinc-400">Upload and manage evaluation datasets</p>
          </Link>
          <Link
            href="/evaluations"
            className="rounded-lg border border-zinc-800 p-6 hover:border-zinc-700 transition-colors"
          >
            <h3 className="font-semibold mb-1">Evaluations</h3>
            <p className="text-sm text-zinc-400">View tasks and evaluate responses</p>
          </Link>
          <Link
            href="/analytics"
            className="rounded-lg border border-zinc-800 p-6 hover:border-zinc-700 transition-colors"
          >
            <h3 className="font-semibold mb-1">Analytics</h3>
            <p className="text-sm text-zinc-400">Quality trends and metrics</p>
          </Link>
          <Link
            href="/settings"
            className="rounded-lg border border-zinc-800 p-6 hover:border-zinc-700 transition-colors"
          >
            <h3 className="font-semibold mb-1">Settings</h3>
            <p className="text-sm text-zinc-400">Manage team and organization</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
