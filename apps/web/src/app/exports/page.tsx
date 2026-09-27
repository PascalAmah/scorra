'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AppShell } from '@/components/dashboard/shell';
import { Topbar } from '@/components/dashboard/topbar';
import { Button } from '@/components/ui/button';
import { SearchFilterBar } from '@/components/ui/search-filter-bar';
import { useTasks } from '@/hooks/use-tasks';
import { useExports, useRequestExport } from '@/hooks/use-exports';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { api } from '@/lib/api';
import { cn, formatBytes, formatNumber, formatRelativeTime } from '@/lib/utils';

const FORMATS = ['JSONL', 'CSV', 'JSON'] as const;
const DATE_RANGES = ['All time', 'Last 7 days', 'Last 30 days', 'Custom range'] as const;
const STATUS_FILTERS = ['All', 'Ready', 'Processing', 'Failed'] as const;

const STATUS_VARIANTS: Record<string, { label: string; dot?: boolean; className: string }> = {
  READY: { label: 'Ready', dot: true, className: 'border-ink bg-ink text-white' },
  PROCESSING: { label: 'Processing', dot: true, className: 'border-ink-500 text-ink-500' },
  PENDING: { label: 'Pending', dot: true, className: 'border-ink-500 text-ink-500' },
  FAILED: { label: 'Failed', className: 'border-ink-300 text-ink-500' },
};

