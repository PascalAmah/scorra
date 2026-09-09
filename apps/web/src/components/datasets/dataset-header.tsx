import Link from 'next/link';

import { formatDate, formatNumber, formatRelativeTime, cn } from '@/lib/utils';
import { DatasetStatusBadge } from './status-badge';

interface MetaItem {
  label: string;
  value: string;
}

interface DatasetHeaderProps {
  dataset: {
    id: string;
    name: string;
    status: string;
    version: number;
    rowCount: number;
    format: string;
    createdAt: string | Date;
    updatedAt?: string | Date;
  };
  activeTab: 'rows' | 'versions' | 'settings';
  actions?: React.ReactNode;
  meta?: MetaItem[];
}

const TABS = [
  { id: 'rows', label: 'Rows' },
  { id: 'versions', label: 'Versions' },
  { id: 'settings', label: 'Settings' },
] as const;

export function DatasetHeader({ dataset, activeTab, actions, meta }: DatasetHeaderProps) {
  const metaItems: MetaItem[] = meta ?? [
    { label: 'Rows', value: formatNumber(dataset.rowCount) },
    { label: 'Version', value: `v${dataset.version}` },
    { label: 'Format', value: dataset.format },
    { label: 'Created', value: formatDate(dataset.createdAt) },
    { label: 'Updated', value: dataset.updatedAt ? formatRelativeTime(dataset.updatedAt) : '—' },
  ];

  return (
    <div className="border-b border-ink-200 bg-paper/90 backdrop-blur-md">
      <div className="px-5 pt-4 md:px-9">
        <p className="mb-3 font-mono text-[11px] text-ink-400">
          <Link href="/datasets" className="transition-colors hover:text-ink">
            Datasets
          </Link>
          <span className="mx-2 text-ink-300">/</span>
          <span className="text-ink-500">{dataset.name}</span>
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="truncate text-[20px] md:text-xl">{dataset.name}</h1>
            <DatasetStatusBadge status={dataset.status} />
          </div>
          {actions && (
            <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end md:gap-2.5">
              {actions}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 pb-4 text-[12.5px] text-ink-500">
          {metaItems.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5">
              {item.label} <b className="font-mono font-semibold text-ink">{item.value}</b>
            </span>
          ))}
        </div>

        <div className="flex gap-6 border-t border-ink-200">
          {TABS.map((tab) => {
            const href =
              tab.id === 'rows'
                ? `/datasets/${dataset.id}`
                : tab.id === 'versions'
                  ? `/datasets/${dataset.id}/versions`
                  : `/datasets/${dataset.id}?tab=settings`;
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
