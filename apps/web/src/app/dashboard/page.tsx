'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  Database01Icon,
  Diamond01Icon,
  RankingIcon,
} from 'hugeicons-react';
import { AppShell } from '@/components/dashboard/shell';
import { Topbar } from '@/components/dashboard/topbar';
import { StatCard } from '@/components/dashboard/stat-card';
import { Panel } from '@/components/dashboard/panel';
import { Quickstart } from '@/components/dashboard/quickstart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth-store';
import { useDashboardSummary } from '@/hooks/use-dashboard';
import { useDatasets } from '@/hooks/use-datasets';
import { useTasks } from '@/hooks/use-tasks';
import { useOrganizations } from '@/hooks/use-organization';
import { InviteModal } from '@/components/organization/invite-modal';
import { Target01Icon } from 'hugeicons-react';
import type { DatasetRow, TaskRow } from '@/types/dashboard.types';
import { cn, formatNumber, formatRelativeTime } from '@/lib/utils';
import { progressOf, TYPE_LABELS } from '@/lib/task-utils';
import { isOrgAdmin } from '@/lib/permissions';

const TYPE_ICONS: Record<
  string,
  React.ComponentType<{ size?: number | string; className?: string }>
> = {
  SINGLE: Diamond01Icon,
  PAIRWISE: CheckmarkCircle01Icon,
  RANKING: RankingIcon,
};

const EASE = [0.16, 1, 0.3, 1] as const;

const CONTAINER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const ITEM = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

function ViewAll({ href, label = 'View all' }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-500 transition-colors hover:text-ink"
    >
      {label}
      <ArrowRight01Icon size={12} className="transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function TaskRow({ task }: { task: TaskRow }) {
  return (
    <li className="flex items-center gap-3.5 border-b border-ink-100 py-3.5 last:border-b-0">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-200 bg-paper">
        <task.icon size={15} className="text-ink" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[13.5px] font-semibold text-ink">{task.title}</p>
          <Badge variant={task.badge.solid ? 'solid' : 'outline'}>{task.badge.label}</Badge>
        </div>
        <div className="mt-1.5 flex items-center gap-3">
          <p className="truncate font-mono text-[10.5px] text-ink-500">{task.sub}</p>
          <div className="ml-auto h-1 min-w-10 flex-1 overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full bg-ink transition-all"
              style={{ width: `${task.pct}%` }}
            />
          </div>
          <span className="w-8 text-right font-mono text-[10.5px] text-ink-500">{task.pct}%</span>
        </div>
      </div>
    </li>
  );
}

