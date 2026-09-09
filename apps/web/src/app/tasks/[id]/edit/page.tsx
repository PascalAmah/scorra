'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { AppShell } from '@/components/dashboard/shell';
import { Button } from '@/components/ui/button';
import { useTask } from '@/hooks/use-tasks';
import { api } from '@/lib/api';
import type { EvaluationTask } from '@scorra/types';

export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;

  const { data: task, isPending } = useTask(taskId);

  if (isPending || !task) {
    return (
      <AppShell>
        <div className="flex h-[60vh] items-center justify-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">Loading…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
        <Link href={`/tasks/${taskId}`} className="text-zinc-400 hover:text-white text-sm">
          ← Back to task
        </Link>
        <h1 className="text-lg font-bold">Edit task</h1>
      </header>

      <TaskForm taskId={taskId} task={task} onSaved={() => router.push(`/tasks/${taskId}`)} />
    </AppShell>
  );
}

function TaskForm({
  taskId,
  task,
  onSaved,
}: {
  taskId: string;
  task: EvaluationTask;
  onSaved: () => void;
}) {
  const [name, setName] = useState(task.name);
  const [description, setDescription] = useState(task.description ?? '');
  const [dueDate, setDueDate] = useState(
    task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.updateTask(taskId, {
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-5 pb-14 pt-6 md:px-9 max-w-xl">
      {error && (
        <div className="mb-4 rounded-md border border-red-900/30 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-ink">Task name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-ink-300 bg-white px-3 py-2.5 text-[13.5px] outline-none focus:border-ink"
            placeholder="e.g. GPT-4 vs Claude 3 — Customer Support"
            maxLength={200}
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-ink">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-ink-300 bg-white px-3 py-2.5 text-[13.5px] outline-none focus:border-ink resize-none"
            rows={3}
            placeholder="Optional description…"
            maxLength={1000}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-ink">Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-lg border border-ink-300 bg-white px-3 py-2.5 text-[13.5px] outline-none focus:border-ink"
          />
        </div>

        <div className="!mt-7 flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          <Button variant="ghost" asChild>
            <Link href={`/tasks/${taskId}`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
