'use client';

import { useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';

export interface DropdownItem {
  key: string;
  label: string;
  icon?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

const ITEM_HEIGHT = 36;
const GAP = 6;
const EDGE_PADDING = 8;

export function DropdownMenu({
  trigger,
  items,
  align = 'right',
  width = 176,
}: {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ x: number; y: number; upward: boolean } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  const openMenu = (e: ReactMouseEvent) => {
    e.stopPropagation();
    if (open) {
      setOpen(false);
      return;
    }
    const el = triggerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const menuHeight = items.length * ITEM_HEIGHT + 8;

    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    // If there isn't enough room below and more (or enough) room above, open upward.
    const upward = spaceBelow < menuHeight + GAP && spaceAbove > spaceBelow;

    let x = align === 'right' ? rect.right - width : rect.left;
    x = Math.max(EDGE_PADDING, Math.min(x, vw - width - EDGE_PADDING));
    const y = upward ? rect.top - menuHeight - GAP : rect.bottom + GAP;

    setCoords({ x, y, upward });
    setOpen(true);
  };

  const menu = open && coords ? (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      <motion.div
        role="menu"
        style={{
          position: 'fixed',
          top: coords.y,
          left: coords.x,
          width,
          transformOrigin: coords.upward ? 'bottom' : 'top',
        }}
        className="z-50 overflow-hidden rounded-lg border border-ink-200 bg-white py-1 shadow-xl"
        initial={{ opacity: 0, y: coords.upward ? -8 : 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: coords.upward ? -8 : 8, scale: 0.98 }}
        transition={{ duration: 0.12 }}
      >
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              item.onSelect();
            }}
            className={
              'flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-ink transition-colors ' +
              (item.destructive ? 'text-red-600 hover:bg-red-50 ' : 'hover:bg-paper ') +
              (item.disabled ? 'cursor-not-allowed opacity-40 hover:bg-transparent' : '')
            }
          >
            <span
              className={
                'shrink-0 ' + (item.destructive ? 'text-red-500' : 'text-ink-400')
              }
            >
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </motion.div>
    </>
  ) : null;

  return (
    <>
      <span
        ref={triggerRef}
        onClick={openMenu}
        className="relative inline-flex"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </span>
      {typeof document !== 'undefined'
        ? createPortal(<AnimatePresence>{menu}</AnimatePresence>, document.body)
        : null}
    </>
  );
}