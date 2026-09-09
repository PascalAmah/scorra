'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckmarkCircle01Icon, Diamond01Icon, Upload01Icon } from 'hugeicons-react';

import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import { useCreateDataset, useUploadDatasetFile } from '@/hooks/use-datasets';
import { api } from '@/lib/api';
import { cn, formatNumber } from '@/lib/utils';

type FileFormat = 'CSV' | 'JSON' | 'JSONL';
type Target = 'prompt' | 'context' | 'expectedOutput' | 'tags' | 'metadata' | 'ignore';

const TARGET_LABELS: Record<Target, string> = {
  prompt: 'prompt',
  context: 'context',
  expectedOutput: 'expectedOutput',
  tags: 'tags',
  metadata: 'metadata',
  ignore: 'Ignore column',
};

const TARGET_ORDER: Target[] = ['prompt', 'context', 'expectedOutput', 'tags', 'metadata'];

const TARGET_HINTS: Partial<Record<Target, string>> = {
  prompt: 'required',
  expectedOutput: 'optional',
};

interface ParsedFile {
  format: FileFormat;
  fileName: string;
  fileSize: number;
  columns: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(cur);
      cur = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cur);
      cur = '';
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
    } else {
      cur += c;
    }
  }
  if (cur !== '' || row.length) {
    row.push(cur);
    if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  }
  return rows;
}

function asObjects(value: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(value)) {
    return value.every((v) => typeof v === 'object' && v !== null) ? value : null;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.rows)) return record.rows;
    if (Array.isArray(record.data)) return record.data;
  }
  return null;
}

function parseFile(file: File, text: string): ParsedFile {
  const lower = file.name.toLowerCase();
  let format: FileFormat;
  let objects: Record<string, unknown>[];

  if (lower.endsWith('.csv')) {
    format = 'CSV';
    const grid = parseCSV(text);
    if (grid.length < 2) throw new Error('CSV needs a header row plus data rows.');
    const headers = grid[0].map((h) => h.trim());
    objects = grid
      .slice(1)
      .map((cells) => Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ''])));
  } else if (lower.endsWith('.jsonl')) {
    format = 'JSONL';
    objects = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  } else if (lower.endsWith('.json')) {
    format = 'JSON';
    const parsed = asObjects(JSON.parse(text));
    if (!parsed) throw new Error('Expected a JSON array of objects.');
    objects = parsed;
  } else {
    throw new Error('Unsupported file type — use CSV, JSON, or JSONL.');
  }

  if (objects.length === 0) throw new Error('No data rows detected.');

  const columns = Array.from(
    new Set(objects.slice(0, 50).flatMap((obj) => Object.keys(obj ?? {}))),
  );

  return {
    format,
    fileName: file.name,
    fileSize: file.size,
    columns,
    rows: objects,
    totalRows: objects.length,
  };
}

function detectTarget(column: string): Target {
  const c = column.toLowerCase();
  if (/prompt|message|question|query|text|input|utterance/.test(c)) return 'prompt';
  if (/context/.test(c)) return 'context';
  if (/expected|output|answer|ideal|gold|reference/.test(c)) return 'expectedOutput';
  if (/tag|categor|label|intent|segment/.test(c)) return 'tags';
  if (/meta|source|id|timestamp|created|priority|difficulty/.test(c)) return 'metadata';
  return 'ignore';
}

function autoMapping(columns: string[]): Record<string, Target> {
  const mapping: Record<string, Target> = {};
  columns.forEach((col) => {
    mapping[col] = detectTarget(col);
  });
  if (!Object.values(mapping).includes('prompt')) {
    const first = columns[0];
    if (first) mapping[first] = 'prompt';
  }
  return mapping;
}

function applyMapping(
  rows: Record<string, unknown>[],
  mapping: Record<string, Target>,
  count: number,
) {
  return rows.slice(0, count).map((r) => {
    const out: Record<string, string> = {};
    for (const col of Object.keys(r)) {
      const target = mapping[col];
      if (!target || target === 'ignore') continue;
      const val = r[col];
      const str = Array.isArray(val) ? val.join(', ') : String(val ?? '');
      out[target] = out[target] ? `${out[target]}, ${str}` : str;
    }
    return out;
  });
}

