
'use server';
/**
 * @fileOverview A flow to generate an explanation for a quiz question and its answer,
 * now with the ability to fetch additional context about entities using tools that query an LLM.
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
// Note: AnswerOption type is implicitly handled by the schemas if needed, but not directly used in this file's top-level logic.


// Re-export types for external use, derived from imported schemas
export type ExplainAnswerInput = z.infer<typeof ImportedExplainAnswerInputSchema>;
export type ExplainAnswerOutput = z.infer<typeof ImportedExplainAnswerOutputSchema>;


// Internal schema for the main prompt's direct input (not exported)
const PromptInputSchema = z.object({
  questionText: z.string().describe("The text of the quiz question."),
  allOptionsText: z.array(z.string()).describe("An array of all answer option texts."),
  correctAnswerText: z.string().describe("The text of the correct answer."),
  selectedAnswerText: z.string().nullable().describe("The text of the answer selected by the user, or null if skipped/timed out."),
  wasCorrect: z.boolean().nullable().describe("Whether the user's selection was correct, null if skipped/timed out."),
});

// --- Tool Definitions ---

// Tool for Book Information
const BookInfoInputSchema = z.object({ title: z.string().describe("The title of the book.") });
const BookInfoSchema = z.object({
  author: z.string().describe("The author of the book. Use 'Unknown' if not found."),
  publicationYear: z.string().describe("The year the book was published (e.g., '1851'). Use 'Unknown' if not found."),
  summary: z.string().describe("A brief (1-2 sentence) summary of the book. Use 'No summary available.' if not found.")
});

const bookInfoFetcherPrompt = ai.definePrompt({
    name: 'bookInfoFetcherPrompt',
    input: { schema: BookInfoInputSchema },
    output: { schema: BookInfoSchema },
    prompt: `You are a knowledgeable librarian. For the book titled "{{title}}", provide the following information:
- author: The author's full name.
- publicationYear: The year the book was first published (e.g., "1851").
- summary: A concise 1-2 sentence summary of the book's main plot or theme.

If any piece of information cannot be found, use "Unknown" for author/publicationYear and "No summary available." for the summary.
Book Title: {{title}}`,
});

const getBookInfoTool = ai.defineTool(
  {
    name: 'getBookInfo',
    description: 'Provides information about a book, including its author, publication year, and a brief summary. Use this if a book title is mentioned in the quiz question or options.',
    inputSchema: BookInfoInputSchema,
    outputSchema: BookInfoSchema,
  },
  async ({ title }) => {
    try {
      const { output } = await bookInfoFetcherPrompt({ title });
      if (output) {
        return output;
      }
      return { author: "Information not found", publicationYear: "N/A", summary: "Could not retrieve details for this book via AI." };
    } catch (error) {
      console.error(`Error in getBookInfoTool for "${title}":`, error);
      return { author: "Error fetching data", publicationYear: "Error", summary: "An error occurred while fetching book details." };
    }
  }
);

// Tool for Author Information
const AuthorInfoInputSchema = z.object({ name: z.string().describe("The name of the author.") });
const AuthorInfoSchema = z.object({
  majorWorks: z.array(z.object({ 
    title: z.string().describe("Title of a major work."), 
    year: z.string().describe("Publication year of the work (e.g., '1813'). Use 'Unknown' if year not found.") 
  })).describe("A list of up to 3 of the author's major works with publication years. Empty list if none found."),
  bioSummary: z.string().describe("A brief (1-2 sentence) biographical summary of the author. Use 'No biographical summary available.' if not found.")
});

const authorInfoFetcherPrompt = ai.definePrompt({
    name: 'authorInfoFetcherPrompt',
    input: { schema: AuthorInfoInputSchema },
    output: { schema: AuthorInfoSchema },
    prompt: `You are a literary expert. For the author named "{{name}}", provide the following:
- majorWorks: A list of up to 3 of their most significant literary works, each including its title and publication year (e.g., "1949").
- bioSummary: A concise 1-2 sentence biographical summary highlighting their significance or style.

If information is unavailable, provide an empty list for majorWorks and "No biographical summary available." for bioSummary.
Author: {{name}}`,
});

const getAuthorInfoTool = ai.defineTool(
  {
    name: 'getAuthorInfo',
    description: "Provides information about an author, including their major works and a brief biography. Use this if an author's name is mentioned.",
    inputSchema: AuthorInfoInputSchema,
    outputSchema: AuthorInfoSchema,
  },
  async ({ name }) => {
    try {
      const { output } = await authorInfoFetcherPrompt({ name });
      if (output) {
        return output;
      }
      return { majorWorks: [], bioSummary: "Could not retrieve details for this author via AI." };
    } catch (error) {
      console.error(`Error in getAuthorInfoTool for "${name}":`, error);
      return { majorWorks: [], bioSummary: "An error occurred while fetching author details." };
    }
  }
);

// Tool for Event Information
const EventInfoInputSchema = z.object({ eventName: z.string().describe("The name of the event.") });
const EventInfoSchema = z.object({
  date: z.string().describe("The date or date range of the event (e.g., '1789–1799' or 'July 20, 1969'). Use 'Unknown' if not found."),
  keyFacts: z.array(z.string()).describe("A list of up to 3 key facts about the event. Empty list if none found."),
  significance: z.string().describe("A brief (1-2 sentence) statement on the significance of the event. Use 'No significance summary available.' if not found.")
});

const eventInfoFetcherPrompt = ai.definePrompt({
    name: 'eventInfoFetcherPrompt',
    input: { schema: EventInfoInputSchema },
    output: { schema: EventInfoSchema },
    prompt: `You are a historian. For the historical event named "{{eventName}}", provide:
- date: The date or date range when the event occurred.
- keyFacts: A list of up to 3 crucial facts or outcomes of the event.
- significance: A concise 1-2 sentence summary of its historical significance.

If information is unavailable, use "Unknown" for date, an empty list for keyFacts, and "No significance summary available." for significance.
Event: {{eventName}}`,
});

const getEventInfoTool = ai.defineTool(
  {
    name: 'getEventInfo',
    description: 'Provides information about a historical or significant event, including its date, key facts, and significance. Use this if an event is mentioned.',
    inputSchema: EventInfoInputSchema,
    outputSchema: EventInfoSchema,
  },
  async ({ eventName }) => {
    try {
      const { output } = await eventInfoFetcherPrompt({ eventName });
      if (output) {
        return output;
      }
      return { date: "N/A", keyFacts: [], significance: "Could not retrieve details for this event via AI." };
    } catch (error) {
      console.error(`Error in getEventInfoTool for "${eventName}":`, error);
      return { date: "Error", keyFacts: [], significance: "An error occurred while fetching event details." };
    }
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
  tools: [getBookInfoTool, getAuthorInfoTool, getEventInfoTool],
  prompt: `You are an AI Quiz Explainer. Your goal is to provide a comprehensive, informative, and well-structured explanation for a quiz question.

**Question Details:**
- Question: {{{questionText}}}
- Options Provided:
{{#each allOptionsText}}
  - {{{this}}}
{{/each}}
- Correct Answer: {{{correctAnswerText}}}
{{#if selectedAnswerText}}
- User Selected: {{{selectedAnswerText}}} (This was {{#if wasCorrect}}CORRECT{{else}}INCORRECT{{/if}})
{{else}}
- User SKIPPED this question or timed out.
{{/if}}

**Explanation Structure:**

**1. Answer Analysis:**
   - Explain why "{{{correctAnswerText}}}" is the correct answer in the context of the question.
   {{#if selectedAnswerText}}
     {{#unless wasCorrect}}
   - Explain why "{{{selectedAnswerText}}}" is NOT the correct answer.
     {{/unless}}
   {{/if}}

**2. Contextual Enrichment (If Applicable):**
   Identify any specific entities mentioned in the question or options, such as book titles, author names, or historical events.
   For each identified entity, use the tools to fetch information and present it in the following format:

   **For Books:**
   If a book (e.g., "Moby Dick") is mentioned:
   ### About the Book: [Actual Book Title from Tool]
   - **Author:** [Author's Name from Tool]
   - **Publication Year:** [Year from Tool]
   - **Summary:**
     - [Brief summary point 1 from Tool]
     - [Brief summary point 2, if applicable, from Tool]

   **For Authors:**
   If an author (e.g., "Jane Austen") is mentioned:
   ### About the Author: [Actual Author Name from Tool]
   - **Major Works:**
     - [Work Title 1] ([Year])
     - [Work Title 2] ([Year])
     - [Work Title 3] ([Year, if available])
   - **Biographical Summary:** [Brief bio from Tool]

   **For Events:**
   If an event (e.g., "French Revolution") is mentioned:
   ### About the Event: [Actual Event Name from Tool]
   - **Date:** [Date or Date Range from Tool]
   - **Key Facts:**
     - [Fact 1 from Tool]
     - [Fact 2 from Tool]
     - [Fact 3, if applicable, from Tool]
   - **Significance:** [Brief statement on significance from Tool]

**Important Instructions:**
- Present all information as part of a natural, engaging, and easy-to-understand narrative.
- **Do NOT mention the process of how you obtained this information.** Do not refer to any specific tool names (like getBookInfo, getAuthorInfo, getEventInfo), and do not output the tool call itself (e.g., "According to the tool..."). Simply state the facts as if you already know them, weaving them seamlessly into the explanation.
- Use markdown for headings (e.g., ### Heading) and bullet points (e.g., - Point) for clarity.

Provide your detailed and structured explanation below:
Explanation:`,
});

const explainAnswerFlow = ai.defineFlow(
  {
    name: 'explainAnswerFlow',
    inputSchema: ImportedExplainAnswerInputSchema,
    outputSchema: ImportedExplainAnswerOutputSchema,
  },
  async (input) => {
    try {
      const correctAnswerOption = input.options.find(opt => opt.id === input.correctAnswerId);
      if (!correctAnswerOption) {
        // This ensures that if essential data is missing, we return a specific error.
        console.error("explainAnswerFlow: Correct answer details not found in input options.");
        return { explanation: "Error: Could not find the correct answer details from the provided options to generate an explanation." };
      }

      let selectedAnswerOptionText: string | null = null;
      let wasUserCorrect: boolean | null = null;

      if (input.selectedAnswerId) {
        const selectedOpt = input.options.find(opt => opt.id === input.selectedAnswerId);
        if (selectedOpt) {
          selectedAnswerOptionText = selectedOpt.text;
          wasUserCorrect = input.selectedAnswerId === input.correctAnswerId;
        } else {
          // Log if the selectedAnswerId is present but not found in options.
          console.warn(`explainAnswerFlow: Selected answer ID "${input.selectedAnswerId}" not found in options array.`);
          selectedAnswerOptionText = "An unlisted or invalid option was recorded by the user."; // More descriptive for the prompt
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
      
      // This inner try-catch handles errors specifically from the prompt execution.
      try {
          const {output} = await explainAnswerPrompt(promptInternalInput);
          if (!output) {
              console.warn("explainAnswerFlow: explainAnswerPrompt returned no output. Model might have refused or an issue occurred.");
              return { explanation: "Sorry, I couldn't generate a structured explanation at this time. The AI model might have had an issue providing content." };
          }
          return output; // output is already validated against ExplainAnswerOutputSchema by the prompt
      } catch (promptError) {
          console.error("Error during explainAnswerPrompt execution inside flow:", promptError);
          return { explanation: "An error occurred while the AI was processing the request for explanation. Please try again." };
      }

    } catch (flowError) {
      // This outer try-catch handles any other unexpected errors within the flow's logic.
      console.error("Critical unhandled error in explainAnswerFlow:", flowError);
      return { explanation: "A critical system error occurred while preparing to generate the explanation. Please report this." };
    }
  }
);

