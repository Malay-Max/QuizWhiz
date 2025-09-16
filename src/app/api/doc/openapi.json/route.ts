
import { NextResponse } from 'next/server';
import { getApiDocs } from '@/lib/openapi';

export async function GET() {
    const spec = getApiDocs();
    if (!spec) {
        return new Response('Could not generate API documentation.', { status: 500 });
    }
    return NextResponse.json(spec);
}
