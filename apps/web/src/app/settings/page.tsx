'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { SettingsShell } from '@/components/dashboard/settings-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Organization } from '@scorra/types';
import { useOrganizations, useUpdateOrganization, useMembers } from '@/hooks/use-organization';
import { useAuthStore } from '@/store/auth-store';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { formatNumber } from '@/lib/utils';
import { isOrgAdmin } from '@/lib/permissions';

function windowLocationOrigin(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

const TIMEZONES = [
  'UTC-08:00 · Pacific Time',
  'UTC-05:00 · Eastern Time',
  'UTC+00:00 · GMT',
  'UTC+01:00 · Lagos / WAT',
];

const DATE_FORMATS = ['MMM D, YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];

function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function prettyPlan(plan: string | null | undefined): string {
  switch (plan) {
    case 'ENTERPRISE':
      return 'Enterprise plan';
    case 'PRO':
      return 'Growth plan';
    case 'STARTER':
      return 'Starter plan';
    default:
      return 'Free plan';
  }
}

export default function SettingsOrgPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAdmin = isOrgAdmin(user);
  const { data: orgs, isPending: loadingOrgs } = useOrganizations();
  const org = orgs?.[0] ?? null;
  const { data: members } = useMembers(org?.id ?? '');
  const updateOrg = useUpdateOrganization(org?.id ?? '');

  const [saved, setSaved] = useState(false);

  useAuthGuard();

  const sub = org ? org.name.toUpperCase() : '…';

  if (!isAdmin) {
    return (
      <SettingsShell sub={sub}>
        <div className="space-y-5">
          <div className="rounded-2xl border border-ink-200 bg-white p-6 md:p-7">
            <h2 className="text-[16px] text-ink">{org?.name ?? 'Organization'}</h2>
            <p className="mt-0.5 text-[12.5px] text-ink-500">
              You are a member of this organization.
            </p>
            <div className="mt-5 max-w-md space-y-3">
              <div className="flex justify-between border-b border-ink-100 pb-2.5">
                <span className="text-[13px] text-ink-500">Plan</span>
                <span className="font-mono text-[13px] text-ink">{org?.plan ?? 'FREE'}</span>
              </div>
              <div className="flex justify-between border-b border-ink-100 pb-2.5">
                <span className="text-[13px] text-ink-500">Members</span>
                <span className="font-mono text-[13px] text-ink">{members?.length ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[13px] text-ink-500">Your role</span>
                <span className="font-mono text-[13px] text-ink">{user?.role ?? '—'}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white p-6 md:p-7">
            <h2 className="text-[16px] text-ink">My account</h2>
            <p className="mt-0.5 text-[12.5px] text-ink-500">Your personal account details.</p>
            <div className="mt-5 max-w-md space-y-4">
              <div>
                <span className="mb-1.5 block text-[12.5px] font-semibold text-gray-800">Name</span>
                <Input value={user?.name ?? ''} disabled />
              </div>
              <div>
                <span className="mb-1.5 block text-[12.5px] font-semibold text-gray-800">
                  Email
                </span>
                <Input value={user?.email ?? ''} disabled />
              </div>
            </div>
          </div>
        </div>
      </SettingsShell>
    );
  }

  return (
    <SettingsShell sub={sub}>
      {loadingOrgs ? (
        <p className="text-sm text-ink-500">Loading…</p>
      ) : !org ? (
        <p className="text-sm text-ink-500">No organization found.</p>
      ) : (
        <div className="space-y-5">
          <OrgProfileCard
            org={org}
            onSaved={() => {
              setSaved(true);
              setTimeout(() => setSaved(false), 2000);
            }}
            saved={saved}
            saving={updateOrg.isPending}
            onSave={(data) => updateOrg.mutateAsync(data)}
          />
          <PlanAndCard org={org} memberCount={members?.length ?? org._count?.members ?? 0} />
          {/* <DangerZone /> */}
        </div>
      )}
    </SettingsShell>
  );
}

function OrgProfileCard({
  org,
  onSaved,
  saved,
  saving,
  onSave,
}: {
  org: Organization;
  onSaved: () => void;
  saved: boolean;
  saving: boolean;
  onSave: (data: Record<string, unknown>) => Promise<unknown>;
}) {
  const [name, setName] = useState(() => org.name);
  const [slug, setSlug] = useState(() => org.slug);
  const [timezone, setTimezone] = useState<string>(() => org.settings?.timezone ?? TIMEZONES[0]);
  const [dateFormat, setDateFormat] = useState<string>(
    () => org.settings?.dateFormat ?? DATE_FORMATS[0],
  );

  const dirty =
    name !== org.name ||
    slug !== org.slug ||
    timezone !== (org.settings?.timezone ?? TIMEZONES[0]) ||
    dateFormat !== (org.settings?.dateFormat ?? DATE_FORMATS[0]);

  const handleSave = async () => {
    try {
      await onSave({
        name,
        slug,
        settings: {
          ...(org.settings ?? {}),
          timezone,
          dateFormat,
        },
      });
      onSaved();
    } catch {
      // keep state, let user retry
    }
  };

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-6 md:p-7">
      <div className="mb-1">
        <h2 className="text-[16px] text-ink">Org profile</h2>
        <p className="mt-0.5 text-[12.5px] text-ink-500">
          Basic information about your organization, visible to all members.
        </p>
      </div>

      <div className="mt-5 flex items-center gap-4 border-b border-ink-100 pb-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-[14px] bg-ink font-display text-[22px] font-bold text-white">
          {initials(org.name)}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" title="Not available yet">
            Upload logo
          </Button>
          <Button type="button" variant="ghost" size="sm" title="Not available yet">
            Remove
          </Button>
        </div>
      </div>

      <div className="mt-5 max-w-md space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-semibold text-gray-800">
            Organization name
          </span>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <div>
          <span className="mb-1.5 block text-[12.5px] font-semibold text-gray-800">
            Organization URL
          </span>
          <div className="flex h-11 items-center overflow-hidden rounded-sm border border-ink-300">
            <span className="flex items-center self-stretch border-r border-ink-300 bg-paper px-3 font-mono text-[13px] text-ink-500">
              {windowLocationOrigin()}/org/
            </span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="h-full flex-1 bg-white px-3 font-mono text-[13px] text-ink focus:outline-none"
            />
          </div>
          <p className="mt-1.5 font-mono text-[11.5px] text-ink-400">
            Changing this will break existing invite links
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold text-gray-800">Timezone</span>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="h-11 w-full rounded-sm border border-ink-300 bg-white px-3 text-sm text-ink focus:outline-2 focus:outline-offset-1 focus:outline-ink"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold text-gray-800">
              Date format
            </span>
            <select
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              className="h-11 w-full rounded-sm border border-ink-300 bg-white px-3 text-sm text-ink focus:outline-2 focus:outline-offset-1 focus:outline-ink"
            >
              {DATE_FORMATS.map((df) => (
                <option key={df} value={df}>
                  {df}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-ink-100 pt-5">
        <p className="mr-auto font-mono text-[12px] text-ink-500">{saved ? 'Saved.' : ''}</p>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setName(org.name);
            setSlug(org.slug);
            setTimezone(org.settings?.timezone ?? TIMEZONES[0]);
            setDateFormat(org.settings?.dateFormat ?? DATE_FORMATS[0]);
          }}
        >
          Cancel
        </Button>
        <Button type="button" disabled={!dirty || saving} onClick={handleSave}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}

function PlanAndCard({ org, memberCount }: { org: Organization; memberCount: number }) {
  const settings = org.settings;
  const datasetCount = org._count?.datasets ?? 0;
  const maxEv = settings?.maxEvaluators ?? 0;
  const maxDm = settings?.maxDatasetsPerMonth ?? 0;
  const evPct = maxEv ? Math.min(100, (memberCount / maxEv) * 100) : 0;
  const dmPct = maxDm ? Math.min(100, (datasetCount / maxDm) * 100) : 0;

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-6 md:p-7">
      <div className="mb-1">
        <h2 className="text-[16px] text-ink">Plan &amp; usage</h2>
        <p className="mt-0.5 text-[12.5px] text-ink-500">Current subscription and seat usage.</p>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-md border border-ink-200 bg-paper px-4 py-4">
        <div>
          <div className="text-[14px] font-semibold text-ink">{prettyPlan(org.plan)}</div>
          <div className="mt-0.5 font-mono text-[11.5px] text-ink-500">Current plan</div>
        </div>
        <span className="rounded-full bg-ink px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-white">
          Active
        </span>
      </div>

      <div className="mt-5 space-y-4">
        <UsageRow
          label="Evaluators"
          value={memberCount}
          limit={maxEv ? formatNumber(maxEv) : 'Unlimited'}
          pct={evPct}
        />
        <UsageRow
          label="Datasets"
          value={datasetCount}
          limit={maxDm ? formatNumber(maxDm) : 'Unlimited'}
          pct={dmPct}
        />
      </div>
    </div>
  );
}

/*
function DangerZone() {
  return (
    <div className="rounded-2xl border border-ink-800 bg-white p-6 md:p-7">
      <div className="mb-1">
        <h2 className="text-[16px] text-ink">Danger zone</h2>
        <p className="mt-0.5 text-[12.5px] text-ink-500">These actions are irreversible — proceed carefully.</p>
      </div>

      <div className="mt-4 divide-y divide-ink-100">
        <DangerRow
          title="Transfer ownership"
          desc="Make another Org Admin the primary owner of this workspace."
          action={
            <Button type="button" variant="ghost" title="Not available yet">
              Transfer
            </Button>
          }
        />
        <DangerRow
          title="Delete organization"
          desc="Permanently deletes all datasets, tasks, evaluations, and members."
          action={
            <Button
              type="button"
              variant="ghost"
              className="border-ink text-ink hover:bg-ink hover:text-white"
              title="Not available yet"
            >
              Delete org
            </Button>
          }
        />
      </div>
    </div>
  );
}
*/

function UsageRow({
  label,
  value,
  limit,
  pct,
}: {
  label: string;
  value: number;
  limit: string;
  pct: number;
}) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between font-mono text-[12px] text-ink-500">
        <span>{label}</span>
        <span>
          {formatNumber(value)} / {limit}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
        <div className="h-full rounded-full bg-ink" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/*
function DangerRow({
  title,
  desc,
  action,
}: {
  title: string;
  desc: string;
  action: React.ReactNode;
}) {
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
