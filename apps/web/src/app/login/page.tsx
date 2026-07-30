'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900 p-8">
        <h1 className="mb-2 text-2xl font-bold text-white">Scorra</h1>
        <p className="mb-6 text-sm text-zinc-400">Sign in to your account</p>

        {error && (
          <div className="mb-4 rounded-md bg-red-900/30 border border-red-800 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white text-sm placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
              placeholder="admin@scorra.dev"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white text-sm placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
              placeholder="password123"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-500">
          Don&apos;t have an account?{' '}
          <a href="/register" className="text-zinc-300 hover:text-white underline">
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}
