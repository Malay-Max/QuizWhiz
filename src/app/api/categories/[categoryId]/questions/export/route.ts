
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { 
  getQuestionsByCategoryIdAndDescendants,
  getAllCategories,
  getCategoryById,
} from '@/lib/storage';

interface RouteContext {
  params: {
    categoryId: string;
  }
}

// GET /api/categories/:categoryId/questions/export - Export questions to batch format
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
      return NextResponse.json({ success: true, data: { formattedText: "" }, message: "No questions found to export." });
    }

    const formattedQuestions = questionsToExport.map(q => {
      const optionTexts = q.options.map(opt => opt.text.replace(/[\n\r]/g, ' ')).join(' - '); // Sanitize newlines in options
      const correctAnswerOption = q.options.find(opt => opt.id === q.correctAnswerId);
      const correctAnswerText = correctAnswerOption ? correctAnswerOption.text.replace(/[\n\r]/g, ' ') : "CORRECT_ANSWER_NOT_FOUND";
      const questionText = q.text.replace(/[\n\r]/g, ' '); // Sanitize newlines in question
      return `;;${questionText};; {${optionTexts}} [${correctAnswerText}]`;
    }).join('\n');
    
    return NextResponse.json({ success: true, data: { formattedText: formattedQuestions } });

  } catch (error) {
    console.error(`Error in GET /api/categories/${params.categoryId}/questions/export:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
