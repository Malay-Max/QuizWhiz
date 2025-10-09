
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

const batchQuestionSchema = z.object({
  question: z.string().min(1, 'Question text cannot be empty.'),
  options: z.record(z.string().min(1), {
    errorMap: () => ({ message: 'Options must be a key-value object of strings.' })
  }),
  correctAnswer: z.string().length(1, 'Correct answer key must be a single character (e.g., "A").'),
  explanation: z.string().optional(),
});

const batchAddSchema = z.array(batchQuestionSchema).min(1, 'Batch input must be an array of at least one question.');

// POST /api/categories/:categoryId/questions/batch - Batch add questions from JSON
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
    
    const questionsToAdd = validation.data;
    let questionsAddedCount = 0;
    let questionsFailedCount = 0;
    const errors: string[] = [];

    for (const item of questionsToAdd) {
      try {
        const optionKeys = Object.keys(item.options);
        if (optionKeys.length < 2) {
          questionsFailedCount++;
          errors.push(`Skipping question with less than 2 options: ${item.question.substring(0, 30)}...`);
          continue;
        }

        const correctAnswerText = item.options[item.correctAnswer];
        if (!correctAnswerText) {
          questionsFailedCount++;
          errors.push(`Correct answer key "${item.correctAnswer}" not found in options for question: ${item.question.substring(0, 30)}...`);
          continue;
        }

        const answerOptions: AnswerOption[] = Object.values(item.options).map(text => ({
          id: crypto.randomUUID(),
          text: text,
        }));

        const correctOption = answerOptions.find(opt => opt.text === correctAnswerText);
        if (!correctOption) {
          questionsFailedCount++;
          errors.push(`Could not reconcile correct answer for question: ${item.question.substring(0, 30)}...`);
          continue;
        }

        const newQuestionData: Omit<Question, 'id'> = {
          text: item.question,
          options: answerOptions,
          correctAnswerId: correctOption.id,
          categoryId: categoryId,
          explanation: item.explanation,
        };

        const result = await addQuestion(newQuestionData);
        if (result.success) {
            questionsAddedCount++;
        } else {
            questionsFailedCount++;
            errors.push(`Failed to add question: ${item.question.substring(0, 30)}... Error: ${result.error}`);
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        questionsFailedCount++;
        errors.push(`Error processing item: ${item.question.substring(0, 30)}... (${errorMessage})`);
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
