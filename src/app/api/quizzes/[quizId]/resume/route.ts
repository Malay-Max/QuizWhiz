
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

// POST /api/quizzes/:quizId/resume - Resume a quiz
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { quizId } = params;
    const session = await getQuizSessionById(quizId);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Quiz session not found.' }, { status: 404 });
    }

    const userId = request.headers.get('X-User-ID');
    if (session.userId && session.userId !== userId) {
        return NextResponse.json({ success: false, error: 'Forbidden: You do not have access to this quiz session.' }, { status: 403 });
    }
    
    if (session.status !== 'paused') {
      return NextResponse.json({ success: false, error: `Cannot resume a quiz that is not paused. Current status: ${session.status}` }, { status: 400 });
    }

    const now = new Date().getTime();
    const pausedAt = session.pauseTime;
    const additionalPausedTime = pausedAt ? now - pausedAt : 0;
    const newTotalPausedTime = (session.totalPausedTime || 0) + additionalPausedTime;
    
    const sessionRef = doc(db, 'quizSessions', quizId);
    await updateDoc(sessionRef, {
      status: 'active',
      pauseTime: null, // Clear pause time
      totalPausedTime: newTotalPausedTime,
    });

    return NextResponse.json({ success: true, data: { message: 'Quiz resumed successfully.' } });

  } catch (error) {
    console.error(`Error in POST /api/quizzes/${params.quizId}/resume:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
