interface TaskStatProps {
  label: string;
  value: string;
  delta: string;
}

/** A stat card matching the reference (v1) design: mono label, display value. */
export function TaskStat({ label, value, delta }: TaskStatProps) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5">
      <p className="mb-2.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-500">
        {label}
      </p>
      <p className="font-display text-[26px] font-semibold leading-none text-ink">{value}</p>
      {delta && (
        <p className="mt-2 font-mono text-[11px] text-ink-400">{delta}</p>
      )}
    </div>
  );
}