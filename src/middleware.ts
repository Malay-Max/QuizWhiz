
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// Make sure to set the GOOGLE_APPLICATION_CREDENTIALS environment variable
// with the path to your service account key file.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

export async function middleware(request: NextRequest) {
  // We only want to protect routes under /api/
  if (!request.nextUrl.pathname.startsWith('/api/')) {
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

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Attach user info to the request headers to be used in API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('X-User-ID', decodedToken.uid);
    requestHeaders.set('X-User-Email', decodedToken.email || '');

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Invalid token.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: '/api/:path*',
};
