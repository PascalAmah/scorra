'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { SettingsShell } from '@/components/dashboard/settings-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { User } from '@scorra/types';
import { useOrganizations } from '@/hooks/use-organization';
import { useChangePassword, useProfile, useUpdateProfile } from '@/hooks/use-profile';
import { api } from '@/lib/api';

function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/*
const NOTIFICATION_DEFAULTS: Record<string, boolean> = {
  taskAssignments: true,
  weeklyDigest: true,
  flaggedItems: false,
  productUpdates: false,
};
*/

export default function SettingsAccountPage() {
  const router = useRouter();

  const { data: user } = useProfile();
  const changePassword = useChangePassword();

  const { data: orgs } = useOrganizations();
  const org = orgs?.[0] ?? null;

  const [cpw, setCpw] = useState('');
  const [npw, setNpw] = useState('');
  const [cnpw, setCnpw] = useState('');
  const [pwMsg, setPwMsg] = useState('');

  /* const [notifs, setNotifs] = useState(NOTIFICATION_DEFAULTS); */

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!api.isAuthenticated) {
      router.replace('/login');
    }
  }, [router]);

  const handleChangePassword = async () => {
    setPwMsg('');
    if (npw !== cnpw) {
      setPwMsg('New passwords do not match.');
      return;
    }
    if (npw.length < 8) {
      setPwMsg('New password must be at least 8 characters.');
      return;
    }
    if (!cpw) {
      setPwMsg('Enter your current password.');
      return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword: cpw, newPassword: npw });
      setPwMsg('Password updated.');
      setCpw('');
      setNpw('');
      setCnpw('');
      setTimeout(() => setPwMsg(''), 2500);
    } catch (err) {
      setPwMsg(err instanceof Error ? err.message : 'Failed to update password');
    }
  };

  /*
  const toggle = (key: keyof typeof NOTIFICATION_DEFAULTS) =>
    setNotifs((prev) => ({ ...prev, [key]: !prev[key] }));
  */

  return (
    <SettingsShell sub="MY ACCOUNT">
      <div className="space-y-5">
        {/* Profile */}
        {user ? <ProfileCard user={user} orgName={org?.name ?? 'your organization'} /> : null}

        {/* Password */}
        <section>
          <div className="rounded-2xl border border-ink-200 bg-white p-6 md:p-7">
            <div className="mb-1">
              <h2 className="text-[16px] text-ink">Password</h2>
              <p className="mt-0.5 text-[12.5px] text-ink-500">
                Choose a strong password you&apos;re not using elsewhere.
              </p>
            </div>

            <div className="mt-5 max-w-md space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-semibold text-gray-800">Current password</span>
                <Input type="password" value={cpw} onChange={(e) => setCpw(e.target.value)} placeholder="••••••••" />
              </label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[12.5px] font-semibold text-gray-800">New password</span>
                  <Input type="password" value={npw} onChange={(e) => setNpw(e.target.value)} placeholder="••••••••" />
                  <span className="mt-1.5 block font-mono text-[11.5px] text-ink-400">
                    Min 8 characters · 1 number · 1 symbol
                  </span>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12.5px] font-semibold text-gray-800">Confirm new password</span>
                  <Input type="password" value={cnpw} onChange={(e) => setCnpw(e.target.value)} placeholder="••••••••" />
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2.5 border-t border-ink-100 pt-5">
              <p className="mr-auto font-mono text-[12px] text-ink-500">{pwMsg}</p>
              <Button type="button" disabled={changePassword.isPending} onClick={handleChangePassword}>
                {changePassword.isPending ? 'Updating…' : 'Update password'}
              </Button>
            </div>
          </div>
        </section>

        {/* Notifications */}
        {/*
        <section>
          <div className="rounded-2xl border border-ink-200 bg-white p-6 md:p-7">
            <div className="mb-1">
              <h2 className="text-[16px] text-ink">Notifications</h2>
              <p className="mt-0.5 text-[12.5px] text-ink-500">Choose what Scorra emails you about.</p>
            </div>

            <div className="mt-4 divide-y divide-ink-100">
              <ToggleRow
                title="Task assignments"
                desc="When you're added as an evaluator on a new task."
                on={notifs.taskAssignments}
                onClick={() => toggle('taskAssignments')}
              />
              <ToggleRow
                title="Weekly digest"
                desc="A summary of your team's evaluation activity every Monday."
                on={notifs.weeklyDigest}
                onClick={() => toggle('weeklyDigest')}
              />
              <ToggleRow
                title="Flagged items"
                desc="When an item you evaluated gets flagged for review."
                on={notifs.flaggedItems}
                onClick={() => toggle('flaggedItems')}
              />
              <ToggleRow
                title="Product updates"
                desc="New features and changes to Scorra."
                on={notifs.productUpdates}
                onClick={() => toggle('productUpdates')}
              />
            </div>
          </div>
        </section>

        <section>
          <div className="rounded-2xl border border-ink-200 bg-white p-6 md:p-7">
            <div className="mb-1">
              <h2 className="text-[16px] text-ink">Active sessions</h2>
              <p className="mt-0.5 text-[12.5px] text-ink-500">Devices currently signed in to your account.</p>
            </div>

            <div className="mt-4 divide-y divide-ink-100">
              <SessionRow title="Chrome on macOS" current="This device" meta="Active now" />
              <SessionRow title="Scorra iOS App" meta="Last active 3 hours ago" />
              <SessionRow title="Firefox on Windows" meta="Last active 6 days ago" />
            </div>

            <div className="mt-6 flex justify-end border-t border-ink-100 pt-5">
              <Button type="button" variant="ghost" title="Not available yet">
                Sign out all other sessions
              </Button>
            </div>
          </div>
        </section>

        <section>
          <div className="rounded-2xl border border-ink-800 bg-white p-6 md:p-7">
            <div className="mb-1">
              <h2 className="text-[16px] text-ink">Danger zone</h2>
              <p className="mt-0.5 text-[12.5px] text-ink-500">These actions are irreversible — proceed carefully.</p>
            </div>

            <div className="mt-4 divide-y divide-ink-100">
              <DangerRow
                title={`Leave ${org?.name ?? 'your organization'}`}
                desc="You'll lose access to all datasets, tasks, and evaluations in this org."
                action={<Button type="button" variant="ghost" title="Not available yet">Leave org</Button>}
              />
              <DangerRow
                title="Delete account"
                desc="Permanently deletes your Scorra account across all organizations."
                action={
                  <Button
                    type="button"
                    variant="ghost"
                    className="border-ink text-ink hover:bg-ink hover:text-white"
                    title="Not available yet"
                  >
                    Delete account
                  </Button>
                }
              />
            </div>
          </div>
        </section>
        */}
      </div>
    </SettingsShell>
  );
}

