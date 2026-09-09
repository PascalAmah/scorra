'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChartEvaluationIcon } from 'hugeicons-react';
import type {
  AgreementMetrics,
  DimensionBreakdown,
  EvaluatorMetrics,
  TaskScoreAnalytics,
} from '@scorra/types';

import { AppShell } from '@/components/dashboard/shell';
import { Topbar } from '@/components/dashboard/topbar';
import { StatCard } from '@/components/dashboard/stat-card';
import { Panel } from '@/components/dashboard/panel';
import { Badge } from '@/components/ui/badge';
import { useDashboardSummary } from '@/hooks/use-dashboard';
import { useOrganizations } from '@/hooks/use-organization';
import { useTasks } from '@/hooks/use-tasks';
import { api } from '@/lib/api';
import { formatNumber, formatRelativeTime } from '@/lib/utils';
import { formatSeconds, initialsOf } from '@/lib/task-utils';

const MAX_BAR = 10;

export default function AnalyticsPage() {
  const router = useRouter();
  const { data: summary, isPending } = useDashboardSummary();
  const { data: orgsData } = useOrganizations();
  const org = orgsData?.[0] ?? null;
  const orgName = org?.name ?? null;

  const { data: tasksData } = useTasks({ page: 1, limit: 100 });
  const tasks = useMemo(() => tasksData?.data ?? [], [tasksData]);

  const [evaluators, setEvaluators] = useState<EvaluatorMetrics[]>([]);
  const [selectedTask, setSelectedTask] = useState('');
  const [agreement, setAgreement] = useState<AgreementMetrics | null>(null);
  const [scores, setScores] = useState<TaskScoreAnalytics | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!api.isAuthenticated) {
      router.replace('/login');
      return;
    }
    api
      .getEvaluatorMetrics()
      .catch(() => [] as EvaluatorMetrics[])
      .then(setEvaluators);
  }, [router]);

  const handleTaskChange = (taskId: string) => {
    setSelectedTask(taskId);
    setAgreement(null);
    setScores(null);
    if (!taskId) return;
    const fetchTaskAnalytics = async () => {
      setTaskLoading(true);
      try {
        const [agreementData, scoresData] = await Promise.all([
          api.getTaskAgreement(taskId),
          api.getTaskScores(taskId),
        ]);
        setAgreement(agreementData);
        setScores(scoresData);
      } catch (err) {
        console.error('Failed to load task analytics', err);
      } finally {
        setTaskLoading(false);
      }
    };
    void fetchTaskAnalytics();
  };

  const selectedTaskName = useMemo(
    () => tasks.find((t) => t.id === selectedTask)?.name,
    [tasks, selectedTask],
  );

  const avgAgreement =
    evaluators.length > 0
      ? Math.round(
          (evaluators.reduce((sum, e) => sum + e.agreementRate, 0) / evaluators.length) * 100,
        )
      : null;

  const maxDistributionCount = Math.max(
    1,
    ...(scores?.distribution.map((d) => d.count) ?? [1]),
  );

  return (
    <AppShell>
      <Topbar
        title="Analytics"
        sub={`${orgName ?? 'Organization'} · LIVE`}
        actions={
          <select
            value={selectedTask}
            onChange={(e) => handleTaskChange(e.target.value)}
            className="rounded-sm border border-ink-300 bg-white px-3 py-2 font-mono text-[12px] text-ink outline-none transition-colors focus:border-ink"
          >
            <option value="">All tasks</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.name}
              </option>
            ))}
          </select>
        }
      />

      <div className="px-5 pb-14 pt-7 md:px-9">
        {isPending ? (
          <div className="flex items-center justify-center rounded-2xl border border-ink-200 bg-white py-24">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
              Loading…
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                label="Total evaluations"
                value={formatNumber(summary?.totalEvaluations ?? 0)}
                delta="across all tasks"
                up={summary != null}
              />
              <StatCard
                label="Agreement rate"
                value={avgAgreement != null ? `${avgAgreement}%` : '—'}
                delta="avg across evaluators"
                up={avgAgreement != null}
              />
              <StatCard
                label="Avg score"
                value={summary?.averageScoreThisMonth != null ? `${summary.averageScoreThisMonth.toFixed(1)} / 10` : '—'}
                delta="this month"
                up={summary?.averageScoreThisMonth != null}
              />
              <StatCard
                label="Hallucination rate"
                value={summary?.hallucinationRateThisMonth != null ? `${Math.round(summary.hallucinationRateThisMonth * 100)}%` : '—'}
                delta="this month"
                up={summary?.hallucinationRateThisMonth != null}
              />
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
              <Panel
                title="Agreement"
                action={
                  selectedTaskName ? (
                    <Badge variant="dot">{selectedTaskName}</Badge>
                  ) : undefined
                }
              >
                {taskLoading ? (
                  <p className="py-10 text-center font-mono text-[11.5px] text-ink-400">
                    Loading task analytics…
                  </p>
                ) : agreement ? (
                  <>
                    <div className="mb-5 grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-ink-200 px-4 py-3">
                        <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-500">
                          Overall agreement
                        </div>
                        <div className="mt-1 font-display text-2xl font-semibold text-ink">
                          {Math.round(agreement.overallAgreementRate * 100)}%
                        </div>
                      </div>
                      <div className="rounded-lg border border-ink-200 px-4 py-3">
                        <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-500">
                          Fleiss&apos;s kappa
                        </div>
                        <div className="mt-1 font-display text-2xl font-semibold text-ink">
                          {agreement.fleissKappa != null ? agreement.fleissKappa.toFixed(3) : '—'}
                        </div>
                      </div>
                    </div>
                    {agreement.pairwiseAgreements.length === 0 ? (
                      <p className="py-4 text-center font-mono text-[11.5px] text-ink-400">
                        No co-rated rows yet.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-[13px] min-w-[420px]">
                          <thead>
                            <tr className="border-b border-ink-200 font-mono text-[10.5px] uppercase tracking-[0.06em] text-ink-500">
                              <th className="py-2.5 pr-4">Pair</th>
                              <th className="py-2.5 pr-4">Agreement</th>
                              <th className="py-2.5">Cohen&apos;s kappa</th>
                            </tr>
                          </thead>
                          <tbody>
                            {agreement.pairwiseAgreements.map((pair) => (
                              <tr
                                key={`${pair.evaluatorAId}-${pair.evaluatorBId}`}
                                className="border-b border-ink-100 last:border-b-0"
                              >
                                <td className="py-2.5 pr-4 font-mono text-[12px] text-ink-500">
                                  {pair.evaluatorAId.slice(0, 8)}… vs {pair.evaluatorBId.slice(0, 8)}…
                                </td>
                                <td className="py-2.5 pr-4 font-mono text-[12px] text-ink">
                                  {Math.round(pair.agreementRate * 100)}%
                                </td>
                                <td className="py-2.5 font-mono text-[12px] text-ink-500">
                                  {pair.cohensKappa != null ? pair.cohensKappa.toFixed(3) : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="py-10 text-center font-mono text-[11.5px] text-ink-400">
                    Select a task to see agreement analytics.
                  </p>
                )}
              </Panel>

              <div className="flex min-w-0 flex-col gap-5">
                <Panel title="Score distribution">
                  {taskLoading ? (
                    <p className="py-10 text-center font-mono text-[11.5px] text-ink-400">Loading…</p>
                  ) : scores ? (
                    <ul className="space-y-3">
                      {scores.distribution.map((bucket) => (
                        <li key={bucket.bucket} className="flex items-center gap-3">
                          <span className="w-14 shrink-0 font-mono text-[11.5px] text-ink-500">
                            {bucket.bucket}
                          </span>
                          <span className="h-4 flex-1 overflow-hidden rounded-sm bg-ink-100">
                            <span
                              className="block h-full rounded-sm bg-ink"
                              style={{ width: `${(bucket.count / maxDistributionCount) * 100}%` }}
                            />
                          </span>
                          <span className="w-12 shrink-0 text-right font-mono text-[11.5px] text-ink-500">
                            {bucket.count}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-10 text-center font-mono text-[11.5px] text-ink-400">
                      No scores yet.
                    </p>
                  )}
                </Panel>

                <Panel title="Scores">
                  {taskLoading ? (
                    <p className="py-10 text-center font-mono text-[11.5px] text-ink-400">Loading…</p>
                  ) : scores ? (
                    <>
                      <div className="grid grid-cols-4 gap-3 text-center">
                        <ScoreMini label="Avg" value={scores.averageScore} />
                        <ScoreMini label="Median" value={scores.medianScore} />
                        <ScoreMini label="Min" value={scores.minScore} />
                        <ScoreMini label="Max" value={scores.maxScore} />
                      </div>
                      {scores.dimensions.length > 0 && (
                        <div className="mt-5">
                          <p className="mb-2.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-500">
                            Dimension breakdown
                          </p>
                          <div className="space-y-2.5">
                            {scores.dimensions.map((dimension) => (
                              <DimensionBar key={dimension.label} dimension={dimension} />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="py-10 text-center font-mono text-[11.5px] text-ink-400">
                      Select a task to load scores.
                    </p>
                  )}
                </Panel>
              </div>
            </div>

            <div className="mt-5">
              <Panel
                title="Evaluator performance"
                action={
                  <span className="font-mono text-[11.5px] text-ink-500">
                    {evaluators.length} EVALUATORS
                  </span>
                }
              >
                {evaluators.length === 0 ? (
                  <p className="py-6 text-center font-mono text-[11.5px] text-ink-400">
                    No evaluator activity yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[13px] min-w-[560px]">
                      <thead>
                        <tr className="border-b border-ink-200 bg-paper text-left font-mono text-[10.5px] uppercase tracking-[0.06em] text-ink-500">
                          <th className="px-4 py-3.5">Evaluator</th>
                          <th className="px-4 py-3.5">Completed</th>
                          <th className="px-4 py-3.5">Agreement</th>
                          <th className="px-4 py-3.5">Avg time</th>
                          <th className="px-4 py-3.5">Avg score</th>
                          <th className="px-4 py-3.5">Completion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evaluators.map((evaluator) => {
                          const pct = Math.round(evaluator.agreementRate * 100);
                          return (
                            <tr
                              key={evaluator.evaluatorId}
                              className="border-b border-ink-100 last:border-b-0 hover:bg-paper"
                            >
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-800 font-display text-[10px] font-semibold text-white">
                                    {initialsOf(evaluator.evaluatorName)}
                                  </span>
                                  <span className="font-medium text-ink">{evaluator.evaluatorName}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 font-mono text-[12.5px] text-ink-500">
                                {formatNumber(evaluator.totalEvaluations)}
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[12.5px] text-ink-500">{pct}%</span>
                                  <span className="h-1 w-14 overflow-hidden rounded-full bg-ink-200">
                                    <span
                                      className="block h-full rounded-full bg-ink"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 font-mono text-[12.5px] text-ink-500">
                                {formatSeconds(evaluator.averageTimePerEvaluation)}
                              </td>
                              <td className="px-4 py-3.5 font-mono text-[12.5px] text-ink-500">
                                {evaluator.averageScore.toFixed(1)}
                              </td>
                              <td className="px-4 py-3.5 font-mono text-[12.5px] text-ink-500">
                                {Math.round(evaluator.completionRate * 100)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </div>

            <div className="mt-5">
              <Panel title="Recent activity">
                {!summary || summary.recentActivity.length === 0 ? (
                  <p className="py-6 text-center font-mono text-[11.5px] text-ink-400">
                    No recent activity.
                  </p>
                ) : (
                  <ul>
                    {summary.recentActivity.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-start gap-3 border-b border-ink-100 py-3 last:border-b-0"
                      >
                        <ChartEvaluationIcon size={14} className="mt-0.5 shrink-0 text-ink" />
                        <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-ink-600">
                          <span className="font-semibold text-ink">{entry.userName}</span>
                          {entry.description}
                        </p>
                        <span className="shrink-0 font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-400">
                          {formatRelativeTime(entry.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function ScoreMini({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg border border-ink-200 px-2 py-2.5">
      <div className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-400">{label}</div>
      <div className="mt-0.5 font-display text-lg font-semibold text-ink">
        {value != null ? value.toFixed(1) : '—'}
      </div>
    </div>
  );
}

function DimensionBar({ dimension }: { dimension: DimensionBreakdown }) {
  const pct = Math.min(100, (dimension.averageScore / MAX_BAR) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 truncate text-sm text-ink">{dimension.label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-200">
        <span className="block h-full rounded-full bg-ink" style={{ width: `${pct}%` }} />
      </span>
      <span className="w-16 text-right font-mono text-[12px] text-ink-500">
        {dimension.averageScore.toFixed(1)}
      </span>
    </div>
  );
}