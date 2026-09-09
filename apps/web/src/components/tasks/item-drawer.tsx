'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { Cancel01Icon } from 'hugeicons-react';
import type {
  Evaluation,
  ModelResponse,
  PairwiseComparison,
  RankingResultItem,
} from '@scorra/types';

import { api } from '@/lib/api';
import { cn, formatRelativeTime } from '@/lib/utils';
import { VERDICT_BADGE, verdictLabel } from '@/lib/task-utils';
import { Markdown } from '@/components/ui/markdown';
import { DropdownMenu, type DropdownItem } from '@/components/ui/dropdown-menu';

/** What a result row's "View details" drawer should show, per task type. */
export type RowDetail = { rowId: string; rowIndex: number | null } & (
  | { type: 'SINGLE'; evaluations: Evaluation[] }
  | { type: 'PAIRWISE'; comparisons: PairwiseComparison[] }
  | { type: 'RANKING'; rankings: RankingResultItem[] }
);

// ─── Row ⋯ action menu ────────────────────────────────────────────────────────

export function RowActions({
  datasetId,
  rowId,
  prompt,
  onViewDetails,
}: {
  datasetId: string;
  rowId: string;
  prompt: string | null;
  onViewDetails: () => void;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  const copyPrompt = async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
    } catch {
      // Clipboard unavailable — ignore.
    }
  };

  const items: DropdownItem[] = [
    { key: 'details', label: 'View details', onSelect: onViewDetails },
    {
      key: 'dataset',
      label: 'View in dataset',
      onSelect: () => router.push(`/datasets/${datasetId}`),
    },
    { key: 'copy', label: 'Copy prompt', disabled: !prompt, onSelect: copyPrompt },
  ];

  return (
    <>
      <DropdownMenu
        width={180}
        trigger={
          <button
            type="button"
            aria-label="Row actions"
            className="rounded-md px-1.5 py-1 text-ink-400 transition-colors hover:bg-paper hover:text-ink"
          >
            ⋯
          </button>
        }
        items={items}
      />
      {copied && (
        <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-full border border-ink-200 bg-ink px-4 py-2 font-mono text-[11px] text-white shadow-xl">
          Prompt copied
        </div>
      )}
    </>
  );
}

// ─── Item details drawer ──────────────────────────────────────────────────────

