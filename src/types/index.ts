
import type { Timestamp } from 'firebase/firestore'; 
import { z } from 'genkit';

export interface AnswerOption {
  id: string;
  text: string;
}

// New Category Interface
export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  children?: Category[]; // Populated by buildCategoryTree
  fullPath?: string;    // Populated by getFullCategoryPath or buildCategoryTree
}

export interface Question {
  id: string;
  text: string;
  options: AnswerOption[];
  correctAnswerId: string;
  categoryId: string; // Changed from category: string (path)
  explanation?: string | null; // Optional static explanation
}

export interface QuizAnswer {
  questionId: string;
  selectedAnswerId?: string;
  isCorrect?: boolean;
  timeTaken: number; // in seconds
  skipped: boolean;
}

export interface QuizSession {
  id: string;
  categoryId: string; // Changed from category: string (path)
  categoryName?: string; // Optional: For storing resolved path at session start
  questions: Question[];
  currentQuestionIndex: number;
  answers: QuizAnswer[];
  startTime: number; // timestamp
  endTime?: number; // timestamp
  status: 'active' | 'completed' | 'paused';
  userId?: string; 
  pauseTime?: number; // Timestamp when quiz was paused
  totalPausedTime: number; // in milliseconds
}

export interface StorableQuizSession {
  id: string;
  categoryId: string; // Changed from category: string (path)
  categoryName?: string; 
  questions: Question[];
  currentQuestionIndex: number;
  answers: QuizAnswer[];
  startTime: Timestamp; 
  endTime?: Timestamp; 
  status: 'active' | 'completed' | 'paused';
  userId?: string;
  pauseTime?: Timestamp; // Timestamp when quiz was paused
  totalPausedTime: number; // in milliseconds
}


// --- API Schemas ---

// Schema for the API to create a new question (POST /api/categories/:id/questions)
export const CreateQuestionInputSchema = z.object({
  text: z.string().min(5, 'Question text must be at least 5 characters.'),
  options: z.array(z.string().min(1, 'Option text cannot be empty.')).min(2, 'At least 2 options are required.'),
  correctAnswerText: z.string().min(1, 'Correct answer text cannot be empty.'),
  explanation: z.string().optional(),
});

// Schema for the API to update an existing question (PUT /api/questions/:id)
const ApiAnswerOptionSchema = z.object({
  id: z.string(),
  text: z.string().min(1, 'Option text cannot be empty.'),
});
export const UpdateQuestionInputSchema = z.object({
  text: z.string().min(5, 'Question text must be at least 5 characters.').optional(),
  options: z.array(ApiAnswerOptionSchema).min(2, 'At least 2 options are required.').optional(),
  correctAnswerId: z.string().optional(),
  categoryId: z.string().optional(),
  explanation: z.string().nullable().optional(),
});


// Schemas for generateDistractorsFlow
export const GenerateDistractorsInputSchema = z.object({
  question: z.string().describe('The question for which to generate distractors.'),
  correctAnswer: z.string().describe('The correct answer to the question.'),
  numDistractors: z.number().default(3).describe('The number of distractors to generate. Defaults to 3.'),
});
export type GenerateDistractorsInput = z.infer<typeof GenerateDistractorsInputSchema>;

export const GenerateDistractorsOutputSchema = z.object({
  distractors: z.array(
    z.string().describe('A plausible distractor (incorrect answer option) for the question.')
  ).describe('An array of distractors for the question.')
});
export type GenerateDistractorsOutput = z.infer<typeof GenerateDistractorsOutputSchema>;


// --- Quiz Session API Schemas ---

export const StartQuizInputSchema = z.object({
    categoryId: z.string().optional(),
    random: z.boolean().default(false),
    questionCount: z.number().int().positive().optional(),
});

export const AnswerQuestionInputSchema = z.object({
    questionId: z.string(),
    selectedAnswerId: z.string(),
});


// --- Explanation Flow Schemas ---

// Represents a single answer option for the explanation flow input.
const ExplainAnswerOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
});

// Schema for the input to the explainAnswer function/flow.
export const ExplainAnswerInputSchema = z.object({
  questionText: z.string().describe("The text of the quiz question."),
  options: z.array(ExplainAnswerOptionSchema).describe("All possible answer options for the question."),
  correctAnswerId: z.string().describe("The ID of the correct answer option."),
  selectedAnswerId: z.string().nullable().describe("The ID of the answer selected by the user. Null if skipped."),
});
export type ExplainAnswerInput = z.infer<typeof ExplainAnswerInputSchema>;


// Schema for the output from the explainAnswer function/flow.
export const ExplainAnswerOutputSchema = z.object({
  explanation: z.string().describe('A detailed, well-structured explanation in Markdown format about why the correct answer is right, why the selected answer might be wrong, and enriched with additional context about relevant topics, books, or authors mentioned.'),
});
export type ExplainAnswerOutput = z.infer<typeof ExplainAnswerOutputSchema>;
