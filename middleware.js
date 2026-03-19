import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Public routes
  const publicRoutes = ['/login', '/register'];
  if (publicRoutes.includes(pathname)) return NextResponse.next();

  // For protected routes, we rely on client-side auth guard in layout
  // Middleware here handles base redirect for root
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|firebase-messaging-sw.js).*)'],
};