export default function ExportsPage() {
  const router = useRouter();
  const { data: tasksData } = useTasks({ page: 1, limit: 100 });
  const tasks = useMemo(() => tasksData?.data ?? [], [tasksData]);

  const { data: exports, isPending: loading } = useExports();
  const list = useMemo(() => exports ?? [], [exports]);

  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>('All');

  const [source, setSource] = useState('');
  const [format, setFormat] = useState<(typeof FORMATS)[number]>('JSONL');
  const [dateRange, setDateRange] = useState<(typeof DATE_RANGES)[number]>('All time');
  const [binding, setBinding] = useState<string[]>(['aiJudge', 'notes']);

  const requestExport = useRequestExport();
  const [error, setError] = useState<string | null>(null);

  useAuthGuard();

  const readyCount = useMemo(() => list.filter((e) => e.status === 'READY').length, [list]);

  const visible = useMemo(() => {
    let filtered = list;
    if (filter !== 'All') {
      const status = filter.toUpperCase();
      filtered = filtered.filter((e) => e.status === status);
    }
    if (appliedSearch) {
      const q = appliedSearch.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          (e.task?.name ?? '').toLowerCase().includes(q) ||
          e.format.toLowerCase().includes(q) ||
          (e.requestedBy?.name ?? '').toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [list, filter, appliedSearch]);

  const handleGenerate = async () => {
    if (!source) {
      setError('Select a task to export.');
      return;
    }
    setError(null);
    try {
      const filters: Record<string, unknown> = {
        includeAiJudge: binding.includes('aiJudge'),
        includeNotes: binding.includes('notes'),
        disagreementsOnly: binding.includes('disagreements'),
        flaggedOnly: binding.includes('flagged'),
        dateRange,
      };
      await requestExport.mutateAsync({ taskId: source, format, filters });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request export');
    }
  };

  const handleDownload = async (id: string) => {
    try {
      await api.downloadExport(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Download failed');
    }
  };

  return (
    <AppShell>
      <Topbar
        title="Exports"
        sub={`${formatNumber(list.length)} EXPORTS · ${formatNumber(readyCount)} READY`}
      />

      <div className="px-5 pb-14 pt-7 md:px-9">
        <section className="relative mb-5 overflow-hidden rounded-2xl bg-ink p-6 text-white md:p-7">
          <h3 className="text-[15px]">New export</h3>
          <p className="mt-1 mb-5 text-[12px] text-ink-400">
            Pull evaluations, comparisons, or rankings from a task into a portable file.
          </p>

          <div className="relative z-10 grid items-end gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto]">
            <Field label="Source">
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full rounded-sm border border-ink-600 bg-ink-800 px-3 py-2.5 text-[13px] text-white outline-none"
              >
                <option value="">Select a task…</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Format">
              <div className="flex gap-1.5">
                {FORMATS.map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormat(fmt)}
                    className={cn(
                      'flex-1 rounded-sm border border-ink-600 px-2 py-2.5 font-mono text-[11.5px] transition-colors',
                      format === fmt
                        ? 'border-white bg-white text-ink'
                        : 'text-ink-400 hover:text-white',
                    )}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Date range">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as (typeof DATE_RANGES)[number])}
                className="w-full rounded-sm border border-ink-600 bg-ink-800 px-3 py-2.5 text-[13px] text-white outline-none"
              >
                {DATE_RANGES.map((range) => (
                  <option key={range} value={range}>
                    {range}
                  </option>
                ))}
              </select>
            </Field>

            <Button
              variant="inverse"
              onClick={() => void handleGenerate()}
              disabled={requestExport.isPending}
            >
              {requestExport.isPending ? 'Generating…' : 'Generate export'}
            </Button>
          </div>

          <div className="relative z-10 mt-4 flex flex-wrap gap-2">
            {bindingOptions.map((option) => {
              const active = binding.includes(option.key);
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() =>
                    setBinding((prev) =>
                      active ? prev.filter((k) => k !== option.key) : [...prev, option.key],
                    )
                  }
                  className={cn(
                    'rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.04em] transition-colors',
                    active
                      ? 'border-white bg-white text-ink'
                      : 'border-ink-600 text-ink-400 hover:text-white',
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {error && (
            <p className="relative z-10 mt-4 font-mono text-[11.5px] text-red-300">{error}</p>
          )}
        </section>

        <SearchFilterBar
          placeholder="Search exports…"
          searchValue={search}
          onSearchChange={(v) => setSearch(v)}
          onSearchSubmit={() => setAppliedSearch(search.trim())}
          filters={STATUS_FILTERS}
          activeFilter={filter}
          onFilterChange={setFilter}
        />

        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-ink-200 bg-white py-20">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
              Loading…
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-ink-200 bg-white px-8 py-16 text-center">
            <p className="mb-2 text-[15px] font-semibold text-ink">No exports yet</p>
            <p className="text-[13px] text-ink-500">
              Exports are generated from completed evaluation tasks.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-ink-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13.5px] min-w-[640px]">
                <thead>
                  <tr className="border-b border-ink-200 bg-paper text-left font-mono text-[10.5px] uppercase tracking-[0.06em] text-ink-500">
                    <th className="px-5 py-3.5">Export</th>
                    <th className="px-5 py-3.5">Format</th>
                    <th className="px-5 py-3.5">Size</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Requested by</th>
                    <th className="px-5 py-3.5">Created</th>
                    <th className="px-5 py-3.5 text-right" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((exp) => {
                    const variant = STATUS_VARIANTS[exp.status] ?? STATUS_VARIANTS.PENDING;
                    return (
                      <tr
                        key={exp.id}
                        className="border-b border-ink-100 last:border-b-0 hover:bg-paper"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-ink-200 bg-paper">
                              <FileExportIcon status={exp.status} />
                            </span>
                            <div>
                              <p className="font-semibold text-ink">
                                {exp.task?.name || 'Untitled export'}
                              </p>
                              <p className="font-mono text-[10.5px] text-ink-500">
                                {exp.filters && Object.keys(exp.filters).length > 0
                                  ? 'filtered export'
                                  : 'full export'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-sm border border-ink-200 bg-paper px-2 py-1 font-mono text-[10.5px] text-ink-600">
                            {exp.format}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono text-[12.5px] text-ink-500">
                          {exp.fileSize != null ? formatBytes(exp.fileSize) : '—'}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full border px-[11px] py-[5px] font-mono text-[11px] uppercase tracking-[0.05em]',
                              variant.className,
                            )}
                          >
                            {variant.dot && (
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            )}
                            {variant.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono text-[12.5px] text-ink-500">
                          {exp.requestedBy?.name ?? '—'}
                        </td>
                        <td className="px-5 py-4 font-mono text-[12.5px] text-ink-500">
                          {formatRelativeTime(exp.createdAt)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {exp.status === 'READY' ? (
                            <button
                              onClick={() => void handleDownload(exp.id)}
                              className="rounded-sm border border-ink-300 px-3 py-1.5 text-[12px] font-semibold text-ink transition-colors hover:border-ink-600"
                            >
                              Download
                            </button>
                          ) : exp.status === 'FAILED' ? (
                            <span className="font-mono text-[11px] uppercase text-ink-400">
                              Failed
                            </span>
                          ) : (
                            <span className="font-mono text-[11px] uppercase text-ink-400">
                              {exp.status === 'PROCESSING' ? 'Processing' : 'Pending'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.06em] text-ink-400">
        {label}
      </label>
      {children}
    </div>
  );
}

const bindingOptions = [
  { key: 'aiJudge', label: 'Include AI Judge' },
  { key: 'notes', label: 'Include notes' },
  { key: 'disagreements', label: 'Disagreements only' },
  { key: 'flagged', label: 'Flagged only' },
] as const;

function FileExportIcon({ status }: { status: string }) {
  const active = status === 'READY';
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 4L20 8V16L12 20L4 16V8L12 4Z"
        stroke={active ? 'var(--color-ink)' : 'var(--color-ink-400)'}
        strokeWidth="2"
      />
    </svg>
  );
}
