
// src/ai/flows/generate-distractors.ts
'use server';

/**
 * @fileOverview A flow to generate plausible distractors (incorrect answer options) for a given question.
 *
 * - generateDistractors - A function that generates distractors for a question.
 * - GenerateDistractorsInput - The input type for the generateDistractors function.
 * - GenerateDistractorsOutput - The return type for the generateDistractors function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { 
  GenerateDistractorsInputSchema as ImportedGenerateDistractorsInputSchema, 
  GenerateDistractorsOutputSchema as ImportedGenerateDistractorsOutputSchema 
} from '@/types';

// Re-export types for external use, derived from imported schemas
export type GenerateDistractorsInput = z.infer<typeof ImportedGenerateDistractorsInputSchema>;
export type GenerateDistractorsOutput = z.infer<typeof ImportedGenerateDistractorsOutputSchema>;


export async function generateDistractors(input: GenerateDistractorsInput): Promise<GenerateDistractorsOutput> {
  return generateDistractorsFlow(input);
}

const generateDistractorsPrompt = ai.definePrompt({
  name: 'generateDistractorsPrompt',
  input: {schema: ImportedGenerateDistractorsInputSchema},
  output: {schema: ImportedGenerateDistractorsOutputSchema},
  prompt: `You are an AI assistant helping quiz creators generate plausible distractors (incorrect answer options) for multiple-choice questions.

  Given the following question and correct answer, generate {{{numDistractors}}} plausible distractors that are likely to be chosen by someone who doesn't know the correct answer.
  The distractors should be diverse and not too similar to each other.  They should also be factually incorrect.

  Question: {{{question}}}
  Correct Answer: {{{correctAnswer}}}

  Distractors:`, // Ensure the output is just the list of distractors
});

const generateDistractorsFlow = ai.defineFlow(
  {
    name: 'generateDistractorsFlow',
    inputSchema: ImportedGenerateDistractorsInputSchema,
    outputSchema: ImportedGenerateDistractorsOutputSchema,
  },
  async input => {
    const {output} = await generateDistractorsPrompt(input);
    return output!;
  }
);
