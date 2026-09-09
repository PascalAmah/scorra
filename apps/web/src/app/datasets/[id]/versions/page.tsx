'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Download01Icon } from 'hugeicons-react';

import { AppShell } from '@/components/dashboard/shell';
import { DatasetHeader } from '@/components/datasets/dataset-header';
import { Button } from '@/components/ui/button';
import {
  useDataset,
  useDatasetVersionDiff,
  useDatasetVersions,
} from '@/hooks/use-datasets';
import { api } from '@/lib/api';
import type { Dataset } from '@scorra/types';
import { cn, formatDate, formatNumber } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  ADDED: 'border-green-700/30 bg-green-50 text-green-700',
  REMOVED: 'border-red-700/30 bg-red-50 text-red-700',
  MODIFIED: 'border-amber-700/30 bg-amber-50 text-amber-700',
};

export default function DatasetVersionsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [baseVersion, setBaseVersion] = useState<number | null>(null);

  const { data: datasetData, isPending } = useDataset(id);
  const dataset = datasetData as Dataset | undefined;

  const { data: versionsData } = useDatasetVersions(id);
  const versions = versionsData ?? [];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!api.isAuthenticated) {
      router.replace('/login');
    }
  }, [router]);

  const currentVersion = dataset?.version ?? versions[0]?.version ?? null;
  const effectiveBase = baseVersion ?? versions[versions.length - 1]?.version ?? null;

  const { data: diff, isPending: diffLoading } = useDatasetVersionDiff(
    id,
    effectiveBase ?? undefined,
    currentVersion ?? undefined,
  );

  if (isPending || !dataset) {
    return (
      <AppShell>
        <div className="flex h-[60vh] items-center justify-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">Loading…</p>
        </div>
      </AppShell>
    );
  }

  const hasChanges =
    diff && diff.addedCount + diff.removedCount + diff.modifiedCount > 0;

  return (
    <AppShell>
      <DatasetHeader
        dataset={dataset}
        activeTab="versions"
        meta={[
          { label: 'Rows', value: formatNumber(dataset.rowCount) },
          { label: 'Versions', value: formatNumber(versions.length) },
          { label: 'Format', value: dataset.format },
          { label: 'Created', value: formatDate(dataset.createdAt) },
        ]}
        actions={
          <>
            <Button variant="ghost" disabled title="Diff export isn't available yet">
              <Download01Icon size={14} />
              Export diff
            </Button>
            <Button asChild>
              <Link href={`/datasets/new?datasetId=${dataset.id}`}>Import new version</Link>
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-5 px-5 pb-14 pt-6 md:px-9 lg:grid-cols-[280px_1fr]">
        <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
          {versions.length === 0 ? (
            <p className="px-6 py-12 text-center font-mono text-[11.5px] text-ink-400">
              No versions recorded yet.
            </p>
          ) : (
            versions.map((v) => {
              const isCurrent = v.version === currentVersion;
              const isBase = v.version === effectiveBase;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setBaseVersion(v.version)}
                  className={cn(
                    'flex w-full items-start gap-3 border-b border-ink-100 px-4.5 py-4 text-left transition-colors last:border-b-0',
                    isBase ? 'bg-paper' : 'hover:bg-paper',
                  )}
                >
                  <span
                    className={cn(
                      'mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-2',
                      isBase ? 'border-ink bg-ink' : 'border-ink-300 bg-white',
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[13px] font-semibold text-ink">
                        v{v.version}
                      </span>
                      {isCurrent && (
                        <span className="rounded-full border border-ink-600 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-500">
                          Current
                        </span>
                      )}
                      {isBase && (
                        <span className="rounded-full border border-ink-300 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-500">
                          Base
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-[11.5px] leading-snug text-ink-500">
                      {v.changelog ?? `${formatNumber(v.rowCount)} rows`}
                    </span>
                    <span className="mt-1.5 block font-mono text-[10.5px] text-ink-400">
                      {formatDate(v.createdAt)}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="min-w-0">
          <div className="overflow-x-auto rounded-2xl border border-ink-200 bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <select
                value={effectiveBase ?? ''}
                onChange={(e) => setBaseVersion(Number(e.target.value))}
                disabled={versions.length < 2}
                className="rounded-sm border border-ink-300 bg-paper px-3 py-2 font-mono text-[12.5px] outline-none focus:border-ink disabled:opacity-50"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.version}>
                    v{v.version} · {formatDate(v.createdAt)}
                  </option>
                ))}
              </select>
              <span className="text-ink-400">→</span>
              <select
                value={currentVersion ?? ''}
                disabled
                className="rounded-sm border border-ink-300 bg-paper px-3 py-2 font-mono text-[12.5px] outline-none focus:border-ink disabled:opacity-50"
              >
                <option value={currentVersion ?? ''}>
                  v{currentVersion} ·{' '}
                  {formatDate(
                    versions.find((v) => v.version === currentVersion)?.createdAt ??
                      dataset.createdAt,
                  )}
                </option>
              </select>
            </div>

            <div className="flex flex-wrap gap-5">
              {[
                { label: 'rows added', count: diff?.addedCount ?? null, swatch: 'bg-ink' },
                {
                  label: 'rows removed',
                  count: diff?.removedCount ?? null,
                  swatch: 'bg-ink-200 border border-ink-400',
                },
                {
                  label: 'rows modified',
                  count: diff?.modifiedCount ?? null,
                  swatch: 'bg-white border-[1.5px] border-ink',
                },
              ].map((s) => (
                <span key={s.label} className="flex items-center gap-2 text-[13px] text-ink-500">
                  <span className={cn('h-4 w-4 rounded-sm', s.swatch)} />
                  <b className="font-mono text-ink">{s.count === null ? '—' : s.count}</b> {s.label}
                </span>
              ))}
            </div>
          </div>

          {versions.length < 2 ? (
            <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center">
              <p className="mb-2 font-mono text-[11.5px] uppercase tracking-[0.08em] text-ink-400">
                Nothing to compare yet
              </p>
              <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-ink-500">
                Import a new version to compare changes between versions.
              </p>
            </div>
          ) : diffLoading ? (
            <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center">
              <p className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-ink-400">
                Loading diff…
              </p>
            </div>
          ) : !diff ? (
            <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center">
              <p className="mb-2 font-mono text-[11.5px] uppercase tracking-[0.08em] text-ink-400">
                v{effectiveBase} → v{currentVersion}
              </p>
              <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-ink-500">
                Select two different versions to compare.
              </p>
            </div>
          ) : !hasChanges ? (
            <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center">
              <p className="mb-2 font-mono text-[11.5px] uppercase tracking-[0.08em] text-ink-400">
                v{effectiveBase} → v{currentVersion}
              </p>
              <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-ink-500">
                No differences between these versions.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
              <div className="border-b border-ink-200 bg-paper px-5 py-3.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-ink-500">
                Changed rows · v{effectiveBase} → v{currentVersion}
              </div>
              <ul className="divide-y divide-ink-100">
                {diff.rows.map((row) => (
                  <li key={`${row.status}-${row.rowIndex}`} className="flex items-start gap-3 px-5 py-3.5">
                    <span
                      className={cn(
                        'mt-0.5 shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider',
                        STATUS_STYLES[row.status],
                      )}
                    >
                      {row.status}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-ink-400">
                      #{row.rowIndex}
                    </span>
                    <span className="line-clamp-1 min-w-0 flex-1 text-[13px] text-ink">
                      {row.prompt}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}