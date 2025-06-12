
'use server';
/**
 * @fileOverview A flow to generate an explanation for a quiz question and its answer,
 * now with the ability to fetch additional context about entities using tools.
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

// --- Tool Definitions ---

// Tool for Book Information
const BookInfoSchema = z.object({
  author: z.string().describe("The author of the book."),
  publicationYear: z.string().describe("The year the book was published."),
  summary: z.string().describe("A brief summary of the book.")
});
const getBookInfoTool = ai.defineTool(
  {
    name: 'getBookInfo',
    description: 'Provides information about a book, including its author, publication year, and a brief summary. Use this if a book title is mentioned.',
    inputSchema: z.object({ title: z.string().describe("The title of the book.") }),
    outputSchema: BookInfoSchema,
  },
  async ({ title }) => {
    // Mock data for demonstration. In a real app, call an API here.
    if (title.toLowerCase().includes("moby dick")) {
      return { author: "Herman Melville", publicationYear: "1851", summary: "A novel about Captain Ahab's obsessive quest to hunt Moby Dick, a giant white sperm whale." };
    }
    if (title.toLowerCase().includes("pride and prejudice")) {
      return { author: "Jane Austen", publicationYear: "1813", summary: "A romantic novel that charts the emotional development of the protagonist Elizabeth Bennet." };
    }
    if (title.toLowerCase().includes("1984") || title.toLowerCase().includes("nineteen eighty-four")) {
      return { author: "George Orwell", publicationYear: "1949", summary: "A dystopian social science fiction novel and cautionary tale." };
    }
    return { author: "Unknown", publicationYear: "Unknown", summary: `No specific information found for "${title}".` };
  }
);

// Tool for Author Information
const AuthorInfoSchema = z.object({
  majorWorks: z.array(z.object({ title: z.string(), year: z.string() })).describe("A list of the author's major works with publication years."),
  bioSummary: z.string().describe("A brief biographical summary of the author.")
});
const getAuthorInfoTool = ai.defineTool(
  {
    name: 'getAuthorInfo',
    description: "Provides information about an author, including their major works and a brief biography. Use this if an author's name is mentioned.",
    inputSchema: z.object({ name: z.string().describe("The name of the author.") }),
    outputSchema: AuthorInfoSchema,
  },
  async ({ name }) => {
    // Mock data
    if (name.toLowerCase().includes("jane austen")) {
      return { 
        majorWorks: [
          { title: "Sense and Sensibility", year: "1811" },
          { title: "Pride and Prejudice", year: "1813" },
          { title: "Mansfield Park", year: "1814" },
          { title: "Emma", year: "1815" },
        ], 
        bioSummary: "Jane Austen was an English novelist known primarily for her six major novels, which interpret, critique and comment upon the British landed gentry at the end of milking the 18th century." 
      };
    }
     if (name.toLowerCase().includes("george orwell")) {
      return { 
        majorWorks: [
          { title: "Animal Farm", year: "1945" },
          { title: "Nineteen Eighty-Four", year: "1949" },
        ], 
        bioSummary: "Eric Arthur Blair (George Orwell) was an English novelist, essayist, journalist and critic, whose work is marked by lucid prose, awareness of social injustice, and opposition to totalitarianism." 
      };
    }
    return { majorWorks: [], bioSummary: `No specific information found for author "${name}".` };
  }
);

// Tool for Event Information
const EventInfoSchema = z.object({
  date: z.string().describe("The date or date range of the event."),
  keyFacts: z.array(z.string()).describe("A list of key facts about the event."),
  significance: z.string().describe("The significance of the event.")
});
const getEventInfoTool = ai.defineTool(
  {
    name: 'getEventInfo',
    description: 'Provides information about a historical or significant event, including its date, key facts, and significance. Use this if an event is mentioned.',
    inputSchema: z.object({ eventName: z.string().describe("The name of the event.") }),
    outputSchema: EventInfoSchema,
  },
  async ({ eventName }) => {
    // Mock data
    if (eventName.toLowerCase().includes("french revolution")) {
      return { 
        date: "1789–1799", 
        keyFacts: ["Storming of the Bastille", "Reign of Terror", "Rise of Napoleon Bonaparte"], 
        significance: "A period of far-reaching social and political upheaval in France and its colonies beginning in 1789." 
      };
    }
    if (eventName.toLowerCase().includes("apollo 11 moon landing")) {
      return { 
        date: "July 20, 1969", 
        keyFacts: ["Neil Armstrong and Buzz Aldrin were the first humans to walk on the Moon.", "Command module pilot was Michael Collins.", "Fulfilled President Kennedy's goal."], 
        significance: "A major achievement in human history and the Space Race." 
      };
    }
    return { date: "Unknown", keyFacts: [], significance: `No specific information found for event "${eventName}".` };
  }
);


// --- End Tool Definitions ---

export async function explainAnswer(input: ExplainAnswerInput): Promise<ExplainAnswerOutput> {
  return explainAnswerFlow(input);
}

const explainAnswerPrompt = ai.definePrompt({
  name: 'explainAnswerPrompt',
  input: {schema: PromptInputSchema},
  output: {schema: ImportedExplainAnswerOutputSchema},
  tools: [getBookInfoTool, getAuthorInfoTool, getEventInfoTool], // Register tools with the prompt
  prompt: `You are an AI Quiz Explainer. Your goal is to provide a comprehensive and informative explanation for a quiz question.

First, directly address the question and the user's answer:
1.  Explain why the correct answer ("{{{correctAnswerText}}}") is indeed correct in the context of the question ("{{{questionText}}}").
2.  If the user selected an answer ("{{{selectedAnswerText}}}"):
    a.  If it was correct ({{wasCorrect}} is true), acknowledge this.
    b.  If it was incorrect ({{wasCorrect}} is false), clearly explain why "{{{selectedAnswerText}}}" is not the correct answer.
3.  If the user did not select an answer ({{{selectedAnswerText}}} is null), simply focus on explaining the correct answer.

After addressing the immediate question, enhance the explanation:
Identify any specific entities mentioned in the question or options, such as book titles, author names, or historical events.
If you identify such entities, use the available tools (getBookInfo, getAuthorInfo, getEventInfo) to gather relevant details (e.g., publication years, author's major works and their years, event dates, key facts, significance).
Seamlessly integrate this additional information into your explanation to provide richer context and educational value. Make the explanation engaging and easy to understand.

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
{{{selectedAnswerText}}} (This was {{#if wasCorrect}}CORRECT{{else}}INCORRECT{{/if}})
{{else}}
User SKIPPED this question or timed out.
{{/if}}

Provide your detailed explanation below:
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
        selectedAnswerOptionText = "An option that was not listed.";
        wasUserCorrect = false;
      }
    }

    const promptInternalInput: z.infer<typeof PromptInputSchema> = {
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

