'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Target01Icon } from 'hugeicons-react';
import type { EvaluationTask } from '@scorra/types';

import { AppShell } from '@/components/dashboard/shell';
import { Topbar } from '@/components/dashboard/topbar';
import { Button } from '@/components/ui/button';
import { SearchFilterBar } from '@/components/ui/search-filter-bar';
import { useTasks } from '@/hooks/use-tasks';
import { useUsers } from '@/hooks/use-users';
import { useAuthStore } from '@/store/auth-store';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { formatNumber } from '@/lib/utils';
import { TYPE_LABELS, initialsOf, progressOf } from '@/lib/task-utils';
import { isOrgAdmin } from '@/lib/permissions';
import { TaskStatusBadge } from '@/components/tasks/task-status-badge';

const FILTERS = ['ALL', 'ACTIVE', 'DRAFT', 'COMPLETED'] as const;

export default function TasksPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL');

  const { data, isPending } = useTasks({ page: 1, limit: 50, search: appliedSearch || undefined });
  const tasks = useMemo(() => data?.data ?? [], [data]);

  const { data: usersData } = useUsers();
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = isOrgAdmin(currentUser);
  const members = useMemo(() => usersData ?? [], [usersData]);

  const userById = useMemo(() => new Map(members.map((m) => [m.userId, m.user])), [members]);

  useAuthGuard();

  const visible = useMemo(
    () => (filter === 'ALL' ? tasks : tasks.filter((t) => t.status === filter)),
    [tasks, filter],
  );

  const activeCount = useMemo(() => tasks.filter((t) => t.status === 'ACTIVE').length, [tasks]);
  const total = data?.pagination?.total ?? visible.length;

  return (
    <AppShell>
      <Topbar
        title="Evaluation Tasks"
        sub={`${formatNumber(total)} TASKS · ${formatNumber(activeCount)} ACTIVE`}
        actions={
          isAdmin ? (
            <Button asChild>
              <Link href="/tasks/new">+ New task</Link>
            </Button>
          ) : undefined
        }
      />

      <div className="px-5 pb-14 pt-6 md:px-9">
        <SearchFilterBar
          placeholder="Search tasks…"
          searchValue={search}
          onSearchChange={(v) => setSearch(v)}
          onSearchSubmit={() => setAppliedSearch(search.trim())}
          filters={FILTERS}
          activeFilter={filter}
          onFilterChange={setFilter}
        />

        {isPending ? (
          <div className="flex items-center justify-center rounded-2xl border border-ink-200 bg-white py-20">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
              Loading…
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-ink-200 bg-white px-8 py-16 text-center">
            <p className="mb-2 text-[15px] font-semibold text-ink">No evaluation tasks yet</p>
            <p className="mb-5 text-[13px] text-ink-500">
              Create a task to score, compare, or rank model responses against a dataset.
            </p>
            {tasks.length === 0 && (
              <Button asChild>
                <Link href="/tasks/new">+ New task</Link>
              </Button>
            )}
          </div>
        ) : (
          visible.map((task) => (
            <TaskCard key={task.id} task={task} userById={userById} mine={!isAdmin} />
          ))
        )}
      </div>
    </AppShell>
  );
}

function TaskCard({
  task,
  userById,
  mine,
}: {
  task: EvaluationTask;
  userById: Map<string, { id: string; name: string }>;
  mine: boolean;
}) {
  const pct = progressOf(task, { mine });
  const evaluatorNames = (task.assignedEvaluatorIds ?? [])
    .map((id) => userById.get(id)?.name)
    .filter(Boolean) as string[];

  return (
    <Link
      href={`/tasks/${task.id}`}
      className="mb-3 flex items-center gap-5 rounded-2xl border border-ink-200 bg-white p-5 transition-colors hover:border-ink-400"
    >
      <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[9px] border border-ink-200 bg-paper">
        <Target01Icon size={16} className="text-ink" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-semibold text-ink">{task.name}</p>
        <p className="mt-1 truncate font-mono text-[11.5px] text-ink-500">
          {[
            task.dataset?.name,
            task.dataset?.rowCount ? `${formatNumber(task.dataset.rowCount)} items` : null,
          ]
            .filter(Boolean)
            .join(' · ') || 'No dataset'}
        </p>
      </div>

      <span className="hidden shrink-0 rounded-[6px] border border-ink-200 bg-paper px-2.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.04em] text-ink-600 sm:inline">
        {TYPE_LABELS[task.type] ?? task.type}
      </span>

      <TaskStatusBadge status={task.status} />

      <div className="hidden shrink-0 md:flex">
        {evaluatorNames.length === 0 ? (
          <span className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-ink-200 font-mono text-[10px] text-ink-500">
            —
          </span>
        ) : (
          <>
            {evaluatorNames.slice(0, 3).map((name, i) => (
              <span
                key={i}
                className="flex h-6.5 w-6.5 -ml-2 items-center justify-center rounded-full border-2 border-white bg-ink-800 font-display text-[10px] font-semibold text-white first:ml-0"
              >
                {initialsOf(name)}
              </span>
            ))}
            {evaluatorNames.length > 3 && (
              <span className="flex h-6.5 w-6.5 -ml-2 items-center justify-center rounded-full border-2 border-white bg-ink-200 font-mono text-[10px] text-ink-500">
                +{evaluatorNames.length - 3}
              </span>
            )}
          </>
        )}
      </div>

      <div className="w-[120px] shrink-0 text-right">
        <p className="font-mono text-[13px] font-semibold text-ink">{pct}%</p>
        <div className="mt-1.5 h-[5px] w-full overflow-hidden rounded-full bg-ink-200">
          <span className="block h-full rounded-full bg-ink" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </Link>
  );
}
