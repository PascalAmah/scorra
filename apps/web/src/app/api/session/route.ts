import { NextResponse } from 'next/server';

import { SESSION_COOKIE_MAX_AGE_SECONDS, SESSION_COOKIE_NAME } from '@/lib/session-cookie';

function cookieResponse(maxAgeSeconds: number) {
  const res = new NextResponse(null, { status: 204 });
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '1',
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: maxAgeSeconds,
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}

export async function POST() {
  return cookieResponse(SESSION_COOKIE_MAX_AGE_SECONDS);
}

export async function DELETE() {
  return cookieResponse(0);
}
