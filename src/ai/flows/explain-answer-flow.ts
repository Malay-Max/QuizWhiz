
'use server';
/**
 * @fileOverview A flow to generate an explanation for a quiz question and its answer.
 *
 * - explainAnswer - A function that generates an explanation.
 * - ExplainAnswerInput - The input type for the explainAnswer function.
 * - ExplainAnswerOutput - The return type for the explainAnswer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { 
  ExplainAnswerInputSchema as ImportedExplainAnswerInputSchema, 
  ExplainAnswerOutputSchema as ImportedExplainAnswerOutputSchema 
} from '@/types';
import type { AnswerOption } from '@/types';


// Re-export types for external use, derived from imported schemas
export type ExplainAnswerInput = z.infer<typeof ImportedExplainAnswerInputSchema>;
export type ExplainAnswerOutput = z.infer<typeof ImportedExplainAnswerOutputSchema>;


// Internal schema for the prompt's direct input (not exported)
const PromptInputSchema = z.object({
  questionText: z.string().describe("The text of the quiz question."),
  allOptionsText: z.array(z.string()).describe("An array of all answer option texts."),
  correctAnswerText: z.string().describe("The text of the correct answer."),
  selectedAnswerText: z.string().nullable().describe("The text of the answer selected by the user, or null if skipped/timed out."),
  wasCorrect: z.boolean().nullable().describe("Whether the user's selection was correct, null if skipped/timed out."),
});

export async function explainAnswer(input: ExplainAnswerInput): Promise<ExplainAnswerOutput> {
  return explainAnswerFlow(input);
}

const explainAnswerPrompt = ai.definePrompt({
  name: 'explainAnswerPrompt',
  input: {schema: PromptInputSchema},
  output: {schema: ImportedExplainAnswerOutputSchema},
  prompt: `You are an AI Quiz Explainer. Given a question, the options, the correct answer, and the user's selected answer (if any), provide a concise and clear explanation.

Question:
{{{questionText}}}

Options Provided:
{{#each allOptionsText}}
- {{{this}}}
{{/each}}

Correct Answer:
{{{correctAnswerText}}}

{{#if selectedAnswerText}}
User Selected:
{{{selectedAnswerText}}}

  {{#if wasCorrect}}
  The user's selection was CORRECT. Explain in detail why "{{{correctAnswerText}}}" is the correct answer to the question.
  {{else}}
  The user's selection was INCORRECT. Explain in detail why "{{{correctAnswerText}}}" is the correct answer AND why "{{{selectedAnswerText}}}" is incorrect in the context of the question.
  {{/if}}
{{else}}
The user SKIPPED this question or timed out. Explain in detail why "{{{correctAnswerText}}}" is the correct answer to the question.
{{/if}}

Explanation:`,
});

const explainAnswerFlow = ai.defineFlow(
  {
    name: 'explainAnswerFlow',
    inputSchema: ImportedExplainAnswerInputSchema,
    outputSchema: ImportedExplainAnswerOutputSchema,
  },
  async (input) => {
    const correctAnswerOption = input.options.find(opt => opt.id === input.correctAnswerId);
    if (!correctAnswerOption) {
      // This should ideally not happen if data is consistent
      return { explanation: "Error: Could not find the correct answer details to generate an explanation." };
    }

    let selectedAnswerOptionText: string | null = null;
    let wasUserCorrect: boolean | null = null;

    if (input.selectedAnswerId) {
      const selectedOpt = input.options.find(opt => opt.id === input.selectedAnswerId);
      if (selectedOpt) {
        selectedAnswerOptionText = selectedOpt.text;
        wasUserCorrect = input.selectedAnswerId === input.correctAnswerId;
      } else {
        // Fallback if selectedAnswerId is present but not in options (should be rare)
        selectedAnswerOptionText = "An option that was not listed."; // Or some generic text
        wasUserCorrect = false;
      }
    }

    const promptInternalInput = {
      questionText: input.questionText,
      allOptionsText: input.options.map(opt => opt.text),
      correctAnswerText: correctAnswerOption.text,
      selectedAnswerText: selectedAnswerOptionText,
      wasCorrect: wasUserCorrect,
    };
    
    const {output} = await explainAnswerPrompt(promptInternalInput);
    if (!output) {
        return { explanation: "Sorry, I couldn't generate an explanation at this time." };
    }
    return output;
  }
);
