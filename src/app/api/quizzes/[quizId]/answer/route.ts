
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getQuizSessionById } from '@/lib/storage';
import { db } from '@/lib/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { AnswerQuestionInputSchema, type QuizAnswer } from '@/types';

interface RouteContext {
  params: {
    quizId: string;
  }
}

// POST /api/quizzes/:quizId/answer - Submit an answer
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { quizId } = params;
    const body = await request.json();
    const validation = AnswerQuestionInputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { questionId, selectedAnswerId } = validation.data;
    const session = await getQuizSessionById(quizId);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Quiz session not found.' }, { status: 404 });
    }
    
    const userId = request.headers.get('X-User-ID');
    if (session.userId && session.userId !== userId) {
        return NextResponse.json({ success: false, error: 'Forbidden: You do not have access to this quiz session.' }, { status: 403 });
    }

    if (session.status !== 'active') {
        return NextResponse.json({ success: false, error: `Quiz is not active. Current status: ${session.status}` }, { status: 400 });
    }
    
    const currentQuestion = session.questions[session.currentQuestionIndex];
    if (currentQuestion.id !== questionId) {
        return NextResponse.json({ success: false, error: 'The submitted answer is for the wrong question.' }, { status: 400 });
    }

    if (session.answers.find(a => a.questionId === questionId)) {
        return NextResponse.json({ success: false, error: 'This question has already been answered.' }, { status: 400 });
    }
    
    const isCorrect = currentQuestion.correctAnswerId === selectedAnswerId;
    const answerTime = new Date().getTime();
    
    let timeSinceLastAction = 0;
    if(session.status === 'active' && !session.pauseTime) {
       timeSinceLastAction = (answerTime - session.startTime) - session.totalPausedTime - session.answers.reduce((acc, ans) => acc + ans.timeTaken, 0);
    }

    const newAnswer: QuizAnswer = {
      questionId,
      selectedAnswerId,
      isCorrect,
      timeTaken: timeSinceLastAction,
      skipped: false,
    };
    
    const updatedAnswers = [...session.answers, newAnswer];
    const nextIndex = session.currentQuestionIndex + 1;
    const isQuizComplete = nextIndex >= session.questions.length;
    
    const sessionRef = doc(db, 'quizSessions', quizId);
    if (isQuizComplete) {
      await updateDoc(sessionRef, {
        answers: updatedAnswers,
        currentQuestionIndex: nextIndex,
        status: 'completed',
        endTime: Timestamp.now(),
      });
    } else {
      await updateDoc(sessionRef, {
        answers: updatedAnswers,
        currentQuestionIndex: nextIndex,
      });
    }

    const nextQuestion = !isQuizComplete ? session.questions[nextIndex] : null;

    return NextResponse.json({
      success: true,
      data: {
        isCorrect,
        correctAnswerId: currentQuestion.correctAnswerId,
        isComplete: isQuizComplete,
        nextQuestion: isQuizComplete ? null : {
            id: nextQuestion!.id,
            text: nextQuestion!.text,
            options: nextQuestion!.options,
        },
      }
    });

  } catch (error) {
    console.error(`Error in POST /api/quizzes/${params.quizId}/answer:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
