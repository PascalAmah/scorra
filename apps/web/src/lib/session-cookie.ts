export const SESSION_COOKIE_NAME = 'scorra_session';

export const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

async function sessionMarkerFetch(method: 'POST' | 'DELETE'): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/session', { method, cache: 'no-store' });
  } catch {}
}

export async function establishSessionMarker(): Promise<void> {
  await sessionMarkerFetch('POST');
}

export async function clearSessionMarker(): Promise<void> {
  await sessionMarkerFetch('DELETE');
}
