
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getQuizSessionById } from '@/lib/storage';

interface RouteContext {
  params: {
    quizId: string;
  }
}

// GET /api/quizzes/:quizId/results - Get quiz results
export async function GET(request: NextRequest, { params }: RouteContext) {
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

    if (session.status !== 'completed') {
      return NextResponse.json({ success: false, error: `Quiz is not completed. Current status: ${session.status}` }, { status: 400 });
    }

    const totalQuestions = session.questions.length;
    const correctCount = session.answers.filter(a => a.isCorrect).length;
    const incorrectCount = session.answers.filter(a => !a.skipped && !a.isCorrect).length;
    const skippedCount = totalQuestions - (correctCount + incorrectCount);

    const totalTimeSeconds = session.endTime && session.startTime
      ? Math.round((session.endTime - session.startTime) / 1000)
      : 0;

    const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const responseData = {
        quizId: session.id,
        categoryName: session.categoryName,
        status: session.status,
        scorePercentage,
        totalQuestions,
        correctCount,
        incorrectCount,
        skippedCount,
        totalTimeSeconds,
        answers: session.answers,
        questions: session.questions.map(q => ({id: q.id, text: q.text, correctAnswerId: q.correctAnswerId})) // Return questions for review
    };

    return NextResponse.json({ success: true, data: responseData });

  } catch (error) {
    console.error(`Error in GET /api/quizzes/${params.quizId}/results:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
