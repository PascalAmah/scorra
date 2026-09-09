import * as React from 'react';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function FormField({ label, htmlFor, hint, error, action, children }: FormFieldProps) {
  return (
    <div className="mb-4.5">
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <label htmlFor={htmlFor} className="text-[12.5px] font-semibold text-ink-600">
          {label}
        </label>
        {action}
      </div>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1.5 text-[11.5px] text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 font-mono text-[11px] tracking-[0.04em] text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}
