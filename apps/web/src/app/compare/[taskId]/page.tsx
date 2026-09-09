'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ComparisonVerdict } from '@scorra/types';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Markdown } from '@/components/ui/markdown';
import { useNextComparison, useSubmitComparison } from '@/hooks/use-evaluation';
import { useTaskProgress } from '@/hooks/use-tasks';

const VERDICT_OPTIONS: { value: ComparisonVerdict; label: string; key: string }[] = [
  { value: ComparisonVerdict.A_BETTER, label: 'A Better', key: '←' },
  { value: ComparisonVerdict.B_BETTER, label: 'B Better', key: '→' },
  { value: ComparisonVerdict.TIE, label: 'Tie', key: 'T' },
  { value: ComparisonVerdict.BOTH_BAD, label: 'Both Bad', key: 'B' },
];

export default function ComparePage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.taskId as string;

  const { data: pair, isPending, error: loadError, refetch } = useNextComparison(taskId);
  const { data: progressData } = useTaskProgress(taskId);
  const submitMutation = useSubmitComparison();

  const [selected, setSelected] = useState<'A' | 'B' | null>(null);
  const [verdict, setVerdict] = useState<ComparisonVerdict | null>(null);
  const [reasoning, setReasoning] = useState('');
  const startedAt = useRef<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!api.isAuthenticated) {
      router.replace('/login');
    }
  }, [router]);

  // Seed the per-item timer whenever the shown pair changes.
  const rowId = pair?.datasetRowId;
  useEffect(() => {
    startedAt.current = Date.now();
  }, [rowId]);

  // Reset the form whenever a new pair is shown.
  const prevRowRef = useRef<string | undefined>(undefined);
  if (prevRowRef.current !== rowId) {
    prevRowRef.current = rowId;
    setVerdict(null);
    setSelected(null);
    setReasoning('');
  }

  const handleSubmit = async () => {
    if (!pair?.datasetRowId || !pair.responseA || !pair.responseB || !verdict) return;
    await submitMutation.mutateAsync({
      taskId,
      datasetRowId: pair.datasetRowId,
      responseAId: pair.responseA.id,
      responseBId: pair.responseB.id,
      verdict,
      reasoning: reasoning || undefined,
      timeSpentSeconds: Math.floor((Date.now() - startedAt.current) / 1000),
    });
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isPending || submitMutation.isPending) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;
      switch (e.key) {
        case 'ArrowLeft':
        case '←':
          e.preventDefault();
          setSelected('A');
          setVerdict(ComparisonVerdict.A_BETTER);
          break;
        case 'ArrowRight':
        case '→':
          e.preventDefault();
          setSelected('B');
          setVerdict(ComparisonVerdict.B_BETTER);
          break;
        case 't':
        case 'T':
          setSelected(null);
          setVerdict(ComparisonVerdict.TIE);
          break;
        case 'b':
        case 'B':
          setSelected(null);
          setVerdict(ComparisonVerdict.BOTH_BAD);
          break;
        case 'Enter':
          e.preventDefault();
          void handleSubmit();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
          Loading next pair…
        </p>
      </div>
    );
  }

  if (pair?.done || !pair?.responseA || !pair.responseB) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-6">
        <div className="max-w-md text-center">
          <p className="font-display text-2xl font-semibold text-ink">All compared!</p>
          <p className="mt-2 text-[14px] text-ink-500">
            {pair?.message || 'You have compared every pair in this task.'}
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
        <div className="mx-auto flex max-w-[980px] items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-4">
            <Link
              href="/tasks"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-300 text-[15px] text-ink-500 transition-colors hover:bg-paper hover:text-ink"
              aria-label="Back to tasks"
            >
              ✕
            </Link>
            <div>
              <div className="text-[13.5px] font-semibold text-ink">Pairwise comparison</div>
              <div className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.04em] text-ink-500">
                {pair.prompt ? truncate(pair.prompt, 32) : ''} · PAIRWISE
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

      <main className="mx-auto max-w-[980px] px-6 pb-40 pt-9">
        {error ? (
          <div className="mb-5 rounded-lg border border-red-900/30 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {error instanceof Error ? error.message : 'Something went wrong.'}
          </div>
        ) : null}

        {/* Prompt */}
        <section className="relative mb-5 overflow-hidden rounded-2xl bg-ink p-6 text-white sm:p-7">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 90% 10%, rgba(255,255,255,0.06), transparent 45%)',
            }}
          />
          <p className="mb-2.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-300">
            Prompt
          </p>
          <p className="text-[16px] leading-[1.55]">{pair.prompt}</p>
          {pair.context && (
            <p className="mt-3.5 border-t border-ink-700 pt-3.5 font-mono text-[11.5px] text-ink-300">
              {pair.context}
            </p>
          )}
        </section>

        {/* A vs B */}
        <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {[
            { side: 'A' as const, view: pair.responseA },
            { side: 'B' as const, view: pair.responseB },
          ].map(({ side, view }) => (
            <button
              key={side}
              onClick={() => {
                setSelected(side);
                setVerdict(side === 'A' ? ComparisonVerdict.A_BETTER : ComparisonVerdict.B_BETTER);
              }}
              className={cn(
                'relative rounded-2xl border-2 bg-white p-5 text-left transition-colors sm:p-6',
                selected === side ? 'border-ink' : 'border-ink-200 hover:border-ink-400',
              )}
            >
              {selected === side && (
                <span className="absolute -top-[11px] left-5 rounded-full bg-ink px-2.5 py-0.5 font-mono text-[9.5px] tracking-[0.06em] text-white">
                  ✓ SELECTED
                </span>
              )}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-400">
                    Response {side}
                  </span>
                  <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] font-medium text-ink">
                    {view.modelName}
                  </span>
                </div>
                <span className="rounded border border-ink-300 px-1.5 py-0.5 font-mono text-[10px] text-ink-500">
                  {side === 'A' ? '←' : '→'}
                </span>
              </div>
              <Markdown className="text-[14px] leading-[1.65] text-ink-600">
                {view.response}
              </Markdown>
            </button>
          ))}
        </div>

        {/* Verdict */}
        <div className="mb-5 flex flex-wrap justify-center gap-2.5">
          {VERDICT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setVerdict(option.value);
                setSelected(
                  option.value === ComparisonVerdict.A_BETTER
                    ? 'A'
                    : option.value === ComparisonVerdict.B_BETTER
                      ? 'B'
                      : null,
                );
              }}
              className={cn(
                'max-w-[190px] flex-1 rounded-md border-[1.5px] px-4 py-3 text-center text-[13.5px] font-semibold transition-colors',
                verdict === option.value
                  ? 'border-ink bg-ink text-white'
                  : 'border-ink-300 bg-white text-ink-600 hover:border-ink',
              )}
            >
              {option.label}
              <span
                className={cn(
                  'mt-1 block font-mono text-[10px]',
                  verdict === option.value ? 'text-ink-300' : 'text-ink-400',
                )}
              >
                {option.key}
              </span>
            </button>
          ))}
        </div>

        {/* Notes */}
        <section className="mt-5">
          <label className="mb-2 block text-[12px] font-semibold text-ink">
            Notes <span className="font-normal text-ink-400">(optional)</span>
          </label>
          <textarea
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            rows={2}
            placeholder="Why did you pick this one? Helpful for calibrating the AI Judge."
            className="w-full resize-y rounded-md border border-ink-300 bg-white px-3.5 py-3 text-[13.5px] outline-none transition-colors focus:border-ink"
          />
        </section>
      </main>

      {/* Action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink-200 bg-paper/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[980px] items-center justify-between gap-3 px-6 py-4">
          <div className="hidden items-center gap-4 font-mono text-[11px] text-ink-400 md:flex">
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-ink-300 bg-white px-1.5 py-0.5 text-ink-500">
                ←
              </kbd>
              <kbd className="rounded border border-ink-300 bg-white px-1.5 py-0.5 text-ink-500">
                →
              </kbd>
              pick response
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-ink-300 bg-white px-1.5 py-0.5 text-ink-500">
                T
              </kbd>
              tie
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-ink-300 bg-white px-1.5 py-0.5 text-ink-500">
                B
              </kbd>
              both bad
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-ink-300 bg-white px-1.5 py-0.5 text-ink-500">
                Enter
              </kbd>
              submit &amp; next
            </span>
          </div>
          <div className="ml-auto flex items-center gap-3 md:ml-0">
            <Button
              variant="ghost"
              onClick={() => void refetch()}
              disabled={submitMutation.isPending}
            >
              Skip
            </Button>
            <Button
              onClick={() => void handleSubmit()}
              disabled={submitMutation.isPending || !verdict}
            >
              {submitMutation.isPending ? 'Submitting…' : 'Submit & next'} →
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