export function UploadWizard({ datasetId }: { datasetId?: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [step, setStep] = useState(1);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<Record<string, Target>>({});
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const steps = ['Upload', 'Map columns', 'Review & import'];
  const createMode = !datasetId;

  const createMutation = useCreateDataset();
  const uploadMutation = useUploadDatasetFile(datasetId as string);
  const importing = createMutation.isPending || uploadMutation.isPending;

  const handleFile = async (selected: File | null) => {
    if (!selected) return;
    setError('');
    try {
      const text = await selected.text();
      const p = parseFile(selected, text);
      setParsed(p);
      setFile(selected);
      setMapping(autoMapping(p.columns));
      setName(p.fileName.replace(/\.[^.]+$/, ''));
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that file');
    }
  };

  const preview = useMemo(() => {
    if (!parsed) return [];
    return applyMapping(parsed.rows, mapping, 3);
  }, [parsed, mapping]);

  const mappedColumns = useMemo(
    () => (parsed?.columns ?? []).filter((col) => mapping[col] && mapping[col] !== 'ignore'),
    [parsed, mapping],
  );

  const promptColumn = useMemo(
    () => Object.entries(mapping).find(([, t]) => t === 'prompt')?.[0],
    [mapping],
  );

  const handleImport = async () => {
    if (!parsed || !file) return;
    setError('');
    try {
      if (createMode) {
        const ds = (await createMutation.mutateAsync({
          name: name.trim() || parsed.fileName,
          format: parsed.format,
          description: description.trim() || undefined,
        })) as { id: string };
        await api.uploadDatasetFile(ds.id, file);
        router.push(`/datasets/${ds.id}`);
      } else {
        await uploadMutation.mutateAsync(file);
        router.push(`/datasets/${datasetId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    }
  };

  return (
    <div className="px-5 pb-16 pt-7 md:px-9">
      <div className="mx-auto max-w-205">
        <div className="mb-8">
          <Stepper steps={steps} current={step - 1} />
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-ink-200 bg-paper px-4 py-3 font-mono text-[11.5px] text-ink-600">
            {error}
          </div>
        )}

        {step === 1 && (
          <>
            <div className="mb-4 rounded-2xl border border-ink-200 bg-white p-7">
              <h3 className="mb-1 text-[15px]">Upload your file</h3>
              <p className="mb-5 text-[12.5px] text-ink-500">
                CSV, JSON, or JSONL. Up to a few thousand rows is fine.
              </p>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFile(e.dataTransfer.files?.[0] ?? null);
                }}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center transition-colors',
                  dragOver ? 'border-ink bg-paper' : 'border-ink-300 hover:border-ink',
                )}
              >
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-ink text-white">
                  <Upload01Icon size={18} />
                </span>
                <p className="text-[13.5px] font-semibold text-ink">
                  Drop a file here, or <span className="underline">browse</span>
                </p>
                <p className="mt-1 font-mono text-[11px] text-ink-400">
                  {datasetId
                    ? 'New version replaces the current dataset rows.'
                    : 'Creates a new dataset.'}
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,.json,.jsonl"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          </>
        )}

        {step === 2 && parsed && (
          <>
            <div className="mb-4 rounded-2xl border border-ink-200 bg-white p-6">
              <div className="flex items-center gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ink-200 bg-paper">
                  <Diamond01Icon size={16} className="text-ink" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-ink">
                    {parsed.fileName}
                  </span>
                  <span className="block font-mono text-[11px] text-ink-500">
                    {(parsed.fileSize / 1048576).toFixed(1)} MB · {parsed.format} ·{' '}
                    {formatNumber(parsed.totalRows)} rows detected
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStep(1);
                    setParsed(null);
                    setFile(null);
                  }}
                >
                  Replace file
                </Button>
              </div>
            </div>

            <div className="mb-4 rounded-2xl border border-ink-200 bg-white p-6">
              <h3 className="mb-1 text-[15px]">Map columns</h3>
              <p className="mb-5 text-[12.5px] text-ink-500">
                Match each column in your file to a field in the Scorra dataset schema.
              </p>
              <table className="w-full border-collapse min-w-[420px]">
                <thead>
                  <tr>
                    <th className="pb-2.5 text-left font-mono text-[10px] uppercase tracking-[0.06em] text-ink-500">
                      Source column
                    </th>
                    <th className="w-12 pb-2.5 text-center font-mono text-[10px] uppercase tracking-[0.06em] text-ink-500"></th>
                    <th className="pb-2.5 text-left font-mono text-[10px] uppercase tracking-[0.06em] text-ink-500">
                      Maps to
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.columns.map((col) => (
                    <tr key={col}>
                      <td className="border-t border-ink-100 py-2.5">
                        <span className="inline-block rounded-[5px] border border-ink-200 bg-paper px-2.5 py-1.5 font-mono text-[12.5px] text-ink">
                          {col}
                        </span>
                      </td>
                      <td className="border-t border-ink-100 py-2.5 text-center text-ink-400">→</td>
                      <td className="border-t border-ink-100 py-2.5">
                        <select
                          value={mapping[col] ?? 'ignore'}
                          onChange={(e) =>
                            setMapping((prev) => ({ ...prev, [col]: e.target.value as Target }))
                          }
                          className="w-full rounded-sm border border-ink-300 bg-white px-2.5 py-2 text-[13px] outline-none focus:border-ink"
                        >
                          {TARGET_ORDER.map((t) => (
                            <option key={t} value={t}>
                              {TARGET_LABELS[t]}
                              {TARGET_HINTS[t] ? ` — ${TARGET_HINTS[t]}` : ''}
                            </option>
                          ))}
                          <option value="ignore">{TARGET_LABELS.ignore}</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mb-4 rounded-2xl border border-ink-200 bg-white p-6">
              <h3 className="mb-1 text-[15px]">Preview</h3>
              <p className="mb-4 text-[12.5px] text-ink-500">
                First 3 rows, using the mapping above.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[420px]">
                  <thead>
                    <tr>
                      {TARGET_ORDER.filter((t) => preview.some((p) => p[t])).map((t) => (
                        <th
                          key={t}
                          className="border border-ink-200 bg-paper px-2.5 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-ink-500"
                        >
                          {TARGET_LABELS[t]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((p, i) => (
                      <tr key={i}>
                        {TARGET_ORDER.filter((t) => preview.some((r) => r[t])).map((t) => (
                          <td
                            key={t}
                            className="max-w-55 truncate whitespace-nowrap border border-ink-200 px-2.5 py-2 text-[12px] text-ink-700"
                          >
                            {p[t] ?? '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {step === 3 && parsed && (
          <>
            <div className="mb-4 rounded-2xl border border-ink-200 bg-white p-6">
              <div className="flex items-center gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ink-200 bg-paper">
                  <Diamond01Icon size={16} className="text-ink" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-ink">
                    {parsed.fileName}
                  </span>
                  <span className="block font-mono text-[11px] text-ink-500">
                    {(parsed.fileSize / 1048576).toFixed(1)} MB · {parsed.format} ·{' '}
                    {formatNumber(parsed.totalRows)} rows
                  </span>
                </span>
              </div>
            </div>

            <div className="mb-4 rounded-2xl border border-ink-200 bg-white p-6">
              <h3 className="mb-1 text-[15px]">Review &amp; import</h3>
              <p className="mb-5 text-[12.5px] text-ink-500">
                {createMode
                  ? 'Confirm the details below, then start the import. You’ll see live progress as rows are validated and saved.'
                  : 'This upload becomes a new version of the dataset, replacing the current rows.'}
              </p>

              <dl className="mb-6 space-y-3">
                {[
                  { k: 'File', v: parsed.fileName },
                  { k: 'Format', v: parsed.format },
                  { k: 'Rows detected', v: formatNumber(parsed.totalRows) },
                  { k: 'Prompt column', v: promptColumn ?? '—' },
                  { k: 'Mapped columns', v: String(mappedColumns.length) },
                ].map((item) => (
                  <div
                    key={item.k}
                    className="flex items-center justify-between border-b border-ink-100 pb-2.5 text-[13px] last:border-b-0"
                  >
                    <dt className="text-ink-500">{item.k}</dt>
                    <dd className="max-w-[60%] truncate font-mono font-medium text-ink">
                      {item.v}
                    </dd>
                  </div>
                ))}
              </dl>

              {createMode && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[12.5px] font-semibold text-ink-700">
                      Dataset name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full rounded-sm border border-ink-300 px-3 py-2.5 text-[14px] outline-none transition-colors focus:border-ink"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12.5px] font-semibold text-ink-700">
                      Description <span className="font-normal text-ink-400">(optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full resize-y rounded-sm border border-ink-300 px-3 py-2.5 text-[14px] outline-none transition-colors focus:border-ink"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <div className="mt-6 flex items-center justify-between">
          {step > 1 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => router.push('/datasets')}>
              Cancel
            </Button>
          )}

          {step === 1 && (
            <Button onClick={() => inputRef.current?.click()} disabled={!parsed}>
              Continue to mapping →
            </Button>
          )}
          {step === 2 && <Button onClick={() => setStep(3)}>Continue to review →</Button>}
          {step === 3 && (
            <Button onClick={handleImport} disabled={importing || (createMode && !name.trim())}>
              {importing ? (
                <>
                  <CheckmarkCircle01Icon size={14} className="animate-spin" />
                  Importing…
                </>
              ) : datasetId ? (
                'Import new version'
              ) : (
                'Start import'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
