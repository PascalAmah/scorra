import Link from 'next/link';

import { cn, formatDate, formatNumber, formatRelativeTime } from '@/lib/utils';
import { TYPE_LABELS } from '@/lib/task-utils';
import { TaskStatusBadge } from './task-status-badge';

interface TaskHeaderProps {
  task: {
    id: string;
    name: string;
    status: string;
    type: string;
    createdAt: Date | string;
    createdBy?: { name: string } | null;
    dataset?: { name: string; rowCount: number } | null;
    updatedAt?: Date | string;
  };
  activeTab: 'overview' | 'results';
  actions?: React.ReactNode;
  showResultsTab?: boolean;
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'results', label: 'Results' },
] as const;

function metaOf(task: TaskHeaderProps['task']) {
  const items: { label: string; value: string }[] = [
    { label: 'Dataset', value: task.dataset?.name ?? '—' },
    { label: 'Rows', value: formatNumber(task.dataset?.rowCount ?? 0) },
    {
      label: 'Created',
      value: `${formatDate(task.createdAt)}${task.createdBy?.name ? ` · ${task.createdBy.name}` : ''}`,
    },
    { label: 'Updated', value: task.updatedAt ? formatRelativeTime(task.updatedAt) : '—' },
  ];
  return items;
}

export function TaskHeader({ task, activeTab, actions, showResultsTab = true }: TaskHeaderProps) {
  const tabs = showResultsTab ? TABS : TABS.filter((t) => t.id === 'overview');
  return (
    <div className="border-b border-ink-200 bg-paper/90 backdrop-blur-md">
      <div className="px-5 pt-4 md:px-9">
        <p className="mb-3 font-mono text-[11px] text-ink-400">
          <Link href="/tasks" className="transition-colors hover:text-ink">
            Evaluation Tasks
          </Link>
          <span className="mx-2 text-ink-300">/</span>
          <span className="text-ink-500">{task.name}</span>
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="min-w-0 flex-1 truncate text-[20px] md:text-xl md:flex-none">
            {task.name}
          </h1>
          <TaskStatusBadge status={task.status} />
          <span className="rounded-[6px] border border-ink-200 bg-paper px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.04em] text-ink-600">
            {TYPE_LABELS[task.type] ?? task.type}
          </span>
          {actions && (
            <div className="flex w-full flex-wrap items-center gap-2 md:ml-auto md:w-auto md:gap-2.5">
              {actions}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 pb-4 text-[12.5px] text-ink-500">
          {metaOf(task).map((item) => (
            <span key={item.label} className="flex items-center gap-1.5">
              {item.label} <b className="font-mono font-semibold text-ink">{item.value}</b>
            </span>
          ))}
        </div>

        <div className="flex gap-6 border-t border-ink-200">
          {tabs.map((tab) => {
            const href = tab.id === 'overview' ? `/tasks/${task.id}` : `/tasks/${task.id}/results`;
            return (
              <Link
                key={tab.id}
                href={href}
                className={cn(
                  'border-b-2 py-3 text-[13.5px] transition-colors',
                  activeTab === tab.id
                    ? 'border-ink font-semibold text-ink'
                    : 'border-transparent text-ink-500 hover:text-ink',
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
