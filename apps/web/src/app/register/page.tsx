'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.register({
        email,
        password,
        name,
        organizationName: orgName || undefined,
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900 p-8">
        <h1 className="mb-2 text-2xl font-bold text-white">Create your account</h1>
        <p className="mb-6 text-sm text-zinc-400">Start evaluating AI quality</p>

        {error && (
          <div className="mb-4 rounded-md bg-red-900/30 border border-red-800 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white text-sm placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
              placeholder="Alice Admin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white text-sm placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
              placeholder="alice@example.com"
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
              placeholder="Min 6 characters"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Organization name <span className="text-zinc-600">(optional)</span>
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white text-sm placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
              placeholder="My AI Team"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-500">
          Already have an account?{' '}
          <a href="/login" className="text-zinc-300 hover:text-white underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
