'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Copy01Icon, Download01Icon, Search01Icon } from 'hugeicons-react';

import { AppShell } from '@/components/dashboard/shell';
import { DatasetHeader } from '@/components/datasets/dataset-header';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  useArchiveDataset,
  useCloneDataset,
  useDataset,
  useDatasetRows,
  useDeleteDataset,
  useGenerateDatasetResponses,
  useUpdateDataset,
} from '@/hooks/use-datasets';
import { api } from '@/lib/api';
import type { Dataset, DatasetRow, Pagination } from '@scorra/types';
import { cn, formatDate, formatNumber } from '@/lib/utils';

const PROMPT_TYPE_LABELS: Record<string, string> = {
  COMPLETION: 'completion',
  CHAT: 'chat',
  INSTRUCTION: 'instruction',
  CLASSIFICATION: 'classification',
  SUMMARIZATION: 'summarization',
  TRANSLATION: 'translation',
  CUSTOM: 'custom',
};

export default function DatasetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const tab = searchParams.get('tab') === 'settings' ? 'settings' : 'rows';

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const { data: datasetData, isPending: datasetLoading } = useDataset(id);
  const dataset = datasetData;
  const isProcessing = dataset?.status === 'PROCESSING';

  const { data: rowsData } = useDatasetRows(
    id,
    { page: 1, limit: 100 },
    { refetchInterval: isProcessing ? 3000 : false },
  );
  const rows = useMemo(() => rowsData?.data ?? [], [rowsData]);
  const pagination = useMemo(() => (rowsData?.pagination ?? null) as Pagination | null, [rowsData]);

  const cloneMutation = useCloneDataset(id);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!api.isAuthenticated) {
      router.replace('/login');
    }
  }, [router]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.prompt.toLowerCase().includes(q) ||
        (r.context ?? '').toLowerCase().includes(q) ||
        (r.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    );
  }, [rows, query]);

  const selected = rows.find((r) => r.id === selectedId) ?? filteredRows[0] ?? null;

  const generateMutation = useGenerateDatasetResponses(id);

  const handleClone = async () => {
    setBusy(true);
    setActionMsg('');
    try {
      const cloned = (await cloneMutation.mutateAsync()) as Dataset;
      router.push(`/datasets/${cloned.id}`);
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Failed to clone dataset');
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateResponses = async () => {
    setBusy(true);
    setActionMsg('');
    try {
      const res = await generateMutation.mutateAsync();
      setActionMsg(res.message ?? 'AI response generation queued — rows refresh when ready.');
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Failed to start response generation');
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async () => {
    setBusy(true);
    setActionMsg('');
    try {
      const all: DatasetRow[] = [];
      let pageNum = 1;
      let hasMore = true;
      while (hasMore && pageNum <= 20) {
        const res = (await api.getDatasetRows(id, { page: pageNum, limit: 100 })) as {
          data: DatasetRow[];
          pagination: Pagination;
        };
        all.push(...res.data);
        hasMore = res.pagination.hasNext ?? false;
        pageNum += 1;
      }
      const lines = all.map((r) =>
        JSON.stringify({
          rowIndex: r.rowIndex,
          prompt: r.prompt,
          promptType: r.promptType,
          context: r.context ?? undefined,
          expectedOutput: r.expectedOutput ?? undefined,
          tags: r.tags ?? [],
        }),
      );
      const blob = new Blob([lines.join('\n')], { type: 'application/json' });
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `${dataset?.name ?? 'dataset'}.jsonl`;
      a.click();
      URL.revokeObjectURL(href);
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  if (datasetLoading || !dataset) {
    return (
      <AppShell>
        <div className="flex h-[60vh] items-center justify-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">Loading…</p>
        </div>
      </AppShell>
    );
  }

  const actions = (
    <>
      <Button variant="ghost" onClick={handleClone} disabled={busy}>
        <Copy01Icon size={14} />
        Clone
      </Button>
      {dataset.status === 'READY' && (
        <Button
          variant="ghost"
          onClick={handleGenerateResponses}
          disabled={busy || generateMutation.isPending}
          title="Run every prompt through the configured AI provider and store the outputs as model responses"
        >
          Generate AI responses
        </Button>
      )}
      <Button variant="ghost" onClick={handleExport} disabled={busy}>
        <Download01Icon size={14} />
        Export
      </Button>
      <Button asChild>
        <Link href={`/datasets/new?datasetId=${dataset.id}`}>Import new version</Link>
      </Button>
    </>
  );

  return (
    <AppShell>
      <DatasetHeader dataset={dataset} activeTab={tab} actions={actions} />

      {actionMsg && (
        <div className="px-5 pt-4 md:px-9">
          <p className="rounded-md border border-ink-200 bg-paper px-3.5 py-2.5 font-mono text-[11.5px] text-ink-600">
            {actionMsg}
          </p>
        </div>
      )}

      <div className="px-5 pb-14 pt-6 md:px-9">
        {tab === 'settings' ? (
          <DatasetSettingsForm key={dataset.id} dataset={dataset} onStatus={setActionMsg} />
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
            <div className="min-w-0">
              <div className="mb-3.5 flex items-center justify-between gap-4">
                <div className="relative max-w-75 flex-1">
                  <Search01Icon
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
                  />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search prompts, tags…"
                    className="w-full rounded-sm border border-ink-300 bg-white py-2.5 pl-8 pr-3 text-[13px] outline-none transition-colors focus:border-ink"
                  />
                </div>
                <span className="shrink-0 font-mono text-[11.5px] text-ink-500">
                  {formatNumber(pagination?.total ?? rows.length)} ROWS
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
                {filteredRows.length === 0 ? (
                  <p className="px-6 py-14 text-center font-mono text-[11.5px] text-ink-400">
                    No rows to show.
                  </p>
                ) : (
                  filteredRows.map((row) => {
                    const isSelected = row.id === selected?.id;
                    return (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => setSelectedId(row.id)}
                        className={cn(
                          'flex w-full items-center gap-3 border-b border-ink-100 px-4.5 py-3.5 text-left transition-colors last:border-b-0',
                          isSelected ? 'bg-ink text-white' : 'hover:bg-paper',
                        )}
                      >
                        <span
                          className={cn(
                            'w-6 shrink-0 font-mono text-[11px]',
                            isSelected ? 'text-ink-400' : 'text-ink-400',
                          )}
                        >
                          {String(row.rowIndex).padStart(2, '0')}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">
                            {row.prompt}
                          </span>
                          {(row.tags ?? []).length > 0 && (
                            <span className="mt-1.5 flex gap-1.5">
                              {row.tags.slice(0, 3).map((t) => (
                                <span
                                  key={t}
                                  className={cn(
                                    'rounded-full border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.04em]',
                                    isSelected
                                      ? 'border-ink-500 text-ink-300'
                                      : 'border-ink-300 text-ink-500',
                                  )}
                                >
                                  {t}
                                </span>
                              ))}
                            </span>
                          )}
                        </span>
                        <span
                          className={cn(
                            'shrink-0 font-mono text-[10.5px] uppercase',
                            isSelected ? 'text-ink-400' : 'text-ink-400',
                          )}
                        >
                          {PROMPT_TYPE_LABELS[row.promptType] ?? row.promptType.toLowerCase()}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {pagination && pagination.totalPages > 1 && (
                <p className="mt-3 font-mono text-[11px] text-ink-400">
                  Showing first {rows.length} of {formatNumber(pagination.total)} rows.
                </p>
              )}
            </div>

            {selected && (
              <div className="sticky top-24 rounded-2xl border border-ink-200 bg-white p-6">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-400">
                  Prompt · Row {String(selected.rowIndex).padStart(2, '0')}
                </p>
                <p className="mb-5 rounded-md border border-ink-200 bg-paper px-4 py-3.5 text-[13.5px] leading-relaxed text-ink-700">
                  {selected.prompt}
                </p>

                {selected.context && (
                  <div className="mb-5">
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-400">
                      Context
                    </p>
                    <p className="rounded-md border border-ink-200 bg-paper px-4 py-3.5 text-[13.5px] leading-relaxed text-ink-700">
                      {selected.context}
                    </p>
                  </div>
                )}

                {selected.expectedOutput && (
                  <div className="mb-5">
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-400">
                      Expected output
                    </p>
                    <p className="rounded-md border border-ink-200 bg-paper px-4 py-3.5 text-[13.5px] leading-relaxed text-ink-700">
                      {selected.expectedOutput}
                    </p>
                  </div>
                )}

                {(selected.tags ?? []).length > 0 && (
                  <div className="mb-5">
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-400">
                      Tags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-ink-300 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.04em] text-ink-500"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-5 grid grid-cols-2 gap-x-4 gap-y-4 text-[12.5px]">
                  <div>
                    <p className="text-ink-500">Type</p>
                    <p className="mt-0.5 font-mono font-semibold text-ink">
                      {PROMPT_TYPE_LABELS[selected.promptType] ?? selected.promptType.toLowerCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-ink-500">Row</p>
                    <p className="mt-0.5 font-mono font-semibold text-ink">#{selected.rowIndex}</p>
                  </div>
                  <div>
                    <p className="text-ink-500">Created</p>
                    <p className="mt-0.5 font-mono font-semibold text-ink">
                      {formatDate(selected.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-ink-500">Tags</p>
                    <p className="mt-0.5 font-mono font-semibold text-ink">
                      {(selected.tags ?? []).length}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5 border-t border-ink-100 pt-4">
                  <Button
                    variant="ghost"
                    className="opacity-50"
                    title="Row editing isn't available yet"
                    disabled
                  >
                    Edit row
                  </Button>
                  <Button
                    variant="ghost"
                    className="opacity-50"
                    title="Per-row evaluations aren't available yet"
                    disabled
                  >
                    View evaluations
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {dataset.status === 'PROCESSING' && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-ink-200 bg-paper px-3.5 py-2.5 font-mono text-[11.5px] text-ink-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-ink" />
            Processing — rows and AI responses refresh automatically.
          </div>
        )}
      </div>
    </AppShell>
  );
}

function DatasetSettingsForm({
  dataset,
  onStatus,
}: {
  dataset: Dataset;
  onStatus: (msg: string) => void;
}) {
  const router = useRouter();
  const [editName, setEditName] = useState(dataset.name);
  const [editDesc, setEditDesc] = useState(dataset.description ?? '');
  const [editTags, setEditTags] = useState(dataset.tags.join(', '));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateMutation = useUpdateDataset(dataset.id);
  const archiveMutation = useArchiveDataset(dataset.id);
  const deleteMutation = useDeleteDataset(dataset.id);

  const handleSave = async () => {
    onStatus('');
    try {
      await updateMutation.mutateAsync({
        name: editName.trim() || undefined,
        description: editDesc.trim() || undefined,
        tags: editTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
    } catch (err) {
      onStatus(err instanceof Error ? err.message : 'Failed to save settings');
    }
  };

  const handleArchive = async () => {
    if (!confirm(`Archive ${dataset.name}?`)) return;
    onStatus('');
    try {
      await archiveMutation.mutateAsync();
    } catch (err) {
      onStatus(err instanceof Error ? err.message : 'Failed to archive dataset');
    }
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    try {
      await deleteMutation.mutateAsync();
      router.push('/datasets');
    } catch (err) {
      onStatus(err instanceof Error ? err.message : 'Failed to delete dataset');
    }
  };

  return (
    <>
      <div className="max-w-160 space-y-5">
        <div className="rounded-2xl border border-ink-200 bg-white p-6">
          <h3 className="mb-1 text-[15px]">Dataset settings</h3>
          <p className="mb-5 text-[12.5px] text-ink-500">
            Rename the dataset, update its description, and manage tags.
          </p>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-ink-700">
                Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-sm border border-ink-300 px-3 py-2.5 text-[14px] outline-none transition-colors focus:border-ink"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-ink-700">
                Description
              </label>
              <textarea
                rows={3}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full resize-y rounded-sm border border-ink-300 px-3 py-2.5 text-[14px] outline-none transition-colors focus:border-ink"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-ink-700">
                Tags <span className="font-normal text-ink-400">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="qa, support, v1"
                className="w-full rounded-sm border border-ink-300 px-3 py-2.5 text-[14px] outline-none transition-colors focus:border-ink"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-6">
          <h3 className="mb-1 text-[15px]">Danger zone</h3>
          <p className="mb-5 text-[12.5px] text-ink-500">
            Archive keeps the dataset for reference; deletion removes it permanently.
          </p>
          <div className="flex gap-2.5">
            <Button variant="ghost" onClick={handleArchive}>
              Archive dataset
            </Button>
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete(true)}
              className="border-red-900/40 text-red-700 hover:border-red-700 hover:bg-red-50 hover:text-red-700"
            >
              Delete dataset
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete dataset?"
        description={
          <>
            <span className="font-semibold text-ink">{dataset.name}</span> will be permanently
            deleted, along with all {formatNumber(dataset.rowCount)} rows and versions
            {dataset._count?.tasks
              ? `, plus ${formatNumber(dataset._count.tasks)} evaluation ${
                  dataset._count.tasks === 1 ? 'task' : 'tasks'
                } built on it`
              : ''}
            . This cannot be undone.
          </>
        }
        confirmLabel="Delete dataset"
        destructive
        confirmBusy={deleteMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}
