import { parse } from 'csv-parse/sync';
import { PromptType, AIProvider } from '@prisma/client';

export interface ParsedRow {
  prompt?: string;
  input?: string;
  question?: string;
  type?: string;
  context?: string;
  expected_output?: string;
  output?: string;
  response?: string;
  responses?: unknown[];
  model_name?: string;
  model?: string;
  provider?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  rowIndex?: number;
  [key: string]: unknown;
}

export interface ParsedModelResponse {
  response: string;
  modelName: string;
  modelId: string;
  provider: AIProvider;
}

/**
 * Parse a dataset file buffer into rows, detecting the format from content
 * rather than trusting a declared format label. Supports JSON arrays, JSON
 * objects, JSONL, and delimited text (CSV/TSV).
 */
export function parseDatasetRows(buffer: Buffer): ParsedRow[] {
  const content = buffer.toString('utf-8').trim();
  if (!content) return [];

  const first = content[0];

  // JSON array: [ { ... }, ... ]
  if (first === '[') {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? (parsed as ParsedRow[]) : [parsed as ParsedRow];
  }

  // JSON object — either a single record or JSONL (one object per line)
  if (first === '{') {
    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length > 1) {
      let isJsonl = true;
      for (const line of lines) {
        if (!line.startsWith('{')) {
          isJsonl = false;
          break;
        }
        try {
          JSON.parse(line);
        } catch {
          isJsonl = false;
          break;
        }
      }
      if (isJsonl) return lines.map((line) => JSON.parse(line) as ParsedRow);
    }

    return [JSON.parse(content) as ParsedRow];
  }

  // Delimited text (CSV/TSV) by default
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as ParsedRow[];
}

export function rowPrompt(row: ParsedRow): string {
  return String(row.prompt || row.input || row.question || '');
}

export function rowExpectedOutput(row: ParsedRow): string | null {
  const value = row.expected_output ?? row.output;
  return value ? String(value) : null;
}

export function rowPromptType(type?: string): PromptType {
  if (!type) return 'COMPLETION';
  const upper = type.toUpperCase();
  const validTypes: PromptType[] = [
    'COMPLETION',
    'CHAT',
    'INSTRUCTION',
    'CLASSIFICATION',
    'SUMMARIZATION',
    'TRANSLATION',
    'CUSTOM',
  ];
  return validTypes.includes(upper as PromptType) ? (upper as PromptType) : 'COMPLETION';
}

/**
 * Extract model responses from a parsed row.
 *
 * Supports either a single `response` column (with optional `model_name` /
 * `model` and `provider`) or a `responses` column containing a JSON array of
 * strings or objects ({ response, model_name, provider }) for multiple
 * responses per prompt (e.g. pairwise A/B data).
 */
export function rowModelResponses(row: ParsedRow): ParsedModelResponse[] {
  let multi: unknown = row.responses;
  if (typeof multi === 'string' && multi.trim()) {
    try {
      multi = JSON.parse(multi);
    } catch {
      multi = undefined;
    }
  }
  if (Array.isArray(multi)) {
    const out: ParsedModelResponse[] = [];
    for (const entry of multi) {
      if (typeof entry === 'string') {
        if (entry.trim()) out.push(buildResponse(entry, row, row));
      } else if (entry && typeof entry === 'object') {
        const obj = entry as Record<string, unknown>;
        const text = obj.response ?? obj.text ?? obj.output;
        if (typeof text === 'string' && text.trim()) {
          out.push(buildResponse(text, obj, row));
        }
      }
    }
    if (out.length) return out;
  }

  const single = row.response;
  if (typeof single === 'string' && single.trim()) {
    return [buildResponse(single, row, row)];
  }

  return [];
}

function buildResponse(
  text: string,
  source: Record<string, unknown>,
  row: ParsedRow,
): ParsedModelResponse {
  const modelName =
    stringOf(source.model_name) ??
    stringOf(source.modelName) ??
    stringOf(source.model) ??
    stringOf(row.model_name) ??
    stringOf(row.modelName) ??
    stringOf(row.model) ??
    'Imported response';

  const provider =
    providerOf(source.provider) ??
    providerOf(row.provider) ??
    'CUSTOM';

  return {
    response: text,
    modelName,
    modelId: stringOf(source.model_id) ?? slug(modelName),
    provider,
  };
}

function stringOf(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function providerOf(value: unknown): AIProvider | undefined {
  if (typeof value !== 'string') return undefined;
  const upper = value.toUpperCase();
  if (upper === 'OPENAI') return 'OPENAI';
  if (upper === 'ANTHROPIC' || upper === 'CLAUDE') return 'ANTHROPIC';
  if (upper === 'GROQ' || upper === 'LLAMA') return 'GROQ';
  if (upper === 'GEMINI' || upper === 'GOOGLE') return 'GEMINI';
  return 'CUSTOM';
}