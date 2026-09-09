'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Link01Icon, Cancel01Icon } from 'hugeicons-react';

import { Button } from '@/components/ui/button';
import { useCreateDataset } from '@/hooks/use-datasets';
import { api } from '@/lib/api';

function fileNameFromUrl(url: string) {
  try {
    const segment = new URL(url).pathname.split('/').pop();
    if (segment && segment.includes('.')) return segment;
  } catch {
    /* fall through */
  }
  return 'dataset-from-url';
}

function formatFromUrl(url: string): 'CSV' | 'JSON' | 'JSONL' {
  const name = fileNameFromUrl(url).toLowerCase();
  if (name.endsWith('.jsonl')) return 'JSONL';
  if (name.endsWith('.json')) return 'JSON';
  return 'CSV';
}

export function UrlImportModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (datasetId: string) => void;
}) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const createMutation = useCreateDataset();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Could not fetch the file (HTTP ${res.status})`);
      const blob = await res.blob();
      const fileName = fileNameFromUrl(url);
      const dataset = (await createMutation.mutateAsync({
        name: name.trim() || fileName,
        format: formatFromUrl(url),
      })) as { id: string };
      const file = new File([blob], fileName, { type: blob.type });
      await api.uploadDatasetFile(dataset.id, file);
      onDone(dataset.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-5 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-110 overflow-hidden rounded-2xl bg-white shadow-2xl"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between px-6 pb-2 pt-6">
            <div>
              <p className="mb-2 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-500">
                <span className="h-1.5 w-1.5 rounded-full border border-ink-500" />
                New dataset
              </p>
              <h2 className="text-[19px]">Import from URL</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
                Point to a public CSV, JSON, or JSONL file and we&apos;ll pull it in.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-7 w-7 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-paper hover:text-ink"
            >
              <Cancel01Icon size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 pb-6">
            <div className="mb-4">
              <label className="mb-1.5 block text-[12px] font-semibold text-ink-700">
                File URL
              </label>
              <div className="relative">
                <Link01Icon
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
                />
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/export.csv"
                  className="w-full rounded-sm border border-ink-300 py-2.5 pl-9 pr-3 text-[13.5px] outline-none transition-colors focus:border-ink"
                />
              </div>
            </div>
            <div className="mb-5">
              <label className="mb-1.5 block text-[12px] font-semibold text-ink-700">
                Dataset name <span className="font-normal text-ink-400">(optional)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Derived from file name"
                className="w-full rounded-sm border border-ink-300 px-3 py-2.5 text-[13.5px] outline-none transition-colors focus:border-ink"
              />
            </div>

            {error && (
              <p className="mb-4 rounded-md border border-ink-200 bg-paper px-3 py-2.5 font-mono text-[11.5px] text-ink-600">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2.5 border-t border-ink-100 pt-4">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || !url.trim()}>
                {createMutation.isPending ? 'Importing…' : 'Import'}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
