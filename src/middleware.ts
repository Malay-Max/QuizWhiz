
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // We only want to protect routes under /api/
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // The 'openapi.json' and '/api/doc' page are public.
  if (request.nextUrl.pathname.startsWith('/api/doc')) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized: No token provided.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const idToken = authHeader.split('Bearer ')[1];
  if (!idToken) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Malformed token.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Pass the token in the headers. Verification will happen in the API route.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('X-Firebase-ID-Token', idToken);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: '/api/:path*',
};
