'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArchiveIcon,
  Copy01Icon,
  Delete02Icon,
  Diamond01Icon,
  EyeIcon,
  MoreVerticalIcon,
} from 'hugeicons-react';
import type { Dataset } from '@scorra/types';

import { AppShell } from '@/components/dashboard/shell';
import { Topbar } from '@/components/dashboard/topbar';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import { SearchFilterBar } from '@/components/ui/search-filter-bar';
import { DatasetStatusBadge } from '@/components/datasets/status-badge';
import { UrlImportModal } from '@/components/datasets/url-import-modal';
import {
  useArchiveDataset,
  useCloneDataset,
  useDatasets,
  useDeleteDataset,
} from '@/hooks/use-datasets';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { cn, formatNumber, formatRelativeTime } from '@/lib/utils';

const FILTERS = ['ALL', 'READY', 'PROCESSING', 'FAILED'] as const;

export default function DatasetsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL');
  const [page, setPage] = useState(1);
  const [showUrlImport, setShowUrlImport] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Dataset | null>(null);
  const deleteMutation = useDeleteDataset(deleteTarget?.id ?? '');

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync();
      setDeleteTarget(null);
    } catch {
      setDeleteTarget(null);
    }
  };

  const { data, isPending } = useDatasets({ page, limit: 20, search: search || undefined });
  const datasets = useMemo(() => data?.data ?? [], [data]);
  const pagination = useMemo(() => data?.pagination ?? null, [data]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    useAuthGuard();
  }, [router]);

  const visible = useMemo(
    () => (filter === 'ALL' ? datasets : datasets.filter((d) => d.status === filter)),
    [datasets, filter],
  );

  const totalRows = useMemo(
    () => visible.reduce((sum, d) => sum + (d.rowCount || 0), 0),
    [visible],
  );

  const total = pagination?.total ?? visible.length;

  return (
    <AppShell>
      <Topbar
        title="Datasets"
        sub={`${formatNumber(total)} DATASETS · ${formatNumber(totalRows)} TOTAL ROWS`}
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowUrlImport(true)}>
              Import from URL
            </Button>
            <Button asChild>
              <Link href="/datasets/new">+ New dataset</Link>
            </Button>
          </>
        }
      />

      <div className="px-5 pb-14 pt-6 md:px-9">
        <SearchFilterBar
          placeholder="Search datasets…"
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          filters={FILTERS}
          activeFilter={filter}
          onFilterChange={setFilter}
        />

        <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
          {isPending ? (
            <div className="flex items-center justify-center py-20">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
                Loading…
              </p>
            </div>
          ) : visible.length === 0 ? (
            <div className="px-8 py-16 text-center">
              <p className="mb-2 text-[15px] font-semibold text-ink">
                {datasets.length === 0 ? 'No datasets yet' : 'No datasets match'}
              </p>
              <p className="mb-5 text-[13px] text-ink-500">
                {datasets.length === 0
                  ? 'Create a dataset to start evaluating LLM responses.'
                  : 'Try a different search or filter.'}
              </p>
              {datasets.length === 0 && (
                <Button asChild>
                  <Link href="/datasets/new">+ New dataset</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {['Name', 'Rows', 'Version', 'Status', 'Updated', ''].map((h, i) => (
                      <th
                        key={i}
                        className={cn(
                          'border-b border-ink-200 bg-paper px-5 py-3.5 text-left font-mono text-[10.5px] uppercase tracking-[0.06em] text-ink-500',
                          i === 5 && 'w-8',
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((ds) => (
                    <tr
                      key={ds.id}
                      onClick={() => router.push(`/datasets/${ds.id}`)}
                      className="cursor-pointer transition-colors last:border-b-0 hover:bg-paper"
                    >
                      <td className="border-b border-ink-100 px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-200 bg-paper">
                            <Diamond01Icon size={14} className="text-ink" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[13.5px] font-semibold text-ink">
                              {ds.name}
                            </p>
                            <p className="mt-0.5 truncate font-mono text-[11px] text-ink-500">
                              {[ds.format, ...(ds.tags ?? [])]
                                .slice(0, 3)
                                .join(' · ')
                                .toUpperCase() || ds.description}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="border-b border-ink-100 px-5 py-4 font-mono text-[12.5px] text-ink-500">
                        {ds.rowCount ? formatNumber(ds.rowCount) : '—'}
                      </td>
                      <td className="border-b border-ink-100 px-5 py-4 font-mono text-[12.5px] text-ink-500">
                        v{ds.version}
                      </td>
                      <td className="border-b border-ink-100 px-5 py-4">
                        <DatasetStatusBadge status={ds.status} />
                      </td>
                      <td className="border-b border-ink-100 px-5 py-4 font-mono text-[12.5px] text-ink-500">
                        {formatRelativeTime(ds.updatedAt)}
                      </td>
                      <td className="border-b border-ink-100 px-5 py-4 text-right text-ink-400">
                        <DatasetRowMenu dataset={ds} onDelete={setDeleteTarget} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isPending && pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 font-mono text-[11.5px] text-ink-500">
              <span>
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={!pagination.hasPrev}
                  onClick={() => setPage(pagination.page - 1)}
                  className="h-6.5 w-6.5 rounded-sm border border-ink-300 text-ink-600 transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ←
                </button>
                <span className="px-2 text-[12.5px] text-ink">{pagination.page}</span>
                <button
                  type="button"
                  disabled={!pagination.hasNext}
                  onClick={() => setPage(pagination.page + 1)}
                  className="h-6.5 w-6.5 rounded-sm border border-ink-300 text-ink-600 transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-30"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showUrlImport && (
        <UrlImportModal
          onClose={() => setShowUrlImport(false)}
          onDone={(id) => router.push(`/datasets/${id}`)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          title="Delete dataset?"
          description={
            <>
              <span className="font-semibold text-ink">{deleteTarget.name}</span> will be
              permanently deleted, along with all {formatNumber(deleteTarget.rowCount ?? 0)} rows
              and versions
              {deleteTarget._count?.tasks
                ? `, plus ${formatNumber(deleteTarget._count.tasks)} evaluation ${
                    deleteTarget._count.tasks === 1 ? 'task' : 'tasks'
                  } built on it`
                : ''}
              . This cannot be undone.
            </>
          }
          confirmLabel="Delete dataset"
          destructive
          confirmBusy={deleteMutation.isPending}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </AppShell>
  );
}

function DatasetRowMenu({
  dataset,
  onDelete,
}: {
  dataset: Dataset;
  onDelete: (d: Dataset) => void;
}) {
  const router = useRouter();
  const cloneMutation = useCloneDataset(dataset.id);
  const archiveMutation = useArchiveDataset(dataset.id);

  const handleClone = async () => {
    try {
      const cloned = await cloneMutation.mutateAsync();
      router.push(`/datasets/${cloned.id}`);
    } catch {
      /* surfaced via console in mutations */
    }
  };

  const handleArchive = async () => {
    if (!confirm(`Archive ${dataset.name}?`)) return;
    try {
      await archiveMutation.mutateAsync();
    } catch {
      /* surfaced via console in mutations */
    }
  };

  return (
    <DropdownMenu
      width={160}
      trigger={
        <button
          type="button"
          aria-label="Dataset actions"
          className="flex h-7 w-7 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <MoreVerticalIcon size={16} />
        </button>
      }
      items={[
        {
          key: 'open',
          label: 'Open',
          icon: <EyeIcon size={15} />,
          onSelect: () => router.push(`/datasets/${dataset.id}`),
        },
        {
          key: 'clone',
          label: 'Clone',
          icon: <Copy01Icon size={15} />,
          disabled: cloneMutation.isPending,
          onSelect: handleClone,
        },
        {
          key: 'archive',
          label: 'Archive',
          icon: <ArchiveIcon size={15} />,
          disabled: archiveMutation.isPending,
          onSelect: handleArchive,
        },
        {
          key: 'delete',
          label: 'Delete',
          icon: <Delete02Icon size={15} />,
          destructive: true,
          onSelect: () => onDelete(dataset),
        },
      ]}
    />
  );
}
