'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/landing/logo';
import { PasswordInput } from '@/components/auth/password-input';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { useInvitation, useOrganizations } from '@/hooks/use-organization';
import { api } from '@/lib/api';

const ROLE_LABELS: Record<string, string> = {
  EVALUATOR: 'Evaluator',
  ORG_ADMIN: 'Org Admin',
  VIEWER: 'Viewer',
};

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-ink-100 p-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">Loading…</p>
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const { accessToken, setSession, user } = useAuthStore();
  const isAuthenticated = Boolean(accessToken);

  const { data: orgs } = useOrganizations();

  const { data: invitation, isPending: loading, error: queryError } = useInvitation(token);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const daysRemaining = useMemo(() => {
    if (!invitation) return 0;
    const expiresDate = new Date(invitation.expiresAt);
    return Math.max(0, Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  }, [invitation]);

  const tokenMissing = !token;
  const fetchError =
    queryError instanceof Error
      ? queryError.message
      : queryError
        ? 'Failed to load invitation'
        : '';
  const displayError = tokenMissing ? 'Missing invitation token.' : fetchError;

  const alreadyMember = invitation && (orgs ?? []).some((o) => o.id === invitation.organizationId);

  const handleAccept = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!token || !invitation) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      if (!isAuthenticated) {
        const name =
          [firstName, lastName].filter(Boolean).join(' ') || invitation.email.split('@')[0];
        if (!password || password.length < 8) {
          setSubmitError('Password must be at least 8 characters');
          setSubmitting(false);
          return;
        }

        const authResponse = await api.register({
          email: invitation.email,
          password,
          name,
        });

        setSession(authResponse);
      }

      await api.acceptInvitation(token);

      // Refresh tokens to get the org-specific role
      const session = await api.switchOrg(invitation.organizationId);
      setSession(session);

      router.push('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exist')) {
        setSubmitError(
          'An account with this email already exists. Please sign in first, then return to this link.',
        );
      } else {
        setSubmitError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-100 p-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">Loading…</p>
      </div>
    );
  }

  if (displayError || !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-100 p-10">
        <div className="w-full max-w-[440px] rounded-2xl border border-ink-200 bg-white p-11 text-center">
          <Logo size="sm" href="/" className="mb-9 justify-center" />
          <h1 className="font-display text-xl font-semibold tracking-[-0.01em]">
            {displayError || 'Invitation not found'}
          </h1>
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-500">
            This link may have expired or already been used.
          </p>
          <Button asChild className="mt-6">
            <Link href="/">Return to homepage</Link>
          </Button>
        </div>
      </div>
    );
  }

  const loginReturnUrl = `/accept-invitation?token=${encodeURIComponent(token!)}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-100 p-10">
      <div className="w-full max-w-[440px] rounded-2xl border border-ink-200 bg-white p-11">
        <Logo size="sm" href="/" className="mb-9 justify-center" />

        <div className="mb-7 flex items-center gap-3 rounded-lg border border-ink-200 bg-ink-100 p-4">
          <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[9px] bg-ink font-display text-sm font-semibold text-white">
            {invitation.organizationName
              .split(/\s+/)
              .map((p) => p[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </span>
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold">{invitation.organizationName}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-500">
              Invited by <b className="text-ink">{invitation.invitedByName}</b>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-300 px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.05em]">
                {ROLE_LABELS[invitation.role] ?? invitation.role}
              </span>
            </p>
          </div>
        </div>

        <span className="mb-3.5 flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-500">
          <span className="inline-block h-1.5 w-1.5 rounded-full border-1.5 border-ink-500" />
          You&apos;ve been invited
        </span>
        <h1 className="text-center font-display text-2xl font-semibold tracking-[-0.01em]">
          Join {invitation.organizationName} on Scorra
        </h1>

        {isAuthenticated ? (
          <>
            {alreadyMember ? (
              <>
                <p className="mb-7 mt-2 text-center text-[13.5px] leading-relaxed text-ink-500">
                  You&apos;re already a member of{' '}
                  <b className="text-ink">{invitation.organizationName}</b>.
                </p>
                <Button asChild className="w-full">
                  <Link href="/dashboard">Go to dashboard</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="mb-7 mt-2 text-center text-[13.5px] leading-relaxed text-ink-500">
                  You&apos;re signed in as{' '}
                  <b className="text-ink">{user?.name ?? invitation.email}</b>. Accept the
                  invitation to join this organization.
                </p>

                <form onSubmit={handleAccept}>
                  {submitError && <p className="mb-4 text-[12.5px] text-red-500">{submitError}</p>}
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Joining…' : 'Accept invite & join'}
                  </Button>
                </form>
              </>
            )}

            <p className="mt-5.5 text-center text-[12.5px] text-ink-500">
              Not you?{' '}
              <Link href="/" className="font-semibold text-ink hover:underline">
                Return to homepage
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className="mb-7 mt-2 text-center text-[13.5px] leading-relaxed text-ink-500">
              Set your name and password to finish creating your account. Your email is confirmed by
              this invite link.
            </p>

            <div className="mb-6 rounded-lg border border-ink-300 bg-ink-50 p-4">
              <p className="text-[13px] font-semibold text-ink">Already have a Scorra account?</p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-500">
                Sign in first, then return to this link to accept the invitation.
              </p>
              <Button variant="ghost" size="sm" asChild className="mt-2.5">
                <Link href={`/login?returnUrl=${encodeURIComponent(loginReturnUrl)}`}>Sign in</Link>
              </Button>
            </div>

            <form onSubmit={handleAccept}>
              <div className="mb-4">
                <label className="mb-1.5 block text-[12.5px] font-semibold text-ink-800">
                  Email
                </label>
                <input
                  type="email"
                  value={invitation.email}
                  disabled
                  className="w-full rounded border border-ink-200 bg-ink-100 px-3.5 py-3 text-[14px] text-ink-500"
                />
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[12.5px] font-semibold text-ink-800">
                    First name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jordan"
                    autoComplete="given-name"
                    className="w-full rounded border border-ink-300 px-3.5 py-3 text-[14px] outline-none transition-colors focus:ring-2 focus:ring-ink"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12.5px] font-semibold text-ink-800">
                    Last name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Reyes"
                    autoComplete="family-name"
                    className="w-full rounded border border-ink-300 px-3.5 py-3 text-[14px] outline-none transition-colors focus:ring-2 focus:ring-ink"
                  />
                </div>
              </div>

              <div className="mb-5">
                <label className="mb-1.5 block text-[12.5px] font-semibold text-ink-800">
                  Create password
                </label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <p className="mt-1.5 font-mono text-[11.5px] text-ink-400">
                  MIN 8 CHARACTERS · 1 NUMBER · 1 SYMBOL
                </p>
              </div>

              {submitError && <p className="mb-4 text-[12.5px] text-red-500">{submitError}</p>}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Joining…' : 'Accept invite & join'}
              </Button>
            </form>

            <p className="mt-5.5 text-center text-[12.5px] text-ink-500">
              Already have an account?{' '}
              <Link
                href={`/login?returnUrl=${encodeURIComponent(loginReturnUrl)}`}
                className="font-semibold text-ink hover:underline"
              >
                Sign in
              </Link>
            </p>
          </>
        )}

        <p className="mt-6 text-center font-mono text-[11.5px] text-ink-400">
          THIS INVITE LINK EXPIRES IN {daysRemaining} DAY{daysRemaining !== 1 ? 'S' : ''}
        </p>
      </div>
    </div>
  );
}
