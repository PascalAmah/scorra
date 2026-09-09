'use client';

import * as React from 'react';
import { Search01Icon } from 'hugeicons-react';

import { cn } from '@/lib/utils';

interface SearchFilterBarProps<T extends string> {
  placeholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  /** Fired on Enter / form submit. Optional — omit when search applies live. */
  onSearchSubmit?: () => void;
  /** Filter chips. Omit entirely for search-only toolbars. */
  filters?: readonly T[];
  activeFilter?: T;
  onFilterChange?: (filter: T) => void;
  /** Custom chip label. Defaults to title-casing the raw value. */
  chipLabel?: (filter: T) => string;
  /** Trailing element on the right (e.g. row/result counts). */
  rightSlot?: React.ReactNode;
  className?: string;
}

/**
 * Reusable search + filter-chip toolbar for list pages.

 * Mobile: stacked — search takes its own full-width row, chips/count wrap below. *
 * Desktop (`md+`): side-by-side — search (cap ~340px) left, chips/count right. */
export function SearchFilterBar<T extends string>({
  placeholder,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  filters,
  activeFilter,
  onFilterChange,
  chipLabel,
  rightSlot,
  className,
}: SearchFilterBarProps<T>) {
  const filtersList = filters ?? [];
  const hasFilters = filtersList.length > 0 && activeFilter != null && onFilterChange != null;
  const defaultLabel = (f: T) => f.charAt(0) + f.slice(1).toLowerCase();

  return (
    <div
      className={cn(
        'mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4',
        className,
      )}
    >
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          onSearchSubmit?.();
        }}
        className="relative w-full md:max-w-85 md:flex-1"
      >
        <Search01Icon
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
        />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-sm border border-ink-300 bg-white py-3 pl-9 pr-3 text-[13.5px] outline-none transition-colors focus:border-ink md:py-2.5"
        />
      </form>
      {hasFilters || rightSlot ? (
        <div className="flex flex-wrap items-center gap-2">
          {hasFilters &&
            filtersList.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => onFilterChange(f)}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 font-mono text-[11.5px] transition-colors',
                  activeFilter === f
                    ? 'border-ink bg-ink text-white'
                    : 'border-ink-300 text-ink-500 hover:border-ink-600',
                )}
              >
                {(chipLabel ?? defaultLabel)(f)}
              </button>
            ))}
          {rightSlot != null && <span className="ml-auto shrink-0">{rightSlot}</span>}
        </div>
      ) : null}
    </div>
  );
}
