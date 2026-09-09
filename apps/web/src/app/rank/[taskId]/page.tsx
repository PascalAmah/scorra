'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { RankedResponse } from '@scorra/types';
import { cn } from '@/lib/utils';
import { Markdown } from '@/components/ui/markdown';
import { useNextRanking, useSubmitRanking } from '@/hooks/use-evaluation';
import { useTaskProgress } from '@/hooks/use-tasks';

export default function RankPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.taskId as string;

  const { data: rank, isPending, error: loadError, refetch } = useNextRanking(taskId);
  const { data: progressData } = useTaskProgress(taskId);
  const submitMutation = useSubmitRanking();

  const [order, setOrder] = useState<RankedResponse[]>([]);
  const [comment, setComment] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const startedAt = useRef<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!api.isAuthenticated) {
      router.replace('/login');
    }
  }, [router]);

  // Seed the per-item timer whenever the shown ranking set changes.
  const rowId = rank?.datasetRowId;
  useEffect(() => {
    startedAt.current = Date.now();
  }, [rowId]);

  // Populate the order whenever a new ranking set is loaded.
  const prevRowRef = useRef<string | undefined>(undefined);
  if (prevRowRef.current !== rowId) {
    prevRowRef.current = rowId;
    if (rank?.responses) setOrder(rank.responses);
    setComment('');
    setDragIndex(null);
    setOverIndex(null);
  }

  const startDrag = (i: number) => setDragIndex(i);
  const overDrag = (i: number) => setOverIndex(i);

  const drop = () => {
    if (dragIndex == null || overIndex == null || dragIndex === overIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    setOrder((prev) => {
      const next = [...prev];
      const [item] = next.splice(dragIndex, 1);
      next.splice(overIndex, 0, item);
      return next;
    });
    setDragIndex(null);
    setOverIndex(null);
  };

  const resetOrder = () => {
    if (rank?.responses) setOrder(rank.responses);
  };

  const handleSubmit = async () => {
    if (!rank?.datasetRowId || order.length === 0) return;
    await submitMutation.mutateAsync({
      taskId,
      datasetRowId: rank.datasetRowId,
      entries: order.map((r, i) => ({ responseId: r.id, rank: i + 1 })),
      comment: comment || undefined,
    });
  };

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
          Loading next ranking set…
        </p>
      </div>
    );
  }

  if (rank?.done || !rank?.responses || rank.responses.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-6">
        <div className="max-w-md text-center">
          <p className="font-display text-2xl font-semibold text-ink">All ranked!</p>
          <p className="mt-2 text-[14px] text-ink-500">
            {rank?.message || 'You have ranked every set in this task.'}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="ghost" onClick={() => router.push('/tasks')}>
              Back to Tasks
            </Button>
            <Button onClick={() => router.push(`/tasks/${taskId}`)}>View Task</Button>
          </div>
        </div>
      </div>
    );
  }

  const error = loadError ?? submitMutation.error;

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-[820px] items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-4">
            <Link
              href="/tasks"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-300 text-[15px] text-ink-500 transition-colors hover:bg-paper hover:text-ink"
              aria-label="Back to tasks"
            >
              ✕
            </Link>
            <div>
              <div className="text-[13.5px] font-semibold text-ink">Response ranking</div>
              <div className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.04em] text-ink-500">
                {rank.prompt ? truncate(rank.prompt, 32) : ''} · RANKING
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="rounded-full border border-ink-300 px-3.5 py-1.5 font-mono text-[11px] text-ink-500">
              ⚑ Flag item
            </span>
            <ProgressInline
              progress={
                progressData
                  ? {
                      done: progressData.myCompleted ?? progressData.completedEvaluations,
                      total: progressData.totalRows,
                    }
                  : null
              }
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[820px] px-6 pb-40 pt-9">
        {error ? (
          <div className="mb-5 rounded-lg border border-red-900/30 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {error instanceof Error ? error.message : 'Something went wrong.'}
          </div>
        ) : null}

        {/* Prompt */}
        <section className="relative mb-6 overflow-hidden rounded-2xl bg-ink p-6 text-white sm:p-7">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 90% 10%, rgba(255,255,255,0.06), transparent 45%)',
            }}
          />
          <p className="mb-2.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-300">
            Prompt · {order.length} candidate responses
          </p>
          <p className="text-[16px] leading-[1.55]">{rank.prompt}</p>
          {rank.context && (
            <p className="mt-3.5 border-t border-ink-700 pt-3.5 font-mono text-[11.5px] text-ink-300">
              {rank.context}
            </p>
          )}
        </section>

        {/* Instructions */}
        <div className="mb-3.5 flex items-center justify-between">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.05em] text-ink-500">
            Drag to reorder — best result at the top
          </span>
          <button
            onClick={resetOrder}
            className="rounded-full border border-ink-300 px-3 py-1 font-mono text-[11px] text-ink-500 transition-colors hover:border-ink hover:text-ink"
          >
            Reset order
          </button>
        </div>

        {/* Rank list */}
        <div className="flex flex-col gap-3">
          {order.map((r, i) => (
            <div
              key={r.id}
              draggable
              onDragStart={() => startDrag(i)}
              onDragEnter={() => overDrag(i)}
              onDragOver={(e) => e.preventDefault()}
              onDragEnd={drop}
              onDrop={drop}
              className={cn(
                'flex items-start gap-3.5 rounded-[14px] border-[1.5px] bg-white p-4 transition-all sm:p-[18px]',
                dragIndex === i && 'opacity-40',
                overIndex === i && dragIndex !== null && dragIndex !== overIndex
                  ? 'border-ink shadow-[0_0_0_3px_var(--color-ink-100)]'
                  : 'border-ink-200',
              )}
            >
              <div className="flex shrink-0 items-center justify-center rounded-[9px] bg-ink px-3 font-display text-[14px] font-bold text-white">
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.05em] text-ink-400">
                    {r.modelName}
                  </span>
                </div>
                <Markdown className="text-[13.5px] leading-[1.6] text-ink-600">
                  {r.response}
                </Markdown>
              </div>
              <div className="hidden shrink-0 grid-cols-2 gap-[3px] self-center pt-1 sm:grid">
                {Array.from({ length: 6 }).map((_, d) => (
                  <span key={d} className="h-1 w-1 rounded-full bg-ink-300" />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Notes */}
        <section className="mt-5">
          <label className="mb-2 block text-[12px] font-semibold text-ink">
            Notes <span className="font-normal text-ink-400">(optional)</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="Notes on this ranking…"
            className="w-full resize-y rounded-md border border-ink-300 bg-white px-3.5 py-3 text-[13.5px] outline-none transition-colors focus:border-ink"
          />
        </section>
      </main>

      {/* Action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink-200 bg-paper/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[820px] items-center justify-between gap-3 px-6 py-4">
          <span className="hidden font-mono text-[11px] text-ink-400 md:inline">
            Drag cards to reorder, then submit
          </span>
          <div className="ml-auto flex items-center gap-3 md:ml-0">
            <Button
              variant="ghost"
              onClick={() => void refetch()}
              disabled={submitMutation.isPending}
            >
              Skip
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? 'Submitting…' : 'Submit ranking & next'} →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Button({
  children,
  className,
  variant = 'default',
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'ghost';
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 font-body text-[14px] font-semibold transition-all disabled:opacity-50',
        variant === 'default'
          ? 'bg-ink text-white hover:opacity-80'
          : 'border border-ink-300 bg-transparent text-ink hover:border-ink',
        className,
      )}
    >
      {children}
    </button>
  );
}

function ProgressInline({ progress }: { progress: { done: number; total: number } | null }) {
  if (!progress) return null;
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <div className="flex items-center gap-2.5">
      <span className="font-mono text-[12px] font-semibold text-ink">
        {progress.done.toLocaleString()} / {progress.total.toLocaleString()}
      </span>
      <div className="h-[5px] w-[140px] overflow-hidden rounded-full bg-ink-200">
        <span className="block h-full rounded-full bg-ink" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
