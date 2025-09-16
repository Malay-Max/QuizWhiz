
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getQuizSessionById } from '@/lib/storage';

interface RouteContext {
  params: {
    quizId: string;
  }
}

// GET /api/quizzes/:quizId - Get current quiz status
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

    const currentQuestion = session.questions[session.currentQuestionIndex];
    
    const responseData = {
        quizId: session.id,
        status: session.status,
        categoryName: session.categoryName,
        totalQuestions: session.questions.length,
        currentQuestionIndex: session.currentQuestionIndex,
        currentQuestion: session.status === 'active' && currentQuestion ? {
            id: currentQuestion.id,
            text: currentQuestion.text,
            options: currentQuestion.options,
        } : null,
        isCompleted: session.status === 'completed',
    };

    return NextResponse.json({ success: true, data: responseData });

  } catch (error) {
    console.error(`Error in GET /api/quizzes/${params.quizId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
