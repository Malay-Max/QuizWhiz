
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
  status: 'active' | 'completed';
  userId?: string; 
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
  status: 'active' | 'completed';
  userId?: string; 
}


// Schemas for explainAnswerFlow
export const ExplainAnswerInputSchema = z.object({
  questionText: z.string().describe("The text of the quiz question."),
  options: z.array(z.object({ id: z.string(), text: z.string() })).describe("All answer options with their IDs and text."),
  correctAnswerId: z.string().describe("The ID of the correct answer."),
  selectedAnswerId: z.string().nullable().describe("The ID of the answer selected by the user, or null if skipped/timed out."),
});
export type ExplainAnswerInput = z.infer<typeof ExplainAnswerInputSchema>;

export const ExplainAnswerOutputSchema = z.object({
  explanation: z.string().describe("The AI-generated explanation for the answer."),
});
export type ExplainAnswerOutput = z.infer<typeof ExplainAnswerOutputSchema>;

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

// CategoryTreeNode is deprecated, use Category interface with populated children/fullPath
// export interface CategoryTreeNode {
//   name: string; 
//   path: string; 
//   children: CategoryTreeNode[];
// }
