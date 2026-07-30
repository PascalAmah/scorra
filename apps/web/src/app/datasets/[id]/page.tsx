'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';

interface DatasetRow {
  id: string;
  rowIndex: number;
  prompt: string;
  promptType: string;
  context: string | null;
  expectedOutput: string | null;
  tags: string[];
}

interface Dataset {
  id: string;
  name: string;
  description: string | null;
  format: string;
  status: string;
  version: number;
  rowCount: number;
  tags: string[];
  fileUrl: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string; email: string };
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

const PROMPT_TYPE_COLORS: Record<string, string> = {
  COMPLETION: 'bg-blue-500/10 text-blue-400',
  CHAT: 'bg-purple-500/10 text-purple-400',
  INSTRUCTION: 'bg-amber-500/10 text-amber-400',
  CLASSIFICATION: 'bg-green-500/10 text-green-400',
  SUMMARIZATION: 'bg-cyan-500/10 text-cyan-400',
  TRANSLATION: 'bg-pink-500/10 text-pink-400',
  CUSTOM: 'bg-zinc-500/10 text-zinc-400',
};

export default function DatasetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [rows, setRows] = useState<DatasetRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTags, setEditTags] = useState('');

  const fetchDataset = useCallback(async () => {
    try {
      const ds = (await api.getDataset(id)) as Dataset;
      setDataset(ds);
    } catch (err) {
      console.error('Failed to fetch dataset', err);
      router.push('/datasets');
    }
  }, [id, router]);

  const fetchRows = useCallback(async () => {
    try {
      const res = (await api.getDatasetRows(id, { page, limit: 50 })) as {
        data: DatasetRow[];
        pagination: Pagination;
      };
      setRows(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to fetch rows', err);
    }
  }, [id, page]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!api.isAuthenticated) {
      router.replace('/login');
      return;
    }
    setLoading(true);
    Promise.all([fetchDataset(), fetchRows()]).finally(() => setLoading(false));
  }, [fetchDataset, fetchRows, router]);

  useEffect(() => {
    fetchRows();
  }, [page, fetchRows]);

  // Poll for processing status
  useEffect(() => {
    if (dataset?.status !== 'PROCESSING') return;
    const interval = setInterval(() => {
      fetchDataset();
      fetchRows();
    }, 3000);
    return () => clearInterval(interval);
  }, [dataset?.status, fetchDataset, fetchRows]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError('');
    try {
      await api.uploadDatasetFile(id, file);
      await fetchDataset();
      await fetchRows();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      const updated = (await api.updateDataset(id, {
        name: editName || undefined,
        description: editDesc || undefined,
        tags: editTags
          ? editTags.split(',').map((t) => t.trim()).filter(Boolean)
          : undefined,
      })) as Dataset;
      setDataset(updated);
      setEditing(false);
    } catch (err) {
      console.error('Failed to update dataset', err);
    }
  };

  const handleClone = async () => {
    try {
      await api.cloneDataset(id);
      router.push('/datasets');
    } catch (err) {
      console.error('Failed to clone dataset', err);
    }
  };

  const handleArchive = async () => {
    if (!confirm('Archive this dataset?')) return;
    try {
      await api.archiveDataset(id);
      fetchDataset();
    } catch (err) {
      console.error('Failed to archive dataset', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Permanently delete this dataset? This cannot be undone.')) return;
    try {
      await api.deleteDataset(id);
      router.push('/datasets');
    } catch (err) {
      console.error('Failed to delete dataset', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!dataset) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={() => router.push('/datasets')} className="text-zinc-400 hover:text-white text-sm shrink-0">
              ← Datasets
            </button>
            <div className="min-w-0">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm w-64 focus:outline-none focus:border-zinc-500"
                  />
                  <button onClick={handleSaveEdit} className="text-emerald-400 text-sm hover:text-emerald-300">Save</button>
                  <button onClick={() => setEditing(false)} className="text-zinc-400 text-sm hover:text-white">Cancel</button>
                </div>
              ) : (
                <h1 className="text-lg font-bold truncate">{dataset.name}</h1>
              )}
            </div>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium shrink-0 ${STATUS_COLORS[dataset.status] || STATUS_COLORS.PENDING}`}>
              {dataset.status}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <label className={`rounded-lg px-3 py-2 text-sm font-medium cursor-pointer transition-colors ${uploading ? 'bg-zinc-700 text-zinc-300' : 'bg-white text-black hover:bg-zinc-200'}`}>
              {uploading ? 'Uploading...' : 'Upload File'}
              <input type="file" accept=".csv,.json,.jsonl" onChange={handleUpload} className="hidden" disabled={uploading} />
            </label>
            <button
              onClick={() => {
                setEditName(dataset.name);
                setEditDesc(dataset.description || '');
                setEditTags(dataset.tags.join(', '));
                setEditing(true);
              }}
              className="rounded-lg border border-zinc-800 px-3 py-2 text-sm hover:bg-zinc-900 transition-colors"
            >
              Edit
            </button>
            <button onClick={handleClone} className="rounded-lg border border-zinc-800 px-3 py-2 text-sm hover:bg-zinc-900 transition-colors">
              Clone
            </button>
            <button onClick={handleArchive} className="rounded-lg border border-zinc-800 px-3 py-2 text-sm hover:bg-zinc-900 transition-colors">
              Archive
            </button>
            <button onClick={handleDelete} className="rounded-lg border border-red-900/50 px-3 py-2 text-sm text-red-400 hover:bg-red-950/30 transition-colors">
              Delete
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {uploadError && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {uploadError}
          </div>
        )}

        {/* Edit form */}
        {editing && (
          <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Description</label>
              <input
                type="text"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Description..."
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm focus:outline-none focus:border-zinc-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="qa, support"
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>
        )}

        {/* Info bar */}
        <div className="flex items-center gap-6 text-sm text-zinc-500 mb-6">
          <span>Format: <span className="text-zinc-300">{dataset.format}</span></span>
          <span>Version: <span className="text-zinc-300">v{dataset.version}</span></span>
          <span>Rows: <span className="text-zinc-300">{dataset.rowCount.toLocaleString()}</span></span>
          {dataset.description && <span className="text-zinc-400 truncate max-w-md">{dataset.description}</span>}
          {dataset.tags.length > 0 && (
            <div className="flex gap-1">
              {dataset.tags.map((t) => (
                <span key={t} className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Processing state */}
        {dataset.status === 'PROCESSING' && (
          <div className="mb-6 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-400 flex items-center gap-2">
            <div className="size-2 rounded-full bg-amber-400 animate-pulse" />
            Processing uploaded file... (auto-refreshes)
          </div>
        )}

        {/* Pending state */}
        {dataset.status === 'PENDING' && (
          <div className="mb-6 rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-400">
            This dataset is waiting for a file upload. Upload a {dataset.format} file to populate it.
          </div>
        )}

        {/* Failed state */}
        {dataset.status === 'FAILED' && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            Processing failed. Try uploading the file again.
          </div>
        )}

        {/* Row browser */}
        {rows.length > 0 && (
          <>
            <h2 className="text-sm font-medium text-zinc-400 mb-3">
              Rows ({pagination?.total.toLocaleString() || rows.length} total)
            </h2>
            <div className="space-y-1.5">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3 hover:bg-zinc-900/60 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-600">#{row.rowIndex}</span>
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${PROMPT_TYPE_COLORS[row.promptType] || PROMPT_TYPE_COLORS.CUSTOM}`}>
                      {row.promptType}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300 line-clamp-2">{row.prompt}</p>
                  {row.context && (
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-1">Context: {row.context}</p>
                  )}
                  {row.expectedOutput && (
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-1">Expected: {row.expectedOutput}</p>
                  )}
                  {row.tags.length > 0 && (
                    <div className="flex gap-1 mt-1.5">
                      {row.tags.map((t) => (
                        <span key={t} className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-500">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 text-sm">
                <span className="text-zinc-500">
                  Page {pagination.page} of {pagination.totalPages}
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
    </div>
  );
}
