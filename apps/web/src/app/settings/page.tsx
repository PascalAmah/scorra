'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Member {
  id: string;
  role: string;
  joinedAt: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null; status: string };
}

interface Org {
  id: string;
  name: string;
  slug: string;
  plan: string;
  _count?: { members: number; datasets: number; tasks: number };
}

export default function SettingsPage() {
  const router = useRouter();
  const [org, setOrg] = useState<Org | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('EVALUATOR');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const orgs = (await api.getOrganizations()) as Org[];
      if (orgs.length > 0) {
        setOrg(orgs[0]);
        const m = (await api.getMembers(orgs[0].id)) as Member[];
        setMembers(m);
      }
    } catch (err) {
      console.error('Failed to fetch org data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!api.isAuthenticated) { router.replace('/login'); return; }
    fetchData();
  }, [fetchData, router]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org || !inviteEmail) return;
    setInviting(true);
    setInviteMsg('');
    try {
      await api.inviteMember(org.id, { email: inviteEmail, role: inviteRole });
      setInviteMsg('Invitation sent!');
      setInviteEmail('');
    } catch (err) {
      setInviteMsg(err instanceof Error ? err.message : 'Failed to invite');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (userId: string, name: string) => {
    if (!org || !confirm(`Remove ${name} from the organization?`)) return;
    try {
      await api.removeMember(org.id, userId);
      setMembers((prev) => prev.filter((m) => m.user.id !== userId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove');
    }
  };

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><p className="text-zinc-400">Loading...</p></div>;
  if (!org) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><p className="text-zinc-400">No organization found</p></div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/dashboard')} className="text-zinc-400 hover:text-white text-sm">← Dashboard</button>
        <h1 className="text-lg font-bold">Settings</h1>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Org Info */}
        <section>
          <h2 className="text-sm font-medium text-zinc-400 mb-3">Organization</h2>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
            <div className="flex justify-between"><span className="text-zinc-500">Name</span><span>{org.name}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Slug</span><span className="text-zinc-400">{org.slug}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Plan</span><span className="text-zinc-300">{org.plan}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Members</span><span>{org._count?.members ?? members.length}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Datasets</span><span>{org._count?.datasets ?? '-'}</span></div>
          </div>
        </section>

        {/* Members */}
        <section>
          <h2 className="text-sm font-medium text-zinc-400 mb-3">Members ({members.length})</h2>
          <div className="space-y-1">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-2.5">
                <div>
                  <span className="text-sm">{m.user.name}</span>
                  <span className="text-xs text-zinc-500 ml-2">{m.user.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${m.role === 'ORG_ADMIN' ? 'bg-white/10 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                    {m.role}
                  </span>
                  {m.role !== 'ORG_ADMIN' && (
                    <button onClick={() => handleRemove(m.user.id, m.user.name)} className="text-xs text-red-400 hover:text-red-300">
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Invite */}
        <section>
          <h2 className="text-sm font-medium text-zinc-400 mb-3">Invite Member</h2>
          <form onSubmit={handleInvite} className="flex gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              placeholder="email@example.com"
              className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm focus:outline-none"
            >
              <option value="EVALUATOR">Evaluator</option>
              <option value="ORG_ADMIN">Admin</option>
              <option value="VIEWER">Viewer</option>
            </select>
            <button type="submit" disabled={inviting || !inviteEmail} className="rounded-lg bg-white text-black px-4 py-2 text-sm font-medium hover:bg-zinc-200 disabled:opacity-50">
              {inviting ? 'Sending...' : 'Invite'}
            </button>
          </form>
          {inviteMsg && <p className={`text-sm mt-2 ${inviteMsg.includes('sent') ? 'text-emerald-400' : 'text-red-400'}`}>{inviteMsg}</p>}
        </section>
      </main>
    </div>
  );
}
