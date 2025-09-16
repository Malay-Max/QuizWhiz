
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateDistractors } from '@/ai/flows/generate-distractors';
import { GenerateDistractorsInputSchema } from '@/types';

// POST /api/ai/suggest-distractors
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = GenerateDistractorsInputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const result = await generateDistractors(validation.data);
    
    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    console.error(`Error in POST /api/ai/suggest-distractors:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
