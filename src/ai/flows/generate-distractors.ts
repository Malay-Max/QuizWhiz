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

const GenerateDistractorsInputSchema = z.object({
  question: z.string().describe('The question for which to generate distractors.'),
  correctAnswer: z.string().describe('The correct answer to the question.'),
  numDistractors: z.number().default(3).describe('The number of distractors to generate. Defaults to 3.'),
});

export type GenerateDistractorsInput = z.infer<typeof GenerateDistractorsInputSchema>;

const GenerateDistractorsOutputSchema = z.object({
  distractors: z.array(
    z.string().describe('A plausible distractor (incorrect answer option) for the question.')
  ).describe('An array of distractors for the question.')
});

export type GenerateDistractorsOutput = z.infer<typeof GenerateDistractorsOutputSchema>;

export async function generateDistractors(input: GenerateDistractorsInput): Promise<GenerateDistractorsOutput> {
  return generateDistractorsFlow(input);
}

const generateDistractorsPrompt = ai.definePrompt({
  name: 'generateDistractorsPrompt',
  input: {schema: GenerateDistractorsInputSchema},
  output: {schema: GenerateDistractorsOutputSchema},
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
    inputSchema: GenerateDistractorsInputSchema,
    outputSchema: GenerateDistractorsOutputSchema,
  },
  async input => {
    const {output} = await generateDistractorsPrompt(input);
    return output!;
  }
);
