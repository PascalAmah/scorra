'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Cancel01Icon } from 'hugeicons-react';

import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  confirmBusy?: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  confirmBusy = false,
  error,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-5 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-105 overflow-hidden rounded-2xl bg-white shadow-2xl"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between px-6 pb-2 pt-6">
              <div>
                <p
                  className={`mb-2 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em] ${
                    destructive ? 'text-red-600' : 'text-ink-500'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full border ${
                      destructive ? 'border-red-500' : 'border-ink-500'
                    }`}
                  />
                  {destructive ? 'Danger zone' : 'Please confirm'}
                </p>
                <h2 className="text-[19px] font-semibold">{title}</h2>
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

            <div className="px-6 pb-6">
              <p className="text-[13px] leading-relaxed text-ink-500">{description}</p>

              {error && (
                <p className="mt-4 rounded-md border border-ink-200 bg-paper px-3 py-2.5 font-mono text-[11.5px] text-ink-600">
                  {error}
                </p>
              )}

              <div className="mt-5 flex justify-end gap-2.5 border-t border-ink-100 pt-4">
                <Button type="button" variant="ghost" onClick={onClose} disabled={confirmBusy}>
                  {cancelLabel}
                </Button>
                <Button
                  type="button"
                  onClick={onConfirm}
                  disabled={confirmBusy}
                  className={
                    destructive
                      ? 'border-red-900/40 bg-red-700 text-white hover:bg-red-800 hover:opacity-100'
                      : undefined
                  }
                >
                  {confirmBusy ? 'Working…' : confirmLabel}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}