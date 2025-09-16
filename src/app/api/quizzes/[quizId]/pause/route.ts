
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getQuizSessionById } from '@/lib/storage';
import { db } from '@/lib/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';

interface RouteContext {
  params: {
    quizId: string;
  }
}

// POST /api/quizzes/:quizId/pause - Pause a quiz
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { quizId } = params;
    const session = await getQuizSessionById(quizId);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Quiz session not found.' }, { status: 404 });
    }

    if (session.status !== 'active') {
      return NextResponse.json({ success: false, error: `Cannot pause a quiz that is not active. Current status: ${session.status}` }, { status: 400 });
    }

    const sessionRef = doc(db, 'quizSessions', quizId);
    await updateDoc(sessionRef, {
      status: 'paused',
      pauseTime: Timestamp.now(),
    });

    return NextResponse.json({ success: true, data: { message: 'Quiz paused successfully.' } });

  } catch (error) {
    console.error(`Error in POST /api/quizzes/${params.quizId}/pause:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
