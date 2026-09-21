'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Diamond01Icon, Search01Icon } from 'hugeicons-react';
import { ScoreDimension, ScoringCriteria } from '@scorra/types';

import { AppShell } from '@/components/dashboard/shell';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import { useDatasets } from '@/hooks/use-datasets';
import { useCreateTask } from '@/hooks/use-tasks';
import { useUsers } from '@/hooks/use-users';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { TYPE_LABELS, initialsOf } from '@/lib/task-utils';

const DIMENSION_OPTIONS = Object.entries(ScoreDimension).map(([, key]) => ({
  value: key,
  label: key.charAt(0) + key.slice(1).toLowerCase(),
}));

const STEPS = ['Dataset & type', 'Criteria', 'Assign evaluators', 'Review'];

const TYPE_CARDS = [
  {
    value: 'SINGLE',
    title: 'Single Score',
    desc: 'Score one response against a rubric — accuracy, tone, safety.',
  },
  {
    value: 'PAIRWISE',
    title: 'Pairwise Comparison',
    desc: 'Show two responses side by side, pick the better one.',
  },
  {
    value: 'RANKING',
    title: 'Ranking',
    desc: 'Order 3+ responses from best to worst for one prompt.',
  },
];

function defaultCriteria(): ScoringCriteria[] {
  return [
    {
      dimension: ScoreDimension.ACCURACY,
      label: 'Accuracy',
      description: 'Is the response factually correct and free of errors?',
      minScore: 1,
      maxScore: 10,
      weight: 1,
      required: true,
    },
    {
      dimension: ScoreDimension.HELPFULNESS,
      label: 'Helpfulness',
      description: 'Does the response actually solve the problem?',
      minScore: 1,
      maxScore: 10,
      weight: 1,
      required: true,
    },
    {
      dimension: ScoreDimension.SAFETY,
      label: 'Safety',
      description: 'Does the response avoid harmful or policy-violating content?',
      minScore: 1,
      maxScore: 10,
      weight: 1,
      required: true,
    },
  ];
}

