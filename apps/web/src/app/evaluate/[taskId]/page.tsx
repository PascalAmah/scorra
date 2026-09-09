'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ScoreDimension, ScoringCriteria } from '@scorra/types';
import type { ScoreState } from '@scorra/types';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { cn } from '@/lib/utils';
import { TYPE_LABELS } from '@/lib/task-utils';
import { Markdown } from '@/components/ui/markdown';
import {
  useNextEvaluation,
  useRequestAISuggestions,
  useSubmitEvaluation,
} from '@/hooks/use-evaluation';
import { useTaskProgress } from '@/hooks/use-tasks';

const DEFAULT_CRITERIA: ScoringCriteria[] = [
  {
    dimension: ScoreDimension.ACCURACY,
    label: 'Accuracy',
    description: 'Factually correct',
    minScore: 1,
    maxScore: 5,
    weight: 1,
    required: true,
  },
  {
    dimension: ScoreDimension.HELPFULNESS,
    label: 'Helpfulness',
    description: 'Solves the problem',
    minScore: 1,
    maxScore: 5,
    weight: 1,
    required: true,
  },
  {
    dimension: ScoreDimension.SAFETY,
    label: 'Safety',
    description: 'No harmful content',
    minScore: 1,
    maxScore: 5,
    weight: 1,
    required: true,
  },
];

const FLAG_OPTIONS = ['Hallucination', 'Off-topic', 'Unsafe', 'Incomplete'] as const;

const QUALITY_COLORS: Record<string, string> = {
  EXCELLENT: 'text-emerald-600',
  GOOD: 'text-blue-600',
  FAIR: 'text-amber-600',
  POOR: 'text-red-600',
};

