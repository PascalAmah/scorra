'use client';

import { useState, useRef, useCallback } from 'react';
import { Cancel01Icon, Copy01Icon, Tick01Icon } from 'hugeicons-react';
import type { Invitation } from '@scorra/types';

import { Button } from '@/components/ui/button';
import { useInviteMember, useInvitations, useOrganizations } from '@/hooks/use-organization';
import { formatRelativeTime } from '@/lib/utils';

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
}

export function InviteModal({ open, onClose }: InviteModalProps) {
  const [emails, setEmails] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [role, setRole] = useState('EVALUATOR');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sentLinks, setSentLinks] = useState<Array<{ email: string; link: string; copied: boolean }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: orgsData } = useOrganizations();
  const org = (orgsData ?? [])[0] ?? null;

  const { data: invitationsData } = useInvitations(org?.id ?? '');
  const invitations: Invitation[] = invitationsData ?? [];

  const inviteMutation = useInviteMember(org?.id ?? '');

  const pending = invitations.filter((inv) => !inv.acceptedAt);

  const addEmail = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address');
      return;
    }
    if (emails.includes(trimmed)) {
      setError('Email already added');
      return;
    }
    setEmails((prev) => [...prev, trimmed]);
    setInputValue('');
    setError('');
  }, [inputValue, emails]);

  const removeEmail = (email: string) => {
    setEmails((prev) => prev.filter((e) => e !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEmail();
    }
    if (e.key === 'Backspace' && !inputValue && emails.length > 0) {
      removeEmail(emails[emails.length - 1]);
    }
  };

  const handleSend = async () => {
    if (emails.length === 0 || !org) return;
    setSending(true);
    setError('');

    try {
      const results: Array<{ email: string; link: string; copied: boolean }> = [];
      let failed = 0;
      for (const email of emails) {
        try {
          const invitation = await inviteMutation.mutateAsync({ email, role });
          const link = `${window.location.origin}/accept-invitation?token=${invitation.token}`;
          results.push({ email, link, copied: false });
        } catch (err) {
          failed++;
          console.error(`Failed to invite ${email}:`, err);
        }
      }

      if (results.length > 0) {
        setEmails([]);
        setSentLinks(results);
      } else {
        setError(`${failed} invitation${failed > 1 ? 's' : ''} failed to send`);
      }
    } catch (err) {
      console.error('Unexpected error in handleSend:', err);
      setError('An unexpected error occurred');
    } finally {
      setSending(false);
    }
  };

  const copyLink = (index: number, link: string) => {
    navigator.clipboard.writeText(link);
    setSentLinks((prev) =>
      prev.map((item, i) => (i === index ? { ...item, copied: true } : item)),
    );
    setTimeout(() => {
      setSentLinks((prev) =>
        prev.map((item, i) => (i === index ? { ...item, copied: false } : item)),
      );
    }, 2000);
  };

  if (!open) return null;

  const showSuccess = sentLinks.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-[480px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-[22px] top-5 flex h-7 w-7 items-center justify-center rounded-[7px] text-ink-400 hover:bg-ink-100 hover:text-ink"
        >
          <Cancel01Icon size={14} />
        </button>

        {/* Header */}
        <div className="px-[26px] pt-6">
          <span className="mb-2.5 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full border-1.5 border-ink-500" />
            {org?.name ?? 'Organization'}
          </span>
          <h2 className="font-display text-[19px] font-semibold tracking-[-0.01em]">
            {showSuccess ? 'Invitation created' : 'Invite evaluators'}
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
            {showSuccess
              ? 'Share these links with your team. Each link is unique and expires in 7 days.'
              : "They'll get an email with a link to set up their account and join your org."}
          </p>
        </div>

        {/* Body */}
        <div className="px-[26px] pb-0 pt-5">
          {showSuccess ? (
            /* Success: show invite links */
            <div className="space-y-3">
              {sentLinks.map((item, i) => (
                <div
                  key={item.email}
                  className="rounded-lg border border-ink-200 bg-ink-50 p-3"
                >
                  <p className="mb-1.5 text-[12.5px] font-semibold text-ink">{item.email}</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={item.link}
                      className="flex-1 rounded border border-ink-200 bg-white px-2.5 py-1.5 font-mono text-[11px] text-ink-500 outline-none"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyLink(i, item.link)}
                      className="shrink-0"
                    >
                      {item.copied ? (
                        <>
                          <Tick01Icon size={13} />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy01Icon size={13} />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Form */
            <>
              {/* Email chips input */}
              <div className="mb-4">
                <label className="mb-1.5 block text-[12px] font-semibold text-ink-800">
                  Email addresses
                </label>
                <div
                  className="flex min-h-[44px] flex-wrap items-center gap-1.5 rounded border border-ink-300 px-2.5 py-1.5 transition-colors focus-within:ring-2 focus-within:ring-ink"
                  onClick={() => inputRef.current?.focus()}
                >
                  {emails.map((email) => (
                    <span
                      key={email}
                      className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-ink-100 py-1 pl-3 pr-1.5 text-[12.5px]"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeEmail(email);
                        }}
                        className="flex h-4 w-4 items-center justify-center rounded-full bg-ink-200 text-[10px] text-ink-500 hover:bg-ink-300"
                      >
                        <Cancel01Icon size={8} />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      setError('');
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={emails.length === 0 ? 'Add email, press Enter…' : 'Add another…'}
                    className="min-w-[140px] flex-1 border-none bg-transparent py-1.5 text-[13.5px] outline-none placeholder:text-ink-400"
                  />
                </div>
              </div>

              {/* Role selection */}
              <div className="mb-4">
                <label className="mb-1.5 block text-[12px] font-semibold text-ink-800">Role</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    {
                      value: 'EVALUATOR',
                      label: 'Evaluator',
                      desc: 'Can score, compare, and rank assigned tasks.',
                    },
                    {
                      value: 'ORG_ADMIN',
                      label: 'Org Admin',
                      desc: 'Full access — datasets, tasks, billing, members.',
                    },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRole(opt.value)}
                      className={`rounded-lg border-1.5 p-3 text-left transition-colors ${
                        role === opt.value
                          ? 'border-ink bg-ink-100'
                          : 'border-ink-200 hover:border-ink-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-[13px] font-semibold">
                        <span
                          className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-1.5 ${
                            role === opt.value ? 'border-ink' : 'border-ink-400'
                          }`}
                        >
                          {role === opt.value && (
                            <span className="h-2 w-2 rounded-full bg-ink" />
                          )}
                        </span>
                        {opt.label}
                      </div>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-500">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Pending invitations */}
          {!showSuccess && pending.length > 0 && (
            <div className="border-t border-ink-200 pt-4">
              <p className="mb-2.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-ink-500">
                Pending invitations ({pending.length})
              </p>
              {pending.slice(0, 5).map((inv) => (
                <div key={inv.id} className="flex items-center gap-2.5 py-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink-200 bg-ink-100 font-display text-[11px] font-semibold text-ink-500">
                    {inv.email
                      .split('@')[0]
                      .split(/[.\-_]/)
                      .map((p) => p[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium">{inv.email}</p>
                    <p className="font-mono text-[10.5px] text-ink-400">
                      Invited by admin · Sent {formatRelativeTime(inv.createdAt)}
                    </p>
                  </div>
                  <span className="ml-auto shrink-0 rounded-full border border-ink-300 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.05em] text-ink-500">
                    {inv.role === 'ORG_ADMIN' ? 'To: Admin' : 'To: Evaluator'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {error && <p className="mt-3 text-[12.5px] text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5 border-t border-ink-200 bg-ink-100 px-[26px] py-[18px]">
          {showSuccess ? (
            <Button onClick={onClose}>Done</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={emails.length === 0 || sending}>
                {sending
                  ? 'Sending…'
                  : `Send ${emails.length} invite${emails.length !== 1 ? 's' : ''}`}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
