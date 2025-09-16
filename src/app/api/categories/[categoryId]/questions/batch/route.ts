
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { addQuestion, getCategoryById } from '@/lib/storage';
import type { Question, AnswerOption } from '@/types';
import { z } from 'zod';

interface RouteContext {
  params: {
    categoryId: string;
  }
}

const batchAddSchema = z.object({
  text: z.string().min(1, 'Batch text input cannot be empty.'),
});

// POST /api/categories/:categoryId/questions/batch - Batch add questions from text
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { categoryId } = params;

    const categoryExists = await getCategoryById(categoryId);
    if (!categoryExists) {
      return NextResponse.json({ success: false, error: 'Category not found.' }, { status: 404 });
    }
    
    const requestBody = await request.json();
    const validation = batchAddSchema.safeParse(requestBody);

    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const { text: batchInput } = validation.data;
    const lines = batchInput.split('\n').filter(line => line.trim() !== '');
    
    let questionsAddedCount = 0;
    let questionsFailedCount = 0;
    const errors: string[] = [];

    for (const line of lines) {
      try {
        const questionMatch = line.match(/;;(.*?);;/);
        const optionsMatch = line.match(/\{(.*?)\}/);
        const correctMatch = line.match(/\[(.*?)\]/);

        if (!questionMatch || !optionsMatch || !correctMatch) {
          questionsFailedCount++;
          errors.push(`Skipping malformed line: ${line.substring(0, 50)}...`);
          continue;
        }

        const questionText = questionMatch[1].trim();
        const optionTexts = optionsMatch[1].split('-').map(opt => opt.trim()).filter(opt => opt);
        const correctAnswerText = correctMatch[1].trim();

        if (!questionText || optionTexts.length < 2 || !correctAnswerText) {
          questionsFailedCount++;
          errors.push(`Skipping invalid data in line: ${line.substring(0, 50)}...`);
          continue;
        }

        const answerOptions: AnswerOption[] = optionTexts.map(text => ({
          id: crypto.randomUUID(),
          text: text,
        }));

        const correctOption = answerOptions.find(opt => opt.text === correctAnswerText);
        if (!correctOption) {
          questionsFailedCount++;
          errors.push(`Correct answer text "${correctAnswerText}" not found in options for line: ${line.substring(0, 50)}...`);
          continue;
        }

        const newQuestionData: Omit<Question, 'id'> = {
          text: questionText,
          options: answerOptions,
          correctAnswerId: correctOption.id,
          categoryId: categoryId,
        };

        const result = await addQuestion(newQuestionData);
        if (result.success) {
            questionsAddedCount++;
        } else {
            questionsFailedCount++;
            errors.push(`Failed to add question from line: ${line.substring(0, 50)}... Error: ${result.error}`);
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        questionsFailedCount++;
        errors.push(`Error processing line: ${line.substring(0, 50)}... (${errorMessage})`);
      }
    }
    
    const responseData = {
      added: questionsAddedCount,
      failed: questionsFailedCount,
      errors: errors.length > 0 ? errors : undefined,
    };

    if (questionsAddedCount > 0 && questionsFailedCount > 0) {
        return NextResponse.json({ success: true, data: responseData, message: 'Partial success' }, { status: 207 });
    }
    if (questionsFailedCount > 0 && questionsAddedCount === 0) {
        return NextResponse.json({ success: false, data: responseData, error: 'Batch processing failed for all items.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: responseData }, { status: 201 });

  } catch (error) {
    console.error(`Error in POST /api/categories/${params.categoryId}/questions/batch:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
