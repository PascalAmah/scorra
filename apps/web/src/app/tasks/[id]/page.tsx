'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Download01Icon } from 'hugeicons-react';
import type { PairwiseComparison, RankingResultItem } from '@scorra/types';

import { AppShell } from '@/components/dashboard/shell';
import { Panel } from '@/components/dashboard/panel';
import { Button } from '@/components/ui/button';
import { TaskHeader } from '@/components/tasks/task-header';
import { TaskStat } from '@/components/tasks/task-stat';
import {
  useActivateTask,
  useComparisonResults,
  usePauseTask,
  useRankingResults,
  useTask,
  useTaskAgreement,
  useTaskProgress,
  useTaskResults,
} from '@/hooks/use-tasks';
import { useUsers } from '@/hooks/use-users';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api';
import { formatDate, formatNumber, formatRelativeTime } from '@/lib/utils';
import { isOrgAdmin } from '@/lib/permissions';
import { formatSeconds, initialsOf, verdictLabel } from '@/lib/task-utils';

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;

  const [error, setError] = useState('');

  const user = useAuthStore((s) => s.user);
  const isAdmin = isOrgAdmin(user);

  const { data: task, isPending, isError, error: taskError } = useTask(taskId);
  const { data: progress } = useTaskProgress(taskId);
  const { data: resultsData } = useTaskResults(taskId, { limit: 100 });
  const { data: agreement, isError: agreementError } = useTaskAgreement(taskId);
  const { data: comparisons } = useComparisonResults(taskId);
  const { data: rankings } = useRankingResults(taskId);
  const { data: usersData } = useUsers();

  const activateMutation = useActivateTask(taskId);
  const pauseMutation = usePauseTask(taskId);

  const userById = useMemo(
    () => new Map((usersData ?? []).map((m) => [m.userId, m.user])),
    [usersData],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!api.isAuthenticated) {
      router.replace('/login');
    }
  }, [router]);

  const isPairwise = task?.type === 'PAIRWISE';
  const isRanking = task?.type === 'RANKING';
  const evaluations = useMemo(() => resultsData?.data ?? [], [resultsData]);

  // For evaluators, filter submissions to just their own
  const mySubmissions = useMemo(() => {
    const all = isPairwise
      ? (comparisons ?? [])
      : isRanking
        ? (rankings ?? [])
        : evaluations;
    if (isAdmin) return all;
    return all.filter((s) => s.evaluatorId === user?.id);
  }, [isPairwise, isRanking, comparisons, rankings, evaluations, isAdmin, user?.id]);

  const total = useMemo(
    () => progress?.totalRows ?? task?.dataset?.rowCount ?? 0,
    [progress, task],
  );
  const completed = useMemo(
    () =>
      isAdmin
        ? (progress?.completedEvaluations ??
          (isPairwise ? (comparisons ?? []).length : evaluations.length))
        : (progress?.myCompleted ?? mySubmissions.length),
    [progress, isAdmin, isPairwise, comparisons, evaluations, mySubmissions],
  );
  const pct = useMemo(() => {
    if (!total) return 0;
    return Math.min(100, Math.round((completed / total) * 100));
  }, [total, completed]);
  const remaining = Math.max(0, total - completed);

  const avgTime = useMemo(() => {
    const times = mySubmissions
      .map((s) => (s as { timeSpentSeconds?: number | null }).timeSpentSeconds)
      .filter((t): t is number => typeof t === 'number' && t > 0);
    if (!times.length) return null;
    return times.reduce((a, b) => a + b, 0) / times.length;
  }, [mySubmissions]);

  const byEvaluator = useMemo(() => {
    const map = new Map<string, number>();
    const source = isAdmin
      ? isPairwise
        ? (comparisons ?? [])
        : isRanking
          ? (rankings ?? [])
          : evaluations
      : mySubmissions;
    for (const s of source) {
      map.set(s.evaluatorId, (map.get(s.evaluatorId) ?? 0) + 1);
    }
    return map;
  }, [isAdmin, isPairwise, isRanking, comparisons, rankings, evaluations, mySubmissions]);

  const recent = useMemo(() => {
    return [...mySubmissions]
      .sort((a, b) => submissionTime(b).getTime() - submissionTime(a).getTime())
      .slice(0, 5);
  }, [mySubmissions]);

  const assignedIds = useMemo(
    () => task?.assignedEvaluatorIds ?? task?.assignments?.map((a) => a.evaluatorId) ?? [],
    [task],
  );

  const criteriaTotal = useMemo(
    () => (task?.scoringCriteria ?? []).reduce((sum, c) => sum + (c.weight || 0), 0),
    [task],
  );

  const handleActivate = async () => {
    setError('');
    try {
      await activateMutation.mutateAsync();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate task');
    }
  };

  const handlePause = async () => {
    setError('');
    try {
      await pauseMutation.mutateAsync();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause task');
    }
  };

  if (isError && !isPending) {
    return (
      <AppShell>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
            Unable to load this task
          </p>
          <p className="max-w-md text-sm text-ink-500">
            {taskError instanceof Error ? taskError.message : 'The task could not be loaded.'}
          </p>
          <Button variant="ghost" asChild>
            <Link href="/tasks">Back to tasks</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  if (isPending || !task) {
    return (
      <AppShell>
        <div className="flex h-[60vh] items-center justify-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">Loading…</p>
        </div>
      </AppShell>
    );
  }

  const actions = isAdmin ? (
    <>
      <Button variant="ghost" asChild>
        <Link href={`/tasks/${taskId}/edit`}>Edit task</Link>
      </Button>
      {task.status === 'ACTIVE' && (
        <Button variant="ghost" onClick={handlePause} disabled={pauseMutation.isPending}>
          {pauseMutation.isPending ? 'Pausing…' : 'Pause'}
        </Button>
      )}
      {task.status === 'DRAFT' || task.status === 'PAUSED' ? (
        <Button onClick={handleActivate} disabled={activateMutation.isPending}>
          {activateMutation.isPending ? 'Activating…' : 'Activate task'}
        </Button>
      ) : (
        <Button asChild>
          <Link href="/exports">
            <Download01Icon size={14} />
            Export results
          </Link>
        </Button>
      )}
    </>
  ) : task.status === 'ACTIVE' && assignedIds.includes(user?.id ?? '') ? (
    <Button asChild>
      <Link
        href={
          task.type === 'PAIRWISE'
            ? `/compare/${taskId}`
            : task.type === 'RANKING'
              ? `/rank/${taskId}`
              : `/evaluate/${taskId}`
        }
      >
        Start evaluating
      </Link>
    </Button>
  ) : null;

  const agreementRate = agreement?.overallAgreementRate;
  const kappa = agreement?.fleissKappa;

  return (
    <AppShell>
      <TaskHeader task={task} activeTab="overview" actions={actions} showResultsTab={isAdmin} />

      <div className="px-5 pb-14 pt-6 md:px-9">
        {error && (
          <div className="mb-4 rounded-md border border-red-900/30 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TaskStat
            label="Total items"
            value={formatNumber(total)}
            delta={`across ${formatNumber(total)} ${isPairwise ? 'pairs' : 'rows'}`}
          />
          <TaskStat
            label="Items covered"
            value={formatNumber(completed)}
            delta={`${formatNumber(remaining)} not yet touched`}
          />
          {isAdmin && !isRanking && (
            <TaskStat
              label="Agreement rate"
              value={agreementRate != null ? `${Math.round(agreementRate)}%` : '—'}
              delta={
                agreementError
                  ? 'No agreement data'
                  : `κ = ${kappa != null ? kappa.toFixed(2) : '—'}`
              }
            />
          )}
          <TaskStat
            label="Avg. time / item"
            value={formatSeconds(avgTime)}
            delta={`${formatNumber(completed)} evaluated`}
          />
        </div>

        <div className="mt-4 rounded-2xl border border-ink-200 bg-white p-5">
          <div className="mb-2.5 flex items-center justify-between text-[13px]">
            <span className="text-ink-500">Overall progress</span>
            <b className="font-mono text-ink">
              {formatNumber(completed)} / {formatNumber(total)} · {pct}%
            </b>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink-200">
            <span className="block h-full rounded-full bg-ink" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div className="min-w-0 space-y-4">
            {isAdmin && (
              <Panel title="Assigned evaluators">
                {assignedIds.length === 0 ? (
                  <p className="py-2 font-mono text-[11.5px] text-ink-400">
                    No evaluators assigned.
                  </p>
                ) : (
                  assignedIds.map((id) => {
                    const user = userById.get(id);
                    const name = user?.name ?? `Evaluator ${id.slice(0, 8)}`;
                    const count = byEvaluator.get(id) ?? 0;
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-3.5 border-b border-ink-100 py-3 last:border-b-0"
                      >
                        <span className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-ink-800 font-display text-xs font-semibold text-white">
                          {initialsOf(name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-semibold text-ink">{name}</p>
                          <p className="font-mono text-[10.5px] text-ink-400">
                            {user?.email ?? 'EVALUATOR'}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-mono text-[12.5px] font-semibold text-ink">
                            {count > 0 ? `${count} submitted` : '—'}
                          </p>
                          <p className="mt-0.5 font-mono text-[10.5px] text-ink-400">
                            {count > 0
                              ? `${Math.round((count / Math.max(total, 1)) * 100)}%`
                              : 'Assigned'}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </Panel>
            )}

            <Panel title="Recent submissions">
              {recent.length === 0 ? (
                <p className="py-2 font-mono text-[11.5px] text-ink-400">
                  {isAdmin
                    ? 'No submissions yet — results will appear here as evaluators work through the'
                    : 'No submissions yet — your evaluations will appear here once you start scoring.'}
                </p>
              ) : (
                recent.map((s) => {
                  const name =
                    userById.get(s.evaluatorId)?.name ?? `Evaluator ${s.evaluatorId.slice(0, 8)}`;
                  return (
                    <div
                      key={s.id}
                      className="flex gap-2.5 border-b border-ink-100 py-2.5 last:border-b-0"
                    >
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-400" />
                      <div className="min-w-0">
                        <p className="text-[12.5px] text-ink">
                          <b className="font-semibold">{name}</b>{' '}
                          {isPairwise ? (
                            <>
                              voted{' '}
                              <span className="font-mono text-[10px] uppercase tracking-[0.04em] text-ink-600">
                                {verdictLabel((s as PairwiseComparison).verdict)}
                              </span>{' '}
                              on item{' '}
                              <span className="font-mono text-ink-600">
                                #
                                {(s as PairwiseComparison & { datasetRow?: { rowIndex?: number } })
                                  .datasetRow?.rowIndex ?? 0}
                              </span>
                            </>
                          ) : isRanking ? (
                            <>
                              ranked{' '}
                              <span className="font-mono text-[10px] uppercase tracking-[0.04em] text-ink-600">
                                {(s as RankingResultItem)
                                  .entries.map((e) => e.modelName)
                                  .join(' → ')}
                              </span>{' '}
                              on item{' '}
                              <span className="font-mono text-ink-600">
                                #
                                {(s as RankingResultItem & { datasetRow?: { rowIndex?: number } })
                                  .datasetRow?.rowIndex ?? 0}
                              </span>
                            </>
                          ) : (
                            <>
                              scored{' '}
                              <b className="font-semibold">
                                {formatScore(s as (typeof evaluations)[number])}
                              </b>{' '}
                              on item{' '}
                              <span className="font-mono text-ink-600">
                                #{rowIndexOf(s as (typeof evaluations)[number])}
                              </span>
                            </>
                          )}
                        </p>
                        <p className="mt-0.5 font-mono text-[10.5px] uppercase text-ink-400">
                          {formatRelativeTime(submissionTime(s))}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel title="Evaluation criteria">
              {task.scoringCriteria.length === 0 ? (
                <p className="py-2 font-mono text-[11.5px] text-ink-400">No criteria defined.</p>
              ) : (
                task.scoringCriteria.map((c) => {
                  const weightPct =
                    criteriaTotal > 0 ? Math.round((c.weight / criteriaTotal) * 100) : 0;
                  return (
                    <div
                      key={`${c.dimension}-${c.label}`}
                      className="border-b border-ink-100 py-3 last:border-b-0"
                    >
                      <div className="mb-1.5 flex items-center justify-between text-[13px]">
                        <span className="font-semibold text-ink">{c.label}</span>
                        <span className="font-mono text-ink-500">{weightPct}%</span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-ink-200">
                        <span
                          className="block h-full rounded-full bg-ink"
                          style={{ width: `${weightPct}%` }}
                        />
                      </div>
                      {c.description && (
                        <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-500">
                          {c.description}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </Panel>

            <Panel title="Task settings">
              <div className="divide-y divide-ink-100">
                {[
                  ['Evaluation type', task.type],
                  ['Status', task.status],
                  ['Dataset', task.dataset?.name ?? '—'],
                  ['Rows', formatNumber(total)],
                  ['Due date', task.dueDate ? formatDate(task.dueDate) : '—'],
                  [
                    'Created',
                    `${formatDate(task.createdAt)}${task.createdBy?.name ? ` · ${task.createdBy.name}` : ''}`,
                  ],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2.5 text-[13px]">
                    <span className="text-ink-500">{k}</span>
                    <span className="max-w-[60%] truncate font-mono font-semibold text-ink">
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function formatScore(s: {
  overallScore?: number | null;
  scores?: Array<{ score: number }>;
}): string {
  if (s.overallScore != null) return s.overallScore.toFixed(1);
  if (s.scores?.length) return `${s.scores[0].score}`;
  return '—';
}

function rowIndexOf(s: { datasetRow?: { rowIndex?: number } }): number {
  return s.datasetRow?.rowIndex ?? 0;
}

/** When a submission was last acted on — RANKING results have no updatedAt. */
function submissionTime(s: {
  submittedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  createdAt: Date | string;
}): Date {
  return new Date((s.submittedAt ?? s.updatedAt ?? s.createdAt) as Date | string);
}