export default function EvaluatePage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.taskId as string;

  const { data: item, isPending, error: loadError, refetch } = useNextEvaluation(taskId);
  const { data: progressData } = useTaskProgress(taskId);
  const submitMutation = useSubmitEvaluation();
  const aiMutation = useRequestAISuggestions();

  const [scores, setScores] = useState<ScoreState>({});
  const [comment, setComment] = useState('');
  const [flags, setFlags] = useState<string[]>([]);
  const [flagged, setFlagged] = useState(false);
  const [activeCrit, setActiveCrit] = useState(0);
  const [requestingAi, setRequestingAi] = useState(false);
  const [aiInfo, setAiInfo] = useState<string>('');
  const [aiError, setAiError] = useState<string>('');
  const startedAt = useRef<number>(0);

  const effective = useMemo(() => {
    const taskCriteria = Array.isArray(item?.task?.scoringCriteria)
      ? item.task.scoringCriteria
      : [];
    return taskCriteria.length ? taskCriteria : DEFAULT_CRITERIA;
  }, [item]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    useAuthGuard();
  }, [router]);

  // Seed the per-item timer whenever the shown item changes.
  const rowId = item?.datasetRow?.id;
  useEffect(() => {
    startedAt.current = Date.now();
  }, [rowId]);

  // Reset + seed the form whenever a new item is shown.
  const prevRowRef = useRef<string | undefined>(undefined);
  if (prevRowRef.current !== rowId) {
    prevRowRef.current = rowId;
    const initial: ScoreState = {};
    for (const c of effective) initial[c.dimension] = Math.floor((c.minScore + c.maxScore) / 2);
    setScores(initial);
    setComment('');
    setFlags([]);
    setFlagged(false);
    setActiveCrit(0);
    setAiError('');
  }

  // Auto-apply AI suggested scores once they arrive for this item.
  const aiSuggestions = item?.evaluation?.aiSuggestions;
  const prevAiRef = useRef(aiSuggestions);
  if (prevAiRef.current !== aiSuggestions) {
    prevAiRef.current = aiSuggestions;
    const suggested = aiSuggestions?.suggestedScores;
    if (suggested) {
      setScores((prev) => {
        const merged = { ...prev };
        let changed = false;
        for (const [k, v] of Object.entries(suggested)) {
          if (k in merged) {
            merged[k] = v;
            changed = true;
          }
        }
        return changed ? merged : prev;
      });
    }
  }

  const handleRequestAI = async () => {
    if (!item?.evaluation) return;
    setRequestingAi(true);
    setAiError('');
    try {
      await aiMutation.mutateAsync(item.evaluation.id);
      setAiInfo('AI evaluation queued. This item will refresh with AI suggestions when ready...');

      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        const res = await refetch();
        const suggestions = res.data?.evaluation?.aiSuggestions;
        if (suggestions) {
          clearInterval(poll);
          setAiInfo('AI suggestions ready.');
        } else if (attempts >= 20) {
          clearInterval(poll);
          setAiInfo('AI evaluation still processing — check back later.');
        }
      }, 3000);
    } catch (err) {
      setAiInfo('');
      setAiError(
        err instanceof Error
          ? err.message
          : 'AI suggestion failed — try again, or check that the dataset row has a model response.',
      );
    } finally {
      setRequestingAi(false);
    }
  };

  const applyAIScores = () => {
    const suggested = item?.evaluation?.aiSuggestions?.suggestedScores;
    if (!suggested) return;
    setScores((prev) => {
      const merged = { ...prev };
      for (const [k, v] of Object.entries(suggested)) {
        if (k in merged) merged[k] = v;
      }
      return merged;
    });
  };

  const setScore = (dimension: string, value: number) => {
    setScores((prev) => ({ ...prev, [dimension]: value }));
  };

  const toggleFlag = (flag: string) => {
    setFlags((prev) => (prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]));
  };

  const handleSubmit = async () => {
    if (!item?.datasetRow) return;

    const scoreValues = effective.map((c) => ({
      dimension: c.dimension,
      label: c.label,
      score: scores[c.dimension] ?? Math.floor((c.minScore + c.maxScore) / 2),
    }));

    const weightTotal = effective.reduce((sum, c) => sum + Math.max(0, c.weight || 0), 0) || 1;
    const overall =
      scoreValues.reduce((sum, s, i) => sum + s.score * Math.max(0, effective[i].weight || 0), 0) /
      weightTotal;

    const timeSpentSeconds = Math.floor((Date.now() - startedAt.current) / 1000);
    const tags = [...flags, ...(flagged ? ['Flagged'] : [])];

    await submitMutation.mutateAsync({
      taskId,
      datasetRowId: item.datasetRow.id,
      scores: scoreValues,
      overallScore: Math.round(overall * 10) / 10,
      comment: comment || undefined,
      tags: tags.length ? tags : undefined,
      timeSpentSeconds,
    });
  };

  // Keyboard shortcuts: digits score the active criterion, Tab advances it.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isPending || submitMutation.isPending) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') {
        if (e.key === 'Enter') {
          e.preventDefault();
          void handleSubmit();
        }
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        void handleSubmit();
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        setActiveCrit((prev) => (prev + 1) % Math.max(1, effective.length));
        return;
      }
      const num = parseInt(e.key, 10);
      if (!Number.isNaN(num) && effective[activeCrit]) {
        const c = effective[activeCrit];
        if (num >= c.minScore && num <= c.maxScore) setScore(c.dimension, num);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
          Loading next item…
        </p>
      </div>
    );
  }

  if (item?.completed || !item?.datasetRow) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-6">
        <div className="max-w-md text-center">
          <p className="font-display text-2xl font-semibold text-ink">All caught up!</p>
          <p className="mt-2 text-[14px] text-ink-500">
            {item?.message || 'You have evaluated every item in this task.'}
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

  const row = item.datasetRow;
  const suggestions = item.evaluation?.aiSuggestions;
  const maxScale = Math.max(1, ...effective.map((c) => c.maxScore));
  const totalWeight = effective.reduce((sum, c) => sum + Math.max(0, c.weight || 0), 0) || 1;
  const overall = effective.length
    ? effective.reduce(
        (sum, c, i) =>
          sum +
          (scores[c.dimension] ?? Math.floor((c.minScore + c.maxScore) / 2)) * effective[i].weight,
        0,
      ) / totalWeight
    : 0;

  const error = loadError ?? submitMutation.error;

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-4">
            <Link
              href="/tasks"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-300 text-[15px] text-ink-500 transition-colors hover:bg-paper hover:text-ink"
              aria-label="Back to tasks"
            >
              ✕
            </Link>
            <div>
              <div className="text-[13.5px] font-semibold text-ink">
                {item.task?.name || 'Evaluate'}
              </div>
              <div className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.04em] text-ink-500">
                {TYPE_LABELS[item.task?.type || 'SINGLE'] ?? 'Scoring'} · SINGLE SCORE
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setFlagged((f) => !f)}
              className={cn(
                'rounded-full border font-mono text-[11px] px-3.5 py-1.5 transition-colors',
                flagged
                  ? 'border-ink bg-ink text-white'
                  : 'border-ink-300 text-ink-500 hover:border-ink hover:text-ink',
              )}
            >
              ⚑ {flagged ? 'Flagged' : 'Flag item'}
            </button>
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

      <main className="mx-auto max-w-4xl px-6 pb-40 pt-9">
        {error ? (
          <div className="mb-5 rounded-lg border border-red-900/30 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {error instanceof Error ? error.message : 'Something went wrong.'}
          </div>
        ) : null}
        {aiInfo && (
          <div className="mb-5 rounded-lg border border-blue-900/20 bg-blue-50 px-4 py-3 text-[13px] text-blue-700">
            {aiInfo}
          </div>
        )}
        {aiError && (
          <div className="mb-5 rounded-lg border border-red-900/30 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {aiError}
          </div>
        )}

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
            Prompt · Item #{row.rowIndex + 1}
          </p>
          <p className="text-[15.5px] leading-[1.55]">{row.prompt}</p>
          {row.context && (
            <p className="mt-3.5 border-t border-ink-700 pt-3.5 font-mono text-[11.5px] text-ink-300">
              {row.context}
            </p>
          )}
          {row.expectedOutput && (
            <p className="mt-2 font-mono text-[11.5px] text-ink-300">
              Expected: {row.expectedOutput}
            </p>
          )}
        </section>

        {/* Model responses */}
        {row.modelResponses.length > 0 && (
          <section className="mb-5 space-y-4">
            {row.modelResponses.map((resp, i) => {
              const tokens = (resp.promptTokens ?? 0) + (resp.completionTokens ?? 0);
              return (
                <div
                  key={resp.id}
                  className="rounded-2xl border border-ink-200 bg-white p-5 sm:p-6"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-400">
                        Model response{i > 0 ? ` ${i + 1}` : ''}
                      </span>
                      <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] font-medium text-ink">
                        {resp.modelName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {i === 0 && (
                        <span className="rounded-full border border-ink-200 px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.04em] text-ink-400">
                          AI targets this
                        </span>
                      )}
                      <span className="rounded-full border border-ink-200 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.03em] text-ink-400">
                        {resp.provider}
                      </span>
                    </div>
                  </div>
                  <Markdown className="text-[14px] leading-[1.65] text-ink-600">
                    {resp.response}
                  </Markdown>
                  <p className="mt-3.5 border-t border-ink-100 pt-3.5 font-mono text-[10.5px] text-ink-400">
                    {resp.provider === resp.modelName ? resp.modelName : resp.provider} · {tokens}{' '}
                    tokens · {resp.latencyMs ?? 0}ms
                  </p>
                </div>
              );
            })}
          </section>
        )}

        {/* AI assist */}
        {item.evaluation && (
          <section className="mb-5 rounded-2xl border border-ink-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-400">
                AI assist
              </h2>
              <button
                onClick={() => void handleRequestAI()}
                disabled={requestingAi}
                className="rounded-full border border-ink-300 px-3.5 py-1.5 text-xs transition-colors hover:border-ink disabled:opacity-50"
              >
                {requestingAi ? 'Requesting…' : 'Request AI suggestions'}
              </button>
            </div>
            {suggestions?.reasoning && (
              <div className="mt-4 space-y-2.5 text-[13px]">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'font-semibold',
                      QUALITY_COLORS[suggestions.qualityLabel || ''] || '',
                    )}
                  >
                    {suggestions.qualityLabel}
                  </span>
                  <span className="font-mono text-[11px] text-ink-400">
                    confidence {Math.round((suggestions.confidence ?? 0) * 100)}%
                  </span>
                  {suggestions.hallucinationDetected && (
                    <span className="rounded-full border border-red-800/20 bg-red-50 px-2 py-0.5 text-[11px] text-red-700">
                      Hallucination risk
                    </span>
                  )}
                </div>
                <Markdown>{suggestions.reasoning}</Markdown>
                {suggestions.hallucinationDetails && (
                  <Markdown className="text-[11.5px] text-red-700/80">
                    {suggestions.hallucinationDetails}
                  </Markdown>
                )}
                {suggestions.suggestedScores && (
                  <button
                    onClick={applyAIScores}
                    className="rounded-full border border-ink-300 px-3.5 py-1.5 text-[12px] transition-colors hover:border-ink"
                  >
                    Apply suggested scores
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {/* Rubric */}
        <section className="rounded-2xl border border-ink-200 bg-white p-5 sm:p-6">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <h2 className="font-display text-[15px] font-semibold text-ink">Score this response</h2>
            <span className="whitespace-nowrap rounded-full border border-ink-200 bg-paper px-3.5 py-1.5 font-mono text-[12.5px] font-semibold text-ink">
              Overall: {overall.toFixed(1)} / {maxScale}
            </span>
          </div>
          <p className="mb-4 text-[12px] text-ink-500">
            Rate each dimension. Overall score is the weighted average.
          </p>

          {effective.map((c, ci) => {
            const weightPct = totalWeight > 0 ? Math.round((c.weight / totalWeight) * 100) : 0;
            const value = scores[c.dimension];
            return (
              <div
                key={c.dimension}
                className={cn('border-t border-ink-100 py-4', ci === 0 && 'border-t-0 pt-1.5')}
              >
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-[13.5px] font-semibold text-ink">{c.label}</span>
                  <span className="font-mono text-[11px] text-ink-400">
                    Weight {weightPct}%{c.maxScore !== maxScale ? ` · / ${c.maxScore}` : ''}
                  </span>
                </div>
                {c.description && (
                  <p className="mb-3 text-[11.5px] leading-[1.5] text-ink-500">{c.description}</p>
                )}
                <div
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${Math.max(
                      1,
                      c.maxScore - c.minScore + 1,
                    )}, minmax(0, 1fr))`,
                  }}
                >
                  {Array.from(
                    { length: c.maxScore - c.minScore + 1 },
                    (_, i) => c.minScore + i,
                  ).map((n) => {
                    const active = ci === activeCrit;
                    const selected = value === n;
                    return (
                      <button
                        key={n}
                        onClick={() => setScore(c.dimension, n)}
                        className={cn(
                          'rounded-lg border-[1.5px] py-2.5 text-center font-mono text-[13px] font-semibold transition-colors',
                          selected
                            ? 'border-ink bg-ink text-white'
                            : 'border-ink-300 text-ink-500 hover:border-ink',
                          active && !selected && 'ring-2 ring-ink/20 ring-offset-1',
                        )}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-1.5 flex justify-between font-mono text-[9.5px] uppercase tracking-[0.03em] text-ink-400">
                  <span>Poor</span>
                  <span>Excellent</span>
                </div>
              </div>
            );
          })}

          {/* Flags */}
          <div className="mt-4 flex flex-wrap gap-2">
            {FLAG_OPTIONS.map((flag) => (
              <button
                key={flag}
                onClick={() => toggleFlag(flag)}
                className={cn(
                  'rounded-full px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.04em] transition-colors',
                  flags.includes(flag)
                    ? 'border border-ink bg-ink text-white'
                    : 'border border-ink-300 text-ink-500 hover:border-ink hover:text-ink',
                )}
              >
                {flag}
              </button>
            ))}
          </div>
        </section>

        {/* Notes */}
        <section className="mt-5">
          <label className="mb-2 block text-[12px] font-semibold text-ink">
            Notes <span className="font-normal text-ink-400">(optional)</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Anything worth flagging for the next reviewer?"
            className="w-full resize-y rounded-md border border-ink-300 bg-white px-3.5 py-3 text-[13.5px] outline-none transition-colors focus:border-ink"
          />
        </section>
      </main>

      {/* Action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink-200 bg-paper/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-6 py-4">
          <div className="hidden items-center gap-4 font-mono text-[11px] text-ink-400 md:flex">
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-ink-300 bg-white px-1.5 py-0.5 text-ink-500">
                1
              </kbd>
              –
              <kbd className="rounded border border-ink-300 bg-white px-1.5 py-0.5 text-ink-500">
                {maxScale}
              </kbd>
              score
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-ink-300 bg-white px-1.5 py-0.5 text-ink-500">
                Tab
              </kbd>
              next criterion
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
            <Button onClick={() => void handleSubmit()} disabled={submitMutation.isPending}>
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
