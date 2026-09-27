import { NextResponse, type NextRequest } from 'next/server';

import { SESSION_COOKIE_NAME } from './lib/session-cookie';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/analytics/:path*',
    '/datasets/:path*',
    '/tasks/:path*',
    '/settings/:path*',
    '/exports/:path*',
    '/members/:path*',
    '/compare/:path*',
    '/evaluate/:path*',
    '/rank/:path*',
  ],
};

export function middleware(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE_NAME);

  if (session) {
    return NextResponse.next();
  }

  const login = new URL('/login', request.url);
  const { pathname, search } = request.nextUrl;
  const target = search ? `${pathname}${search}` : pathname;
  login.searchParams.set('next', target);

  return NextResponse.redirect(login, { status: 302 });
}