function DatasetRow({ row }: { row: DatasetRow }) {
  return (
    <li className="flex items-center gap-3.5 border-b border-ink-100 py-3.5 last:border-b-0">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-200 bg-paper">
        <row.icon size={15} className="text-ink" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-[12.5px] font-medium text-ink">{row.name}</p>
        <p className="mt-0.5 truncate font-mono text-[10.5px] text-ink-500">{row.meta}</p>
      </div>
      <Badge variant={row.badge.solid ? 'solid' : 'outline'}>{row.badge.label}</Badge>
    </li>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [mounted, setMounted] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: summary } = useDashboardSummary();
  const { data: tasksData } = useTasks({ page: 1, limit: 50 });
  const { data: datasetsData } = useDatasets({ page: 1, limit: 20 });

  const user = useAuthStore((s) => s.user);
  const isAdmin = isOrgAdmin(user);

  const { data: orgs } = useOrganizations();
  const hasOrg = Boolean(user) && (orgs ?? []).length > 0;

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useAuthGuard();

  const taskRows = useMemo<TaskRow[]>(
    () =>
      (tasksData?.data ?? []).map((task) => {
        const pct = progressOf(task, { mine: !isAdmin });
        return {
          id: task.id,
          type: task.type,
          icon: TYPE_ICONS[task.type] ?? Diamond01Icon,
          title: task.name,
          sub: `${task.dataset?.name ?? 'Dataset'} · ${TYPE_LABELS[task.type] ?? task.type}`,
          badge: { label: task.status, solid: task.status === 'ACTIVE' },
          pct,
        };
      }),
    [tasksData, isAdmin],
  );

  const datasetRows = useMemo<DatasetRow[]>(
    () =>
      (datasetsData?.data ?? []).map((ds) => ({
        icon: Database01Icon,
        name: ds.name,
        meta: `${formatNumber(ds.rowCount)} rows · ${ds.format} · updated ${formatRelativeTime(ds.updatedAt)}`,
        badge: { label: ds.status, solid: ds.status === 'READY' },
      })),
    [datasetsData],
  );

  const activity = useMemo(() => summary?.recentActivity ?? [], [summary]);

  if (!mounted || !accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-500">Loading…</p>
      </div>
    );
  }

  if (!hasOrg) {
    return (
      <AppShell>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-[15px] font-semibold text-ink">No organization access</p>
          <p className="max-w-sm text-[13px] text-ink-500">
            You don&apos;t belong to any organization. Ask an admin to invite you, or sign out and
            create a new account.
          </p>
          <Button
            variant="ghost"
            onClick={() => {
              useAuthStore.getState().clearSession();
              router.push('/');
            }}
          >
            Sign out
          </Button>
        </div>
      </AppShell>
    );
  }

  const avgScore = summary?.averageScoreThisMonth;
  const hallucinationRate = summary?.hallucinationRateThisMonth;

  return (
    <AppShell>
      <Topbar
        title="Dashboard"
        sub={isAdmin ? 'OVERVIEW · LIVE DATA' : 'MY ASSIGNED TASKS'}
        actions={
          isAdmin ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setInviteOpen(true)}>
                Invite evaluator
              </Button>
              <Button size="sm" asChild>
                <Link href="/tasks/new">+ New task</Link>
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="px-5 pb-14 pt-7 md:px-9">
        {isAdmin ? (
          <>
            <motion.div
              variants={CONTAINER}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 gap-4 lg:grid-cols-4"
            >
              <motion.div variants={ITEM}>
                <StatCard
                  label="Evaluations"
                  value={formatNumber(summary?.totalEvaluations ?? 0)}
                  delta="across all tasks"
                  up={summary != null}
                />
              </motion.div>
              <motion.div variants={ITEM}>
                <StatCard
                  label="Avg score"
                  value={avgScore != null ? `${avgScore.toFixed(1)} / 10` : '—'}
                  delta="this month"
                  up={avgScore != null}
                />
              </motion.div>
              <motion.div variants={ITEM}>
                <StatCard
                  label="Hallucination rate"
                  value={hallucinationRate != null ? `${hallucinationRate.toFixed(1)}%` : '—'}
                  delta="this month"
                  up={hallucinationRate != null}
                />
              </motion.div>
              <motion.div variants={ITEM}>
                <StatCard
                  label="Active evaluators"
                  value={formatNumber(summary?.activeEvaluators ?? 0)}
                  delta="assigned evaluators"
                  up={summary != null}
                />
              </motion.div>
            </motion.div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
              <div className="flex min-w-0 flex-col gap-5">
                <Panel title="Evaluation tasks" action={<ViewAll href="/tasks" />}>
                  {taskRows.length === 0 ? (
                    <p className="py-4 text-center font-mono text-[11px] text-ink-400">
                      No tasks yet.
                    </p>
                  ) : (
                    <ul>
                      {taskRows.map((task) => (
                        <TaskRow key={task.title} task={task} />
                      ))}
                    </ul>
                  )}
                </Panel>

                <Panel title="Datasets" action={<ViewAll href="/datasets" />}>
                  {datasetRows.length === 0 ? (
                    <p className="py-4 text-center font-mono text-[11px] text-ink-400">
                      No datasets yet.
                    </p>
                  ) : (
                    <ul>
                      {datasetRows.map((row) => (
                        <DatasetRow key={row.name} row={row} />
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>

              <div className="flex min-w-0 flex-col gap-5">
                <Quickstart />

                <Panel title="Recent activity">
                  {activity.length === 0 ? (
                    <p className="py-4 text-center font-mono text-[11px] text-ink-400">
                      No activity yet.
                    </p>
                  ) : (
                    <ul>
                      {activity.map((entry, i) => (
                        <li
                          key={entry.id}
                          className="flex items-start gap-3 border-b border-ink-100 py-3 last:border-b-0"
                        >
                          <CheckmarkCircle01Icon
                            size={14}
                            className={cn('mt-0.5 shrink-0', i === 0 ? 'text-ink' : 'text-ink-300')}
                          />
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
            </div>
          </>
        ) : (
          /* Evaluator view */
          <div>
            {taskRows.length === 0 ? (
              <Panel title="My tasks">
                <div className="py-8 text-center">
                  <Target01Icon size={32} className="mx-auto mb-3 text-ink-300" />
                  <p className="text-[14px] font-semibold text-ink">No assigned tasks</p>
                  <p className="mt-1 text-[12.5px] text-ink-500">
                    You haven&apos;t been assigned to any evaluation tasks yet.
                  </p>
                </div>
              </Panel>
            ) : (
              <ul className="space-y-3">
                {taskRows.map((task) => (
                  <li key={task.id}>
                    <Link
                      href={`/tasks/${task.id}`}
                      className="flex items-center gap-4 rounded-2xl border border-ink-200 bg-white p-5 transition-colors hover:border-ink-400"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] border border-ink-200 bg-paper">
                        <task.icon size={18} className="text-ink" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[14.5px] font-semibold text-ink">
                            {task.title}
                          </p>
                          <Badge variant={task.badge.solid ? 'solid' : 'outline'}>
                            {task.badge.label}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate font-mono text-[11.5px] text-ink-500">
                          {task.sub}
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-200">
                            <div
                              className="h-full rounded-full bg-ink transition-all"
                              style={{ width: `${task.pct}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-ink-500">{task.pct}%</span>
                        </div>
                      </div>
                      {task.badge.label === 'ACTIVE' && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            router.push(
                              task.type === 'PAIRWISE'
                                ? `/compare/${task.id}`
                                : task.type === 'RANKING'
                                  ? `/rank/${task.id}`
                                  : `/evaluate/${task.id}`,
                            );
                          }}
                        >
                          {task.pct > 0 ? 'Continue' : 'Start'}
                        </Button>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </AppShell>
  );
}
