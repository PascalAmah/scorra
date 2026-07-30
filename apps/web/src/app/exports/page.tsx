'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface ExportItem {
  id: string;
  format: string;
  status: string;
  fileUrl: string | null;
  rowCount: number | null;
  createdAt: string;
  requestedBy?: { name: string; email: string };
  task?: { name: string };
}

const STATUS_COLORS: Record<string, string> = {
  READY: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  PROCESSING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  PENDING: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  FAILED: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function ExportsPage() {
  const router = useRouter();
  const [exports, setExports] = useState<ExportItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExports = useCallback(async () => {
    try {
      const data = (await api.getExports()) as ExportItem[];
      setExports(data);
    } catch (err) {
      console.error('Failed to fetch exports', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!api.isAuthenticated) { router.replace('/login'); return; }
    fetchExports();
  }, [fetchExports, router]);

  const handleDownload = async (id: string) => {
    try {
      const { downloadUrl } = await api.getExportDownload(id);
      window.open(downloadUrl, '_blank');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Download failed');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/dashboard')} className="text-zinc-400 hover:text-white text-sm">← Dashboard</button>
        <h1 className="text-lg font-bold">Exports</h1>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <p className="text-zinc-400 text-sm">Loading exports...</p>
        ) : exports.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-500 text-lg mb-2">No exports yet</p>
            <p className="text-zinc-600 text-sm">Exports are generated from completed evaluation tasks</p>
          </div>
        ) : (
          <div className="space-y-2">
            {exports.map((exp) => (
              <div key={exp.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium">{exp.task?.name || 'Export'}</span>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[exp.status] || STATUS_COLORS.PENDING}`}>
                      {exp.status}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 flex gap-3">
                    <span>{exp.format}</span>
                    {exp.rowCount != null && <span>{exp.rowCount.toLocaleString()} rows</span>}
                    <span>{new Date(exp.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {exp.status === 'READY' && (
                  <button onClick={() => handleDownload(exp.id)} className="rounded border border-zinc-700 px-3 py-1.5 text-xs hover:bg-zinc-800">
                    Download
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
