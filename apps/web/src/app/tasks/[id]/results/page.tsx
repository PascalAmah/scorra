'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Search01Icon } from 'hugeicons-react';
import type {
  ComparisonVerdict,
  Evaluation,
  PairwiseComparison,
  RankingResultItem,
} from '@scorra/types';

import { AppShell } from '@/components/dashboard/shell';
import { Button } from '@/components/ui/button';
import { TaskHeader } from '@/components/tasks/task-header';
import { ItemDrawer, RowActions, type RowDetail } from '@/components/tasks/item-drawer';
import {
  useComparisonResults,
  useRankingResults,
  useTask,
  useTaskResults,
  useTaskScores,
} from '@/hooks/use-tasks';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api';
import { cn, formatRelativeTime } from '@/lib/utils';
import { isOrgAdmin } from '@/lib/permissions';
import { VERDICT_BADGE, verdictLabel } from '@/lib/task-utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const SEGMENTS: { key: string; label: string; className: string; text: string }[] = [
  { key: 'A_BETTER', label: 'A Better', className: 'bg-ink', text: 'text-white' },
  { key: 'B_BETTER', label: 'B Better', className: 'bg-ink-500', text: 'text-white' },
  { key: 'TIE', label: 'Tie', className: 'bg-ink-300', text: 'text-ink' },
  {
    key: 'BOTH_BAD',
    label: 'Both Bad',
    className: 'bg-ink-100 border border-ink-200',
    text: 'text-ink-500',
  },
];

type PairFilter = 'ALL' | 'DISAGREE' | 'TIE' | 'BOTH_BAD';

// ─── Derived types ────────────────────────────────────────────────────────────