function ProfileCard({ user, orgName }: { user: User; orgName: string }) {
  const updateProfile = useUpdateProfile();
  const [name, setName] = useState(() => user.name ?? '');
  const [profileMsg, setProfileMsg] = useState('');

  const handleSave = async () => {
    setProfileMsg('');
    try {
      await updateProfile.mutateAsync({ name });
      setProfileMsg('Saved.');
      setTimeout(() => setProfileMsg(''), 2000);
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  return (
    <section>
      <div className="rounded-2xl border border-ink-200 bg-white p-6 md:p-7">
        <div className="mb-1">
          <h2 className="text-[16px] text-ink">Profile</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-500">
            This is how you appear to other members of {orgName}.
          </p>
        </div>

        <div className="mt-5 flex items-center gap-4 border-b border-ink-100 pb-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink font-display text-[22px] font-bold text-white">
            {initials(user.name)}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" title="Not available yet">
              Upload photo
            </Button>
            <Button type="button" variant="ghost" size="sm" title="Not available yet">
              Remove
            </Button>
          </div>
        </div>

        <div className="mt-5 max-w-sm space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold text-gray-800">Full name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <div>
            <span className="mb-1.5 flex items-center text-[12.5px] font-semibold text-gray-800">
              Email
              <span className="ml-2 rounded-full border border-ink-300 px-2 py-px font-mono text-[9.5px] uppercase tracking-wider text-ink-500">
                ✓ Verified
              </span>
            </span>
            <Input value={user.email ?? ''} disabled />
            <p className="mt-1.5 font-mono text-[11.5px] text-ink-400">
              Contact your org admin to change your email
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-ink-100 pt-5">
          <p className="mr-auto font-mono text-[12px] text-ink-500">{profileMsg}</p>
          <Button type="button" variant="ghost" onClick={() => setName(user.name ?? '')}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={updateProfile.isPending || name === (user.name ?? '')}
            onClick={handleSave}
          >
            {updateProfile.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </section>
  );
}

/*
function ToggleRow({ title, desc, on, onClick }: { title: string; desc: string; on: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div>
        <div className="text-[13.5px] font-semibold text-ink">{title}</div>
        <div className="mt-0.5 text-[12px] text-ink-500">{desc}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onClick}
        className={cn(
          'relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors',
          on ? 'bg-ink' : 'bg-ink-300',
        )}
      >
        <span
          className={cn(
            'absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white transition-all',
            on ? 'left-[18px]' : 'left-[2px]',
          )}
        />
      </button>
    </div>
  );
}

function SessionRow({ title, meta, current }: { title: string; meta: string; current?: string }) {
  return (
    <div className="flex items-center gap-3.5 py-3.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-ink-200 bg-paper font-mono text-[11px] text-ink">
        ✓
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
          {title}
          {current && (
            <span className="rounded-full bg-ink px-2 py-px font-mono text-[9px] uppercase text-white">
              {current}
            </span>
          )}
        </div>
        <div className="font-mono text-[11px] text-ink-500">{meta}</div>
      </div>
    </div>
  );
}

function DangerRow({ title, desc, action }: { title: string; desc: string; action: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div>
        <div className="text-[13.5px] font-semibold text-ink">{title}</div>
        <div className="mt-0.5 text-[12px] text-ink-500">{desc}</div>
      </div>
      {action}
    </div>
  );
}
*/