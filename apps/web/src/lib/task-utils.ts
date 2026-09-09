import type { ComparisonVerdict, EvaluationTask } from '@scorra/types';

export const TYPE_LABELS: Record<string, string> = {
  SINGLE: 'Scoring',
  PAIRWISE: 'Pairwise',
  RANKING: 'Ranking',
};

export const VERDICT_LABELS: Record<string, string> = {
  A_BETTER: 'A Better',
  B_BETTER: 'B Better',
  TIE: 'Tie',
  BOTH_BAD: 'Both Bad',
};

export function verdictLabel(v: string | ComparisonVerdict | null | undefined): string {
  if (!v) return '—';
  return VERDICT_LABELS[v] ?? v;
}

/** Solid vs outline badge treatment per comparison verdict. */
export const VERDICT_BADGE: Record<string, string> = {
  A_BETTER: 'border-ink bg-ink text-white',
  B_BETTER: 'border-ink-500 bg-ink-500 text-white',
  TIE: 'border-ink-400 text-ink-500',
  BOTH_BAD: 'border-ink-300 text-ink-500',
};

export function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || '?'
  );
}

/**
 * Task completion %. Pass `{ mine: true }` to show the current user's completed
 * items (evaluator view). By default (admin/overview view) it shows org-wide
 * completed rows.
 */
export function progressOf(task: EvaluationTask, opts?: { mine?: boolean }): number {
  const rows = task.dataset?.rowCount ?? 0;
  if (!rows) return 0;

  if (opts?.mine && task.myCounts) {
    const done =
      task.type === 'PAIRWISE'
        ? task.myCounts.comparisons
        : task.type === 'RANKING'
          ? task.myCounts.rankings
          : task.myCounts.evaluations;
    return Math.max(0, Math.min(100, Math.round((done / rows) * 100)));
  }

  const done =
    typeof task.completedRows === 'number'
      ? task.completedRows
      : task.type === 'PAIRWISE'
        ? (task._count?.comparisons ?? 0)
        : (task._count?.evaluations ?? 0);
  return Math.max(0, Math.min(100, Math.round((done / rows) * 100)));
}

/** Format an average time in seconds into a compact human label. */
export function formatSeconds(sec: number | null | undefined): string {
  if (sec == null || Number.isNaN(sec)) return '—';
  if (sec < 60) return `${Math.round(sec)}s`;
  const hours = Math.floor(sec / 3600);
  const minutes = Math.round((sec % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
