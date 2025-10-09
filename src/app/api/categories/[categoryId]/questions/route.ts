
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { 
  addQuestion,
  getQuestionsByCategoryIdAndDescendants,
  getAllCategories,
} from '@/lib/storage';
import { CreateQuestionInputSchema } from '@/types';

interface RouteContext {
  params: {
    categoryId: string;
  }
}

// GET /api/categories/:categoryId/questions - Get questions for a category
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { categoryId } = params;
    const { searchParams } = new URL(request.url);
    const includeSubcategories = searchParams.get('includeSubcategories') === 'true';

    const allCategories = await getAllCategories();

    if (!includeSubcategories) {
        // This is not the most efficient way as it gets all questions from descendants,
        // but our storage functions are structured this way. We can refine later if needed.
        const questions = await getQuestionsByCategoryIdAndDescendants(categoryId, allCategories);
        const directQuestions = questions.filter(q => q.categoryId === categoryId);
        return NextResponse.json({ success: true, data: directQuestions });
    }

    const questions = await getQuestionsByCategoryIdAndDescendants(categoryId, allCategories);

    return NextResponse.json({ success: true, data: questions });

  } catch (error) {
    console.error(`Error in GET /api/categories/${params.categoryId}/questions:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}


// POST /api/categories/:categoryId/questions - Add a new question to a category
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { categoryId } = params;
    const body = await request.json();
    const validation = CreateQuestionInputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { text, options, correctAnswerText, explanation, source } = validation.data;
    
    const answerOptions = options.map(opt => ({ id: crypto.randomUUID(), text: opt }));
    
    const correctOption = answerOptions.find(opt => opt.text === correctAnswerText);
    if (!correctOption) {
        return NextResponse.json({ success: false, error: "The provided correctAnswerText does not match any of the options." }, { status: 400 });
    }

    const newQuestionData = {
        text,
        options: answerOptions,
        correctAnswerId: correctOption.id,
        categoryId: categoryId,
        explanation: explanation,
        source: source,
    };

    const result = await addQuestion(newQuestionData);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Failed to create question.' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data: { id: result.id } }, { status: 201 });

  } catch (error) {
    console.error(`Error in POST /api/categories/${params.categoryId}/questions:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