export function ItemDrawer({
  detail,
  datasetId,
  onClose,
}: {
  detail: RowDetail | null;
  datasetId: string;
  onClose: () => void;
}) {
  const rowId = detail?.rowId;

  const { data: row, isPending: rowPending } = useQuery({
    queryKey: ['dataset-row', datasetId, rowId],
    queryFn: () => api.getDatasetRow(datasetId, rowId as string),
    enabled: Boolean(detail && datasetId && rowId),
  });

  // Esc closes the drawer
  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detail, onClose]);

  return (
    <AnimatePresence>
      {detail && (
        <motion.div
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
          <motion.aside
            className="absolute right-0 top-0 flex h-full w-full max-w-[540px] flex-col border-l border-ink-200 bg-white shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between border-b border-ink-200 px-6 py-4">
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-500">
                  Item details
                </p>
                <p className="mt-0.5 text-[15px] font-semibold text-ink">
                  #{detail.rowIndex != null ? detail.rowIndex : row?.rowIndex ?? '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-paper hover:text-ink"
              >
                <Cancel01Icon size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-10">
              {rowPending ? (
                <p className="py-16 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
                  Loading…
                </p>
              ) : row ? (
                <>
                  <PromptSection row={row} />
                  <ResponsesSection responses={row.modelResponses} />
                  <SubmissionsSection detail={detail} />
                </>
              ) : (
                <p className="py-16 text-center font-mono text-[11px] text-ink-400">
                  Could not load this item.
                </p>
              )}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function PromptSection({
  row,
}: {
  row: { prompt: string; context?: string | null; expectedOutput?: string | null };
}) {
  return (
    <section className="relative mb-5 overflow-hidden rounded-2xl bg-ink p-5 text-white">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-300">Prompt</p>
      <p className="text-[14px] leading-[1.55]">{row.prompt}</p>
      {row.context && (
        <p className="mt-3 border-t border-ink-700 pt-3 font-mono text-[11px] text-ink-300">
          {row.context}
        </p>
      )}
      {row.expectedOutput && (
        <p className="mt-2 font-mono text-[11px] text-ink-300">Expected: {row.expectedOutput}</p>
      )}
    </section>
  );
}

function ResponsesSection({ responses }: { responses: ModelResponse[] }) {
  if (responses.length === 0) return null;
  return (
    <section className="mb-5">
      <h3 className="mb-2.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-400">
        Model responses
      </h3>
      <div className="space-y-3">
        {responses.map((resp) => {
          const tokens = (resp.promptTokens ?? 0) + (resp.completionTokens ?? 0);
          return (
            <div key={resp.id} className="rounded-2xl border border-ink-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-full bg-paper px-2 py-0.5 font-mono text-[10.5px] font-semibold text-ink">
                  {resp.modelName}
                </span>
                <span className="font-mono text-[10px] text-ink-400">
                  {resp.provider} · {tokens} tokens
                </span>
              </div>
              <Markdown className="text-[13px] leading-[1.6] text-ink-600">{resp.response}</Markdown>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SubmissionsSection({ detail }: { detail: RowDetail }) {
  if (detail.type === 'SINGLE') {
    const items = detail.evaluations.filter((e) => e.datasetRowId === detail.rowId);
    if (items.length === 0) return null;
    return (
      <section>
        <h3 className="mb-2.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-400">
          Scoring submissions
        </h3>
        <div className="space-y-3">
          {items.map((e) => (
            <div key={e.id} className="rounded-2xl border border-ink-200 bg-white p-4">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-ink">
                  {e.evaluator?.name ?? 'Evaluator'}
                </span>
                <span className="font-mono text-[12.5px] font-semibold text-ink">
                  {e.overallScore != null ? `${e.overallScore.toFixed(1)} / 10` : '—'}
                </span>
              </div>
              {Array.isArray(e.scores) && e.scores.length > 0 && (
                <div className="mb-3 divide-y divide-ink-100 border-y border-ink-100">
                  {e.scores.map((s) => (
                    <div key={s.dimension} className="flex items-center justify-between py-2 text-[12.5px]">
                      <span className="text-ink-600">{s.label || s.dimension}</span>
                      <span className="font-mono text-ink">
                        {s.score}
                        {s.confidence != null ? ` · ${Math.round(s.confidence * 100)}%` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {e.comment && <p className="mb-2 text-[12.5px] leading-relaxed text-ink-600">{e.comment}</p>}
              {e.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {e.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-ink-200 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.04em] text-ink-500"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (detail.type === 'PAIRWISE') {
    const items = detail.comparisons.filter((c) => c.datasetRowId === detail.rowId);
    if (items.length === 0) return null;
    return (
      <section>
        <h3 className="mb-2.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-400">
          Comparison verdicts
        </h3>
        <div className="space-y-3">
          {items.map((c) => (
            <div key={c.id} className="rounded-2xl border border-ink-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-ink">
                  {c.evaluator?.name ?? 'Evaluator'}
                </span>
                <VerdictPill verdict={c.verdict} />
              </div>
              {c.confidenceScore != null && (
                <p className="mb-1.5 font-mono text-[10.5px] text-ink-400">
                  confidence {Math.round(c.confidenceScore * 100)}%
                </p>
              )}
              {c.reasoning && (
                <p className="text-[12.5px] leading-relaxed text-ink-600">{c.reasoning}</p>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  }

  const items = detail.rankings.filter((r) => r.datasetRowId === detail.rowId);
  if (items.length === 0) return null;
  return (
    <section>
      <h3 className="mb-2.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-400">
        Rankings
      </h3>
      <div className="space-y-3">
        {items.map((r) => (
          <div key={r.id} className="rounded-2xl border border-ink-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-ink">
                {r.evaluator?.name ?? 'Evaluator'}
              </span>
              <span className="font-mono text-[10px] uppercase text-ink-400">
                {formatRelativeTime(r.submittedAt ?? r.createdAt)}
              </span>
            </div>
            <ol className="mb-2 space-y-1">
              {[...r.entries]
                .sort((a, b) => a.rank - b.rank)
                .map((entry) => (
                  <li key={entry.responseId} className="flex items-center gap-2 text-[12.5px]">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-paper font-mono text-[10px] font-semibold text-ink">
                      {entry.rank}
                    </span>
                    <span className={cn(entry.rank === 1 && 'font-semibold text-ink')}>
                      {entry.modelName}
                    </span>
                  </li>
                ))}
            </ol>
            {r.comment && (
              <p className="text-[12.5px] leading-relaxed text-ink-600">{r.comment}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function VerdictPill({ verdict }: { verdict: PairwiseComparison['verdict'] }) {
  if (!verdict) return <span className="font-mono text-[11px] text-ink-400">—</span>;
  return (
    <span
      className={cn(
        'inline-block rounded-full border px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.04em]',
        VERDICT_BADGE[verdict],
      )}
    >
      {verdictLabel(verdict)}
    </span>
  );
}