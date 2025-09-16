
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as admin from 'firebase-admin';

// This line forces the middleware to run on the Node.js runtime.
export const runtime = 'nodejs';

export async function middleware(request: NextRequest) {
  // Initialize Firebase Admin SDK only once when the middleware is first run.
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    } catch (error) {
      console.error('Firebase admin initialization error', error);
      // If initialization fails, block API access.
      return new Response(JSON.stringify({ success: false, error: 'Internal Server Error: Could not initialize admin services.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

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

  try {
    // Verify the token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Add user info to the request headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('X-User-ID', decodedToken.uid);
    requestHeaders.set('X-User-Email', decodedToken.email || '');

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

  } catch (error) {
    console.error('Error verifying auth token:', error);
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
