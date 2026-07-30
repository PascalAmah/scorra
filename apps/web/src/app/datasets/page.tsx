'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Dataset {
  id: string;
  name: string;
  description: string | null;
  format: string;
  status: string;
  version: number;
  rowCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string; email: string };
  _count?: { rows: number; tasks: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  READY: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  PROCESSING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  PENDING: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  FAILED: 'bg-red-500/10 text-red-400 border-red-500/20',
  ARCHIVED: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
};

const FORMAT_LABELS: Record<string, string> = {
  CSV: 'CSV',
  JSON: 'JSON',
  JSONL: 'JSON Lines',
};

export default function DatasetsPage() {
  const router = useRouter();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  const fetchDatasets = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await api.getDatasets({ page, limit: 20, search: search || undefined })) as {
        data: Dataset[];
        pagination: Pagination;
      };
      setDatasets(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to fetch datasets', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!api.isAuthenticated) {
      router.replace('/login');
      return;
    }
    fetchDatasets();
  }, [fetchDatasets, router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDatasets();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')} className="text-zinc-400 hover:text-white text-sm">
            ← Dashboard
          </button>
          <h1 className="text-lg font-bold">Datasets</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-white text-black px-4 py-2 text-sm font-medium hover:bg-zinc-200 transition-colors"
        >
          New Dataset
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Search */}
        <form onSubmit={handleSearch} className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search datasets..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600"
          />
        </form>

        {/* List */}
        {loading ? (
          <p className="text-zinc-400 text-sm">Loading datasets...</p>
        ) : datasets.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-500 text-lg mb-2">No datasets yet</p>
            <p className="text-zinc-600 text-sm mb-4">Create your first dataset to start evaluating LLM responses</p>
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-lg bg-white text-black px-4 py-2 text-sm font-medium hover:bg-zinc-200 transition-colors"
            >
              Create Dataset
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {datasets.map((ds) => (
                <button
                  key={ds.id}
                  onClick={() => router.push(`/datasets/${ds.id}`)}
                  className="w-full text-left rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 hover:bg-zinc-900 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="font-medium">{ds.name}</h3>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[ds.status] || STATUS_COLORS.PENDING}`}
                    >
                      {ds.status}
                    </span>
                  </div>
                  {ds.description && (
                    <p className="text-sm text-zinc-400 mb-2 line-clamp-1">{ds.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span>{FORMAT_LABELS[ds.format] || ds.format}</span>
                    <span>v{ds.version}</span>
                    <span>{ds.rowCount.toLocaleString()} rows</span>
                    {ds.tags.length > 0 && (
                      <span className="text-zinc-600">{ds.tags.join(', ')}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 text-sm">
                <span className="text-zinc-500">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(pagination.page - 1)}
                    disabled={!pagination.hasPrev}
                    className="rounded border border-zinc-800 px-3 py-1 disabled:opacity-30 disabled:cursor-not-allowed hover:border-zinc-700"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(pagination.page + 1)}
                    disabled={!pagination.hasNext}
                    className="rounded border border-zinc-800 px-3 py-1 disabled:opacity-30 disabled:cursor-not-allowed hover:border-zinc-700"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Create Modal */}
      {showCreate && <CreateDatasetModal onClose={() => setShowCreate(false)} onCreated={fetchDatasets} />}
    </div>
  );
}

function CreateDatasetModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [format, setFormat] = useState('CSV');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await api.createDataset({
        name,
        format,
        description: description || undefined,
        tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create dataset');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">Create Dataset</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={200}
              placeholder="e.g. Customer Support Q&A v1"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              placeholder="What this dataset is for"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:border-zinc-600"
            >
              <option value="CSV">CSV</option>
              <option value="JSON">JSON</option>
              <option value="JSONL">JSON Lines</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Tags (comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="qa, customer-support, v1"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-800 py-2 text-sm hover:bg-zinc-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="flex-1 rounded-lg bg-white text-black py-2 text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
