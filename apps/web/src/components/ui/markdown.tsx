'use client';

import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { cn } from '@/lib/utils';

const components: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  h1: ({ children }) => (
    <h1 className="mb-2 mt-3 font-display text-[16px] font-semibold tracking-[-0.01em] text-ink first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-3 font-display text-[15px] font-semibold tracking-[-0.01em] text-ink first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1.5 mt-3 font-display text-[13.5px] font-semibold text-ink first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-1.5 mt-3 font-display text-[13px] font-semibold text-ink first:mt-0">
      {children}
    </h4>
  ),
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  del: ({ children }) => <del className="text-ink-400">{children}</del>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="underline underline-offset-2 hover:text-ink"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-[1.55]">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-ink-200 pl-3 text-ink italic last:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-t border-ink-200" />,
  code: ({ children }) => (
    <code className="rounded bg-ink-100 px-1 py-0.5 font-mono text-[11.5px] text-ink">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded-lg bg-ink-100/60 p-3 font-mono text-[11.5px] leading-[1.6] text-ink last:mb-0">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-left">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-ink-100/70">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => (
    <th className="border border-ink-200 px-2.5 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.04em] text-ink-500">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-ink-200 px-2.5 py-1.5 align-top text-ink-500">{children}</td>
  ),
  input: (props) => <input {...props} className="mr-1.5 accent-ink" />,
};

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn('text-[13px] leading-[1.6] text-ink-500', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
