
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { 
  getQuestionsByCategoryIdAndDescendants,
  getAllCategories,
} from '@/lib/storage';

interface RouteContext {
  params: {
    categoryId: string;
  }
}

// GET /api/categories/:categoryId/questions/export - Export questions to batch JSON format
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { categoryId } = params;

    const allCategories = await getAllCategories();
    const categoryExists = allCategories.find(c => c.id === categoryId);
    if (!categoryExists) {
      return NextResponse.json({ success: false, error: 'Category not found.' }, { status: 404 });
    }

    const questionsToExport = await getQuestionsByCategoryIdAndDescendants(categoryId, allCategories);
  
    if (questionsToExport.length === 0) {
      return NextResponse.json({ success: true, data: [], message: "No questions found to export." });
    }

    const formattedQuestions = questionsToExport.map(q => {
      const optionsObject: { [key: string]: string } = {};
      const correctAnswerOption = q.options.find(opt => opt.id === q.correctAnswerId);
      let correctKey = '';

      q.options.forEach((opt, index) => {
        const key = String.fromCharCode(65 + index); // A, B, C, D...
        optionsObject[key] = opt.text;
        if (opt.id === q.correctAnswerId) {
          correctKey = key;
        }
      });
      
      return {
        question: q.text,
        options: optionsObject,
        correctAnswer: correctKey || '?',
      };
    });
    
    return NextResponse.json({ success: true, data: formattedQuestions });

  } catch (error) {
    console.error(`Error in GET /api/categories/${params.categoryId}/questions/export:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