/** One row in the per-item aggregated pairwise results table. */
interface AggregatedItem {
  datasetRowId: string;
  rowIndex: number | null;
  prompt: string | null;
  /** All individual comparison verdicts for this item (one per evaluator). */
  votes: Array<ComparisonVerdict | null>;
  /** Majority-vote final verdict. */
  finalVerdict: ComparisonVerdict | null;
  /** true when all submitted votes agree on the same verdict. */
  unanimous: boolean;
  /** Number of evaluators who disagreed with the majority. */
  disagreements: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function majorityVerdict(
  votes: Array<ComparisonVerdict | null>,
): ComparisonVerdict | null {
  const counts: Record<string, number> = {};
  for (const v of votes) {
    if (v) counts[v] = (counts[v] ?? 0) + 1;
  }
  if (!Object.keys(counts).length) return null;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as ComparisonVerdict;
}

function aggregateByItem(comparisons: PairwiseComparison[]): AggregatedItem[] {
  const map = new Map<string, AggregatedItem>();

  for (const c of comparisons) {
    if (!map.has(c.datasetRowId)) {
      map.set(c.datasetRowId, {
        datasetRowId: c.datasetRowId,
        rowIndex: c.datasetRow?.rowIndex ?? null,
        prompt: c.datasetRow?.prompt ?? null,
        votes: [],
        finalVerdict: null,
        unanimous: true,
        disagreements: 0,
      });
    }
    map.get(c.datasetRowId)!.votes.push(c.verdict);
  }

  for (const item of map.values()) {
    const majority = majorityVerdict(item.votes);
    item.finalVerdict = majority;
    const submittedVotes = item.votes.filter(Boolean);
    item.unanimous = submittedVotes.length > 0 && submittedVotes.every((v) => v === majority);
    item.disagreements = submittedVotes.filter((v) => v !== majority).length;
  }

  // Sort by rowIndex ascending (items with null rowIndex go last)
  return [...map.values()].sort((a, b) => {
    if (a.rowIndex == null && b.rowIndex == null) return 0;
    if (a.rowIndex == null) return 1;
    if (b.rowIndex == null) return -1;
    return b.rowIndex - a.rowIndex; // descending to match design (#313, #312, …)
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TaskResultsPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<PairFilter>('ALL');
  const [pairPage, setPairPage] = useState(1);
  const [singlePage, setSinglePage] = useState(1);
  const [rankPage, setRankPage] = useState(1);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState('');

  const user = useAuthStore((s) => s.user);
  const isAdmin = isOrgAdmin(user);

  const { data: task, isPending } = useTask(taskId);
  const { data: resultsData } = useTaskResults(taskId, { limit: 500 });
  const { data: comparisons } = useComparisonResults(taskId);
  const { data: rankings } = useRankingResults(taskId);
  const { data: scores } = useTaskScores(taskId);

  // Reset to page 1 whenever search/filter changes
  useEffect(() => { setPairPage(1); }, [search, filter]);
  useEffect(() => { setSinglePage(1); setRankPage(1); }, [search]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!api.isAuthenticated) router.replace('/login');
  }, [router]);

  const isPairwise = task?.type === 'PAIRWISE';
  const evaluations = useMemo(() => resultsData?.data ?? [], [resultsData]);

  const handleExport = async (format: 'CSV' | 'JSONL') => {
    setExporting(format);
    setError('');
    try {
      await api.requestExport({ taskId, format });
      router.push('/exports');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create export');
    } finally {
      setExporting('');
    }
  };

  if (isPending || !task) {
    return (
      <AppShell>
        <div className="flex h-[60vh] items-center justify-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
            Loading…
          </p>
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    router.replace(`/tasks/${taskId}`);
    return null;
  }

  const actions = (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleExport('CSV')}
        disabled={Boolean(exporting)}
      >
        {exporting === 'CSV' ? 'Exporting…' : 'Export CSV'}
      </Button>
      <Button size="sm" onClick={() => handleExport('JSONL')} disabled={Boolean(exporting)}>
        {exporting === 'JSONL' ? 'Exporting…' : 'Export JSONL'}
      </Button>
    </>
  );

  return (
    <AppShell>
      <TaskHeader task={task} activeTab="results" actions={actions} />

      <div className="px-5 pb-14 pt-6 md:px-9">
        {error && (
          <div className="mb-4 rounded-md border border-red-900/30 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {error}
          </div>
        )}

        {isPairwise ? (
          <PairwiseResults
            comparisons={comparisons ?? []}
            datasetId={task.datasetId}
            search={search}
            setSearch={setSearch}
            filter={filter}
            setFilter={setFilter}
            page={pairPage}
            setPage={setPairPage}
          />
        ) : task.type === 'RANKING' ? (
          <RankingResults
            rankings={rankings ?? []}
            datasetId={task.datasetId}
            search={search}
            setSearch={setSearch}
            page={rankPage}
            setPage={setRankPage}
          />
        ) : (
          <SingleResults
            evaluations={evaluations}
            scores={scores}
            datasetId={task.datasetId}
            search={search}
            setSearch={setSearch}
            page={singlePage}
            setPage={setSinglePage}
          />
        )}
      </div>
    </AppShell>
  );
}

// ─── Pairwise results ─────────────────────────────────────────────────────────

function PairwiseResults({
  comparisons,
  datasetId,
  search,
  setSearch,
  filter,
  setFilter,
  page,
  setPage,
}: {
  comparisons: PairwiseComparison[];
  datasetId: string;
  search: string;
  setSearch: (v: string) => void;
  filter: PairFilter;
  setFilter: (v: PairFilter) => void;
  page: number;
  setPage: (p: number) => void;
}) {
  const [detail, setDetail] = useState<RowDetail | null>(null);
  // Verdict breakdown counts (over raw comparisons, not aggregated items)
  const counts = useMemo(() => {
    const c: Record<string, number> = { A_BETTER: 0, B_BETTER: 0, TIE: 0, BOTH_BAD: 0 };
    for (const cmp of comparisons) if (cmp.verdict) c[cmp.verdict] += 1;
    return c;
  }, [comparisons]);
  const totalVotes = comparisons.filter((c) => c.verdict).length;

  // Aggregate into per-item rows
  const allItems = useMemo(() => aggregateByItem(comparisons), [comparisons]);

  // Apply search + filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allItems.filter((item) => {
      if (filter === 'DISAGREE' && item.unanimous) return false;
      if (filter === 'TIE' && item.finalVerdict !== 'TIE') return false;
      if (filter === 'BOTH_BAD' && item.finalVerdict !== 'BOTH_BAD') return false;
      if (q) {
        const inPrompt = (item.prompt ?? '').toLowerCase().includes(q);
        const inVerdict = verdictLabel(item.finalVerdict).toLowerCase().includes(q);
        if (!inPrompt && !inVerdict) return false;
      }
      return true;
    });
  }, [allItems, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <>
      {/* Verdict breakdown */}
      <section className="mb-4 rounded-2xl border border-ink-200 bg-white p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="text-[15px] text-ink">Verdict breakdown</h3>
          <span className="font-mono text-[12px] text-ink-500">
            {allItems.length} EVALUATED ITEMS
          </span>
        </div>
        <div className="mb-3.5 flex h-8 overflow-hidden rounded-lg">
          {SEGMENTS.map((seg) => {
            const n = counts[seg.key];
            const width = totalVotes ? Math.round((n / totalVotes) * 100) : 0;
            if (!n) return null;
            return (
              <div
                key={seg.key}
                className={cn(
                  'flex items-center justify-center font-mono text-[11.5px] font-semibold',
                  seg.className,
                  seg.text,
                )}
                style={{ width: `${width}%` }}
              >
                {width >= 8 ? `${width}%` : ''}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {SEGMENTS.map((seg) => (
            <span key={seg.key} className="flex items-center gap-2 text-[12.5px] text-ink">
              <span className={cn('h-3 w-3 rounded-[3px]', seg.className)} />
              {seg.label} <b className="font-mono">{counts[seg.key]}</b>
            </span>
          ))}
        </div>
      </section>

      {/* Toolbar */}
      <PairToolbar
        search={search}
        setSearch={setSearch}
        filter={filter}
        setFilter={setFilter}
      />

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
        {pageItems.length === 0 ? (
          <p className="px-6 py-14 text-center font-mono text-[11.5px] text-ink-400">
            {allItems.length === 0 ? 'No comparisons yet.' : 'No results match your search.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-ink-200 bg-paper font-mono text-[10.5px] uppercase tracking-[0.06em] text-ink-500">
                  {['Item', 'Prompt', 'Votes', 'Final verdict', 'AI Judge', 'Agreement', ''].map(
                    (h, i) => (
                      <th
                        key={i}
                        className={cn('px-5 py-3.5 text-left', i === 6 && 'w-10')}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item) => (
                  <PairwiseRow
                    key={item.datasetRowId}
                    item={item}
                    datasetId={datasetId}
                    onViewDetails={() =>
                      setDetail({
                        rowId: item.datasetRowId,
                        rowIndex: item.rowIndex,
                        type: 'PAIRWISE',
                        comparisons,
                      })
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        <TablePagination
          total={filtered.length}
          page={safePage}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      <ItemDrawer detail={detail} datasetId={datasetId} onClose={() => setDetail(null)} />
    </>
  );
}

function PairwiseRow({
  item,
  datasetId,
  onViewDetails,
}: {
  item: AggregatedItem;
  datasetId: string;
  onViewDetails: () => void;
}) {
  const submittedVotes = item.votes.filter(Boolean) as ComparisonVerdict[];

  return (
    <tr className="border-b border-ink-100 transition-colors last:border-b-0 hover:bg-paper">
      {/* Item */}
      <td className="px-5 py-3.5 font-mono text-[12px] text-ink-400">
        #{item.rowIndex != null ? item.rowIndex : '—'}
      </td>

      {/* Prompt */}
      <td className="max-w-[280px] truncate px-5 py-3.5 text-[13px] font-medium text-ink">
        {item.prompt ?? <span className="text-ink-400">—</span>}
      </td>

      {/* Votes (dots) */}
      <td className="px-5 py-3.5">
        <div className="flex gap-1">
          {submittedVotes.length === 0 ? (
            <span className="font-mono text-[11px] text-ink-400">—</span>
          ) : (
            submittedVotes.map((v, i) => (
              <span
                key={i}
                className={cn(
                  'inline-block h-2.5 w-2.5 rounded-full',
                  v === 'A_BETTER' && 'bg-ink',
                  v === 'B_BETTER' && 'bg-ink-500',
                  v === 'TIE' && 'border border-ink-400 bg-white',
                  v === 'BOTH_BAD' && 'bg-ink-300',
                )}
                title={verdictLabel(v)}
              />
            ))
          )}
        </div>
      </td>

      {/* Final verdict */}
      <td className="px-5 py-3.5">
        <VerdictPill verdict={item.finalVerdict} />
      </td>

      {/* AI Judge — not yet available; show placeholder */}
      <td className="px-5 py-3.5 font-mono text-[11px] text-ink-400">—</td>

      {/* Agreement */}
      <td className="px-5 py-3.5 font-mono text-[11px]">
        {submittedVotes.length === 0 ? (
          <span className="text-ink-400">—</span>
        ) : item.unanimous ? (
          <span className="text-ink-500">Unanimous</span>
        ) : item.disagreements === 1 ? (
          <span className="font-semibold text-ink">
            ⚠ Judge disagreed
          </span>
        ) : (
          <span className="font-semibold text-ink">
            ⚠ {item.disagreements} evaluators disagreed
          </span>
        )}
      </td>

      <td className="px-5 py-3.5 text-right">
        <RowActions
          datasetId={datasetId}
          rowId={item.datasetRowId}
          prompt={item.prompt}
          onViewDetails={onViewDetails}
        />
      </td>
    </tr>
  );
}

function PairToolbar({
  search,
  setSearch,
  filter,
  setFilter,
}: {
  search: string;
  setSearch: (v: string) => void;
  filter: PairFilter;
  setFilter: (v: PairFilter) => void;
}) {
  const chips: { key: PairFilter; label: string }[] = [
    { key: 'ALL', label: 'All results' },
    { key: 'DISAGREE', label: 'Disagreements' },
    { key: 'TIE', label: 'Ties' },
    { key: 'BOTH_BAD', label: 'Both Bad' },
  ];
  return (
    <div className="mb-3.5 flex flex-wrap items-center justify-between gap-4">
      <div className="relative max-w-75 flex-1">
        <Search01Icon
          size={14}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items…"
          className="w-full rounded-sm border border-ink-300 bg-white py-2.5 pl-8 pr-3 text-[13px] outline-none transition-colors focus:border-ink"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => setFilter(chip.key)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 font-mono text-[11.5px]',
              filter === chip.key
                ? 'border-ink bg-ink text-white'
                : 'border-ink-300 text-ink-500 hover:border-ink-600',
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Ranking results ──────────────────────────────────────────────────────────

/** One evaluator's ordered models inside an aggregated ranking row. */
interface RankingSubmission {
  id: string;
  evaluatorName: string;
  order: Array<{ modelName: string; rank: number }>;
}

/** One row in the per-item aggregated ranking results table. */
interface AggregatedRanking {
  datasetRowId: string;
  rowIndex: number | null;
  prompt: string | null;
  submissions: RankingSubmission[];
  /** Model(s) with the most first-place votes (could be a tie). */
  winners: string[];
  /** Number of first-place votes for the leading model(s). */
  winnerCount: number;
  totalVotes: number;
  /** true when every evaluator picked the same #1 model. */
  unanimous: boolean;
  /** Number of evaluators whose #1 pick differs from the leading model. */
  disagreements: number;
}

function aggregateRankings(rankings: RankingResultItem[]): AggregatedRanking[] {
  const map = new Map<string, AggregatedRanking>();

  for (const r of rankings) {
    const entries = [...r.entries].sort((a, b) => a.rank - b.rank);
    if (entries.length === 0) continue;
    const submission: RankingSubmission = {
      id: r.id,
      evaluatorName: r.evaluator?.name ?? `Evaluator ${r.evaluatorId.slice(0, 8)}`,
      order: entries.map((e) => ({ modelName: e.modelName, rank: e.rank })),
    };

    const existing = map.get(r.datasetRowId);
    if (existing) {
      existing.submissions.push(submission);
    } else {
      map.set(r.datasetRowId, {
        datasetRowId: r.datasetRowId,
        rowIndex: r.datasetRow?.rowIndex ?? null,
        prompt: r.datasetRow?.prompt ?? null,
        submissions: [submission],
        winners: [],
        winnerCount: 0,
        totalVotes: 0,
        unanimous: true,
        disagreements: 0,
      });
    }
  }

  for (const item of map.values()) {
    const counts = new Map<string, number>();
    for (const s of item.submissions) {
      const winner = s.order[0]?.modelName;
      if (winner) counts.set(winner, (counts.get(winner) ?? 0) + 1);
    }
    const max = Math.max(0, ...counts.values());
    item.totalVotes = item.submissions.length;
    item.winnerCount = max;
    item.winners = [...counts.entries()]
      .filter(([, n]) => n === max)
      .map(([name]) => name);
    item.unanimous =
      item.totalVotes > 0 && item.winners.length === 1 && item.winnerCount === item.totalVotes;
    item.disagreements = item.totalVotes - item.winnerCount;
  }

  // Sort by rowIndex descending to match the pairwise table (#313, #312, …)
  return [...map.values()].sort((a, b) => {
    if (a.rowIndex == null && b.rowIndex == null) return 0;
    if (a.rowIndex == null) return 1;
    if (b.rowIndex == null) return -1;
    return b.rowIndex - a.rowIndex;
  });
}

function RankingResults({
  rankings,
  datasetId,
  search,
  setSearch,
  page,
  setPage,
}: {
  rankings: RankingResultItem[];
  datasetId: string;
  search: string;
  setSearch: (v: string) => void;
  page: number;
  setPage: (p: number) => void;
}) {
  const [detail, setDetail] = useState<RowDetail | null>(null);

  const allItems = useMemo(() => aggregateRankings(rankings), [rankings]);

  // Model leaderboard: first-place picks + average rank across all submissions
  const leaderboard = useMemo(() => {
    const models = new Map<
      string,
      { name: string; firstPlace: number; count: number; rankSum: number }
    >();
    for (const item of allItems) {
      for (const s of item.submissions) {
        for (const e of s.order) {
          const m = models.get(e.modelName) ?? {
            name: e.modelName,
            firstPlace: 0,
            count: 0,
            rankSum: 0,
          };
          m.count += 1;
          m.rankSum += e.rank;
          if (e.rank === 1) m.firstPlace += 1;
          models.set(e.modelName, m);
        }
      }
    }
    return [...models.values()]
      .map((m) => ({ ...m, avgRank: m.rankSum / Math.max(1, m.count) }))
      .sort((a, b) => b.firstPlace - a.firstPlace || a.avgRank - b.avgRank);
  }, [allItems]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allItems.filter((item) => {
      if (!q) return true;
      const inPrompt = (item.prompt ?? '').toLowerCase().includes(q);
      const inWinner = item.winners.some((w) => w.toLowerCase().includes(q));
      return inPrompt || inWinner;
    });
  }, [allItems, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <>
      {/* Model leaderboard */}
      {leaderboard.length > 0 && (
        <section className="mb-4 rounded-2xl border border-ink-200 bg-white p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <h3 className="text-[15px] text-ink">Model leaderboard</h3>
            <span className="font-mono text-[12px] text-ink-500">
              {rankings.length} SUBMITTED RANKINGS
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {leaderboard.map((m) => (
              <div key={m.name} className="rounded-xl border border-ink-200 bg-paper px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13.5px] font-semibold text-ink">{m.name}</span>
                  <span className="rounded-full bg-ink px-2 py-0.5 font-mono text-[10.5px] font-semibold text-white">
                    {m.firstPlace}× #1
                  </span>
                </div>
                <p className="mt-1.5 font-mono text-[11px] text-ink-500">
                  avg rank {m.avgRank.toFixed(2)} · {m.count} placements
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Toolbar */}
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="relative max-w-75 flex-1">
          <Search01Icon
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items…"
            className="w-full rounded-sm border border-ink-300 bg-white py-2.5 pl-8 pr-3 text-[13px] outline-none transition-colors focus:border-ink"
          />
        </div>
        <span className="shrink-0 font-mono text-[11.5px] text-ink-500">
          {filtered.length} RESULTS
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
        {pageItems.length === 0 ? (
          <p className="px-6 py-14 text-center font-mono text-[11.5px] text-ink-400">
            {allItems.length === 0 ? 'No rankings yet.' : 'No results match your search.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-ink-200 bg-paper font-mono text-[10.5px] uppercase tracking-[0.06em] text-ink-500">
                  {['Item', 'Prompt', 'Winner', 'Rankings', 'Agreement', ''].map((h, i) => (
                    <th key={i} className={cn('px-5 py-3.5 text-left', i === 5 && 'w-10')}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item) => (
                  <RankingRow
                    key={item.datasetRowId}
                    item={item}
                    datasetId={datasetId}
                    onViewDetails={() =>
                      setDetail({
                        rowId: item.datasetRowId,
                        rowIndex: item.rowIndex,
                        type: 'RANKING',
                        rankings,
                      })
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <TablePagination
          total={filtered.length}
          page={safePage}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      <ItemDrawer detail={detail} datasetId={datasetId} onClose={() => setDetail(null)} />
    </>
  );
}

function RankingRow({
  item,
  datasetId,
  onViewDetails,
}: {
  item: AggregatedRanking;
  datasetId: string;
  onViewDetails: () => void;
}) {
  return (
    <tr className="border-b border-ink-100 transition-colors last:border-b-0 hover:bg-paper">
      {/* Item */}
      <td className="px-5 py-3.5 font-mono text-[12px] text-ink-400">
        #{item.rowIndex != null ? item.rowIndex : '—'}
      </td>

      {/* Prompt */}
      <td className="max-w-[240px] truncate px-5 py-3.5 text-[13px] font-medium text-ink">
        {item.prompt ?? <span className="text-ink-400">—</span>}
      </td>

      {/* Winner */}
      <td className="px-5 py-3.5">
        {item.winners.length === 0 ? (
          <span className="font-mono text-[11px] text-ink-400">—</span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block rounded-full border border-ink bg-ink px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.04em] text-white">
              {item.winners.join(' / ')}
            </span>
            {item.totalVotes > 0 && (
              <span className="font-mono text-[10.5px] text-ink-400">
                {item.winnerCount}/{item.totalVotes}
              </span>
            )}
          </span>
        )}
      </td>

      {/* Rankings per evaluator */}
      <td className="px-5 py-3.5">
        <div className="space-y-1.5">
          {item.submissions.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-2 font-mono text-[11px] text-ink-500"
            >
              <span className="shrink-0 text-ink-400">{s.evaluatorName}:</span>
              <span className="flex flex-wrap items-center gap-1">
                {s.order.map((e, i) => (
                  <span key={`${s.id}-${e.modelName}`} className="flex items-center gap-1">
                    {i > 0 && <span className="text-ink-300">→</span>}
                    <span className={cn(e.rank === 1 && 'font-semibold text-ink')}>
                      {e.modelName}
                    </span>
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </td>

      {/* Agreement */}
      <td className="px-5 py-3.5 font-mono text-[11px]">
        {item.totalVotes === 0 ? (
          <span className="text-ink-400">—</span>
        ) : item.unanimous ? (
          <span className="text-ink-500">Unanimous</span>
        ) : item.disagreements === 1 ? (
          <span className="font-semibold text-ink">⚠ Judge disagreed</span>
        ) : (
          <span className="font-semibold text-ink">
            ⚠ {item.disagreements} judges disagreed
          </span>
        )}
      </td>

      <td className="px-5 py-3.5 text-right">
        <RowActions
          datasetId={datasetId}
          rowId={item.datasetRowId}
          prompt={item.prompt}
          onViewDetails={onViewDetails}
        />
      </td>
    </tr>
  );
}

// ─── Single-score results ─────────────────────────────────────────────────────

function SingleResults({
  evaluations,
  scores,
  datasetId,
  search,
  setSearch,
  page,
  setPage,
}: {
  evaluations: Evaluation[];
  scores:
    | {
        averageScore: number | null;
        medianScore: number | null;
        minScore: number | null;
        maxScore: number | null;
      }
    | undefined;
  datasetId: string;
  search: string;
  setSearch: (v: string) => void;
  page: number;
  setPage: (p: number) => void;
}) {
  const [detail, setDetail] = useState<RowDetail | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return evaluations.filter((e) => !q || (e.datasetRow?.prompt ?? '').toLowerCase().includes(q));
  }, [evaluations, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <>
      {/* Score summary cards */}
      {scores && scores.averageScore != null && (
        <section className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(
            [
              ['Average', scores.averageScore],
              ['Median', scores.medianScore],
              ['Min', scores.minScore],
              ['Max', scores.maxScore],
            ] as [string, number | null][]
          ).map(([label, val]) => (
            <div key={label} className="rounded-2xl border border-ink-200 bg-white p-5">
              <p className="mb-2.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-500">
                {label}
              </p>
              <p className="font-display text-[26px] font-semibold leading-none text-ink">
                {val != null ? Number(val).toFixed(1) : '—'}
              </p>
            </div>
          ))}
        </section>
      )}

      {/* Toolbar */}
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="relative max-w-75 flex-1">
          <Search01Icon
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts…"
            className="w-full rounded-sm border border-ink-300 bg-white py-2.5 pl-8 pr-3 text-[13px] outline-none transition-colors focus:border-ink"
          />
        </div>
        <span className="shrink-0 font-mono text-[11.5px] text-ink-500">
          {filtered.length} RESULTS
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
        {pageItems.length === 0 ? (
          <p className="px-6 py-14 text-center font-mono text-[11.5px] text-ink-400">
            {evaluations.length === 0
              ? 'No submissions yet.'
              : 'No results match your search.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-ink-200 bg-paper font-mono text-[10.5px] uppercase tracking-[0.06em] text-ink-500">
                  {['Item', 'Prompt', 'Evaluator', 'Score', 'Status', 'Submitted', ''].map(
                    (h, i) => (
                      <th
                        key={i}
                        className={cn('px-5 py-3.5 text-left', i === 6 && 'w-10')}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {pageItems.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-ink-100 transition-colors last:border-b-0 hover:bg-paper"
                  >
                    <td className="px-5 py-3.5 font-mono text-[12px] text-ink-400">
                      #{e.datasetRow?.rowIndex ?? '—'}
                    </td>
                    <td className="max-w-70 truncate px-5 py-3.5 text-[13px] font-medium text-ink">
                      {e.datasetRow?.prompt ?? 'Row'}
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-ink">
                      {e.evaluator?.name ?? e.evaluatorId.slice(0, 8)}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[13px] font-semibold text-ink">
                      {e.overallScore != null ? e.overallScore.toFixed(1) : '—'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] uppercase text-ink-500">
                      {e.status}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11.5px] text-ink-500">
                      {formatRelativeTime(e.submittedAt ?? e.updatedAt ?? e.createdAt)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <RowActions
                        datasetId={datasetId}
                        rowId={e.datasetRowId}
                        prompt={e.datasetRow?.prompt ?? null}
                        onViewDetails={() =>
                          setDetail({
                            rowId: e.datasetRowId,
                            rowIndex: e.datasetRow?.rowIndex ?? null,
                            type: 'SINGLE',
                            evaluations,
                          })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <TablePagination
          total={filtered.length}
          page={safePage}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      <ItemDrawer detail={detail} datasetId={datasetId} onClose={() => setDetail(null)} />
    </>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function VerdictPill({ verdict }: { verdict: ComparisonVerdict | null }) {
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

function TablePagination({
  total,
  page,
  totalPages,
  onPageChange,
}: {
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (total === 0) return null;

  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  // Show up to 5 page buttons with ellipsis handling
  const pages = buildPageRange(page, totalPages);

  return (
    <div className="flex items-center justify-between border-t border-ink-100 px-5 py-4">
      <span className="font-mono text-[11.5px] text-ink-500">
        SHOWING {start}–{end} OF {total}
      </span>
      <div className="flex items-center gap-1.5">
        {/* Prev arrow */}
        <PageBtn
          label="←"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        />

        {pages.map((p, i) =>
          p === '…' ? (
            <span
              key={`ellipsis-${i}`}
              className="flex h-7 w-7 items-center justify-center font-mono text-[11.5px] text-ink-400"
            >
              …
            </span>
          ) : (
            <PageBtn
              key={p}
              label={String(p)}
              active={p === page}
              onClick={() => onPageChange(p as number)}
            />
          ),
        )}

        {/* Next arrow */}
        <PageBtn
          label="→"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
        />
      </div>
    </div>
  );
}

function PageBtn({
  label,
  active = false,
  disabled = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded border font-mono text-[11.5px] transition-colors',
        active
          ? 'border-ink bg-ink text-white'
          : disabled
            ? 'cursor-not-allowed border-ink-200 text-ink-300'
            : 'border-ink-300 text-ink-500 hover:border-ink-600 hover:text-ink',
      )}
    >
      {label}
    </button>
  );
}

/** Build a compact page range array, inserting '…' for gaps. */
function buildPageRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '…')[] = [];
  const add = (n: number | '…') => {
    const last = pages[pages.length - 1];
    if (n === '…' && last === '…') return;
    pages.push(n);
  };

  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || (p >= current - 1 && p <= current + 1)) {
      add(p);
    } else if (p === current - 2 || p === current + 2) {
      add('…');
    }
  }

  return pages;
}