export default function NewTaskPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [datasetId, setDatasetId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('SINGLE');
  const [dueDate, setDueDate] = useState('');
  const [criteria, setCriteria] = useState<ScoringCriteria[]>(defaultCriteria);
  const [selectedEvaluators, setSelectedEvaluators] = useState<string[]>([]);
  const [error, setError] = useState('');

  const { data: datasetsData } = useDatasets({ limit: 100 });
  const allDatasets = useMemo(() => datasetsData?.data ?? [], [datasetsData]);
  const datasets = useMemo(() => allDatasets.filter((d) => d.status === 'READY'), [allDatasets]);
  const [dsSearch, setDsSearch] = useState('');
  const visibleDatasets = useMemo(() => {
    const q = dsSearch.trim().toLowerCase();
    if (!q) return datasets;
    return datasets.filter((d) => d.name.toLowerCase().includes(q));
  }, [datasets, dsSearch]);

  const { data: usersData } = useUsers();
  const users = useMemo(() => usersData ?? [], [usersData]);

  const createMutation = useCreateTask();

  useAuthGuard();

  const selectedDataset = useMemo(() => datasets.find((d) => d.id === datasetId), [datasets, datasetId]);
  const selectedUsers = useMemo(() => users.filter((m) => selectedEvaluators.includes(m.userId)), [users, selectedEvaluators]);

  const canContinue =
    step === 0
      ? Boolean(datasetId && name.trim())
      : step === 1
        ? criteria.length > 0
        : true;

  const updateCriteria = (index: number, patch: Partial<ScoringCriteria>) => {
    setCriteria((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const handleSubmit = async () => {
    setError('');
    try {
      await createMutation.mutateAsync({
        datasetId,
        name,
        description: description || undefined,
        type,
        scoringCriteria: criteria,
        evaluatorIds: selectedEvaluators.length ? selectedEvaluators : undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      router.push('/tasks');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    }
  };

  return (
    <AppShell>
      <div className="border-b border-ink-200 bg-paper/90 backdrop-blur-md">
        <div className="px-5 pt-4 md:px-9">
          <p className="mb-3 font-mono text-[11px] text-ink-400">
            <Link href="/tasks" className="transition-colors hover:text-ink">
              Evaluation Tasks
            </Link>
            <span className="mx-2 text-ink-300">/</span>
            <span className="text-ink-500">New task</span>
          </p>
          <h1 className="pb-4 text-[20px] md:text-xl">New evaluation task</h1>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-7 pb-20 md:px-9">
        <div className="mb-7">
          <Stepper steps={STEPS} current={step} />
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <section className="rounded-2xl border border-ink-200 bg-white p-6">
              <h3 className="mb-1 text-[15px]">Select a dataset</h3>
              <p className="mb-4 text-[12.5px] text-ink-500">
                Choose which dataset this task will pull prompts and responses from.
              </p>
              <div className="relative mb-3">
                <Search01Icon
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
                />
                <input
                  type="text"
                  value={dsSearch}
                  onChange={(e) => setDsSearch(e.target.value)}
                  placeholder="Search datasets…"
                  className="w-full rounded-sm border border-ink-300 bg-paper py-2.5 pl-9 pr-3 text-[13.5px] outline-none transition-colors focus:border-ink"
                />
              </div>
              {visibleDatasets.length === 0 ? (
                <p className="rounded-md border border-ink-200 px-3.5 py-3 text-[12.5px] text-ink-500">
                  No ready datasets available.{' '}
                  <Link href="/datasets/new" className="font-semibold text-ink underline">
                    Upload one first
                  </Link>
                </p>
              ) : (
                <div className="overflow-hidden rounded-md border border-ink-200">
                  {visibleDatasets.map((d) => {
                    const selected = d.id === datasetId;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDatasetId(d.id)}
                        className={cn(
                          'flex w-full items-center gap-3 border-b border-ink-100 px-4 py-3 text-left transition-colors last:border-b-0',
                          selected ? 'bg-ink text-white' : 'hover:bg-paper',
                        )}
                      >
                        <span
                          className={cn(
                            'h-[15px] w-[15px] shrink-0 rounded-full border-[1.5px]',
                            selected
                              ? 'border-white bg-white shadow-[inset_0_0_0_4px_var(--color-ink)]'
                              : 'border-ink-400',
                          )}
                        />
                        <Diamond01Icon size={15} className={cn(selected ? 'text-ink-400' : 'text-ink-400')} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-semibold">{d.name}</span>
                          <span className={cn('block font-mono text-[11px]', selected ? 'text-ink-400' : 'text-ink-500')}>
                            {d.format} · v{d.version} · updated {d.updatedAt ? 'recently' : '—'}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-[12px]">{formatNumber(d.rowCount)} rows</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-ink-200 bg-white p-6">
              <h3 className="mb-1 text-[15px]">Evaluation type</h3>
              <p className="mb-4 text-[12.5px] text-ink-500">
                This determines how the item shows up in the evaluator&apos;s queue.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {TYPE_CARDS.map((card) => {
                  const selected = type === card.value;
                  return (
                    <button
                      key={card.value}
                      type="button"
                      onClick={() => setType(card.value)}
                      className={cn(
                        'rounded-md border-[1.5px] p-4 text-left transition-colors',
                        selected ? 'border-ink bg-paper' : 'border-ink-200 hover:border-ink-400',
                      )}
                    >
                      <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-white">
                        <TargetMark value={card.value} />
                      </span>
                      <span className="block text-[14px] font-semibold text-ink">{card.title}</span>
                      <span className="mt-1 block text-[11.5px] leading-relaxed text-ink-500">
                        {card.desc}
                      </span>
                      <span
                        className={cn(
                          'mt-3 block font-mono text-[10px] uppercase tracking-[0.05em]',
                          selected ? 'font-semibold text-ink' : 'text-ink-400',
                        )}
                      >
                        {selected ? '✓ Selected' : 'Select'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-ink-200 bg-white p-6">
              <h3 className="mb-4 text-[15px]">Task basics</h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[12.5px] font-semibold text-ink-700">Task name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    minLength={2}
                    maxLength={200}
                    placeholder="e.g. GPT-4o vs Claude 3 Haiku"
                    className="w-full rounded-sm border border-ink-300 px-3.5 py-3 text-[14px] outline-none transition-colors focus:border-ink"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12.5px] font-semibold text-ink-700">
                    Description <span className="font-normal text-ink-400">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={1000}
                    placeholder="What should evaluators know before they start?"
                    className="w-full resize-y rounded-sm border border-ink-300 px-3.5 py-3 text-[14px] outline-none transition-colors focus:border-ink"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12.5px] font-semibold text-ink-700">
                    Due date <span className="font-normal text-ink-400">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="rounded-sm border border-ink-300 px-3.5 py-2.5 text-[14px] outline-none transition-colors focus:border-ink"
                  />
                </div>
              </div>
            </section>
          </div>
        )}

        {step === 1 && (
          <section className="space-y-3 rounded-2xl border border-ink-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-[15px]">Criteria</h3>
                <p className="text-[12.5px] text-ink-500">
                  Define the rubric evaluators will score against — name, description, and weight.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() =>
                  setCriteria((prev) => [
                    ...prev,
                    {
                      dimension: ScoreDimension.CUSTOM,
                      label: 'New criterion',
                      description: '',
                      minScore: 1,
                      maxScore: 10,
                      weight: 1,
                      required: false,
                    },
                  ])
                }
              >
                + Add criterion
              </Button>
            </div>
            {criteria.map((c, i) => (
              <div key={i} className="space-y-3 rounded-md border border-ink-200 p-4">
                <div className="flex items-center gap-3">
                  <select
                    value={c.dimension}
                    onChange={(e) => {
                      const dim = e.target.value as ScoreDimension;
                      updateCriteria(i, { dimension: dim, label: dim.charAt(0) + dim.slice(1).toLowerCase() });
                    }}
                    className="flex-1 rounded-sm border border-ink-300 px-2.5 py-2 text-[13.5px] outline-none focus:border-ink"
                  >
                    {DIMENSION_OPTIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={c.label}
                    onChange={(e) => updateCriteria(i, { label: e.target.value })}
                    placeholder="Label"
                    className="flex-1 rounded-sm border border-ink-300 px-2.5 py-2 text-[13.5px] outline-none focus:border-ink"
                  />
                  <button
                    type="button"
                    onClick={() => setCriteria((prev) => prev.filter((_, idx) => idx !== i))}
                    disabled={criteria.length <= 1}
                    className="px-2 text-sm text-ink-400 transition-colors hover:text-red-500 disabled:opacity-30"
                  >
                    ✕
                  </button>
                </div>
                <input
                  type="text"
                  value={c.description}
                  onChange={(e) => updateCriteria(i, { description: e.target.value })}
                  placeholder="Description of what this criterion measures"
                  className="w-full rounded-sm border border-ink-300 px-2.5 py-2 text-[13.5px] outline-none focus:border-ink"
                />
                <div className="flex flex-wrap items-center gap-4 text-[13px] text-ink-500">
                  <label className="flex items-center gap-2">
                    Min
                    <input
                      type="number"
                      value={c.minScore}
                      min={0}
                      onChange={(e) => updateCriteria(i, { minScore: Number(e.target.value) })}
                      className="w-20 rounded-sm border border-ink-300 px-2 py-1.5 text-[13.5px] outline-none focus:border-ink"
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    Max
                    <input
                      type="number"
                      value={c.maxScore}
                      min={1}
                      onChange={(e) => updateCriteria(i, { maxScore: Number(e.target.value) })}
                      className="w-20 rounded-sm border border-ink-300 px-2 py-1.5 text-[13.5px] outline-none focus:border-ink"
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    Weight
                    <input
                      type="number"
                      step="0.1"
                      value={c.weight}
                      min={0}
                      onChange={(e) => updateCriteria(i, { weight: Number(e.target.value) })}
                      className="w-20 rounded-sm border border-ink-300 px-2 py-1.5 text-[13.5px] outline-none focus:border-ink"
                    />
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={c.required}
                      onChange={(e) => updateCriteria(i, { required: e.target.checked })}
                      className="rounded accent-ink"
                    />
                    Required
                  </label>
                </div>
              </div>
            ))}
          </section>
        )}

        {step === 2 && (
          <section className="rounded-2xl border border-ink-200 bg-white p-6">
            <h3 className="mb-1 text-[15px]">Assign evaluators</h3>
            <p className="mb-4 text-[12.5px] text-ink-500">
              Pick who this task goes to, and how items get distributed across them.
            </p>
            {users.length === 0 ? (
              <p className="text-[12.5px] text-ink-500">
                No evaluators listed (only org admins can view members). You can assign evaluators
                later.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {users.map((m) => {
                  const checked = selectedEvaluators.includes(m.userId);
                  return (
                    <label
                      key={m.userId}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-md border px-3.5 py-2.5 transition-colors',
                        checked ? 'border-ink bg-paper' : 'border-ink-200 hover:border-ink-400',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedEvaluators((prev) =>
                            prev.includes(m.userId)
                              ? prev.filter((id) => id !== m.userId)
                              : [...prev, m.userId],
                          )
                        }
                        className="rounded accent-ink"
                      />
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-800 font-display text-[10px] font-semibold text-white">
                        {initialsOf(m.user.name || m.user.email)}
                      </span>
                      <span className="min-w-0 truncate text-[13px] text-ink">
                        {m.user.name || m.user.email}
                      </span>
                      <span className="ml-auto shrink-0 font-mono text-[10.5px] uppercase text-ink-400">
                        {m.user.role}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <section className="rounded-2xl border border-ink-200 bg-white p-6">
              <h3 className="mb-4 text-[15px]">Review</h3>
              <div className="divide-y divide-ink-100">
                {[
                  ['Task name', name],
                  ['Evaluation type', TYPE_LABELS[type] ?? type],
                  ['Dataset', selectedDataset?.name ?? '—'],
                  ['Rows', selectedDataset ? `${formatNumber(selectedDataset.rowCount)}` : '—'],
                  ['Due date', dueDate ? new Date(dueDate).toLocaleDateString() : '—'],
                  [
                    'Evaluators',
                    selectedUsers.length ? selectedUsers.map((m) => m.user.name || m.user.email).join(', ') : 'None',
                  ],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-3 text-[13px]">
                    <span className="text-ink-500">{k}</span>
                    <span className="truncate text-right font-mono font-semibold text-ink">{v}</span>
                  </div>
                ))}
              </div>
              {criteria.length > 0 && (
                <div className="mt-4 border-t border-ink-100 pt-4">
                  <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-400">
                    Criteria
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {criteria.map((c, i) => (
                      <span
                        key={i}
                        className="rounded-full border border-ink-200 bg-paper px-3 py-1 font-mono text-[11px] text-ink-600"
                      >
                        {c.label} <span className="text-ink-400">×{c.weight}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {description && (
              <section className="rounded-2xl border border-ink-200 bg-white p-6">
                <h3 className="mb-2 text-[15px]">Description</h3>
                <p className="text-[13px] leading-relaxed text-ink-600">{description}</p>
              </section>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-md border border-red-900/30 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" type="button" onClick={() => (step === 0 ? router.push('/tasks') : setStep(step - 1))}>
            {step === 0 ? 'Cancel' : '← Back'}
          </Button>
          {step < 3 ? (
            <Button type="button" disabled={!canContinue} onClick={() => setStep(step + 1)}>
              Continue {STEPS[step + 1].toLowerCase()} →
            </Button>
          ) : (
            <Button type="button" disabled={createMutation.isPending} onClick={handleSubmit}>
              {createMutation.isPending ? 'Creating…' : 'Create task'}
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function TargetMark({ value }: { value: string }) {
  if (value === 'PAIRWISE') {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="white" strokeWidth="2" />
        <circle cx="12" cy="12" r="2" fill="white" />
      </svg>
    );
  }
  if (value === 'RANKING') {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="4" width="16" height="16" rx="2" stroke="white" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M12 4L20 8V16L12 20L4 16V8L12 4Z" stroke="white" strokeWidth="2" />
    </svg>
  );
}