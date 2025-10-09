
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  getQuestionById,
  updateQuestion,
  deleteQuestionById,
} from '@/lib/storage';
import type { Question } from '@/types';
import { UpdateQuestionInputSchema } from '@/types';

interface RouteContext {
  params: {
    questionId: string;
  }
}

// GET /api/questions/:questionId - Get a single question
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { questionId } = params;
    const question = await getQuestionById(questionId);

    if (!question) {
      return NextResponse.json({ success: false, error: 'Question not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: question });
  } catch (error) {
    console.error(`Error in GET /api/questions/${params.questionId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// PUT /api/questions/:questionId - Update a question
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { questionId } = params;
    const existingQuestion = await getQuestionById(questionId);
    if (!existingQuestion) {
        return NextResponse.json({ success: false, error: 'Question not found.' }, { status: 404 });
    }

    const body = await request.json();
    const validation = UpdateQuestionInputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { text, options, correctAnswerId, categoryId, explanation, source } = validation.data;

    // Construct the updated question object, only including fields that were provided
    const updatedQuestionData: Question = {
        ...existingQuestion,
        ...(text && { text }),
        ...(options && { options }),
        ...(correctAnswerId && { correctAnswerId }),
        ...(categoryId && { categoryId }),
    };

    if (explanation !== undefined) {
        updatedQuestionData.explanation = explanation;
    }
    if (source !== undefined) {
        updatedQuestionData.source = source;
    }


    // If options are being updated, we must ensure the correct answer ID is still valid.
    if (options && correctAnswerId) {
        if (!options.some(opt => opt.id === correctAnswerId)) {
            return NextResponse.json({ success: false, error: 'The provided correctAnswerId is not present in the updated options array.'}, { status: 400 });
        }
    } else if (options && !correctAnswerId) { // Options updated but no new correct ID provided
         if (!options.some(opt => opt.id === existingQuestion.correctAnswerId)) {
            return NextResponse.json({ success: false, error: 'The existing correctAnswerId is not present in the new options array. You must provide a new correctAnswerId.'}, { status: 400 });
        }
    }

    const result = await updateQuestion(updatedQuestionData);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Failed to update question.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { id: questionId } });

  } catch (error) {
    console.error(`Error in PUT /api/questions/${params.questionId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// DELETE /api/questions/:questionId - Delete a question
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { questionId } = params;
    const result = await deleteQuestionById(questionId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Failed to delete question.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { message: `Question ${questionId} deleted successfully.` } });
  
  } catch (error) {
    console.error(`Error in DELETE /api/questions/${params.questionId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
