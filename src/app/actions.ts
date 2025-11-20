
"use server";

import { generateDistractors as generateDistractorsFlow, type GenerateDistractorsInput } from "@/ai/flows/generate-distractors";
import { explainAnswer as explainAnswerFlow, type ExplainAnswerInput } from "@/ai/flows/explain-answer-flow";
import { generateQuestions as generateQuestionsFlow } from "@/ai/flows/generate-questions-flow";
import type { GenerateQuestionsInput } from "@/types";
// Note: The types GenerateDistractorsInput and ExplainAnswerInput are now exported from the flow files themselves,
// which internally derive them from schemas imported from @/types.

export async function generateDistractorsAction(input: GenerateDistractorsInput) {
  try {
    const result = await generateDistractorsFlow(input);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error generating distractors:", error);
    return { success: false, error: "Failed to generate distractors. Please try again." };
  }
}

export async function explainAnswerAction(input: ExplainAnswerInput) {
  try {
    const result = await explainAnswerFlow(input);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error generating explanation:", error);
    return { success: false, error: "Failed to generate explanation. Please try again." };
  }
}

export async function generateQuestionsFromTextAction(input: GenerateQuestionsInput) {
  try {
    const result = await generateQuestionsFlow(input);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error generating questions from text:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate questions. Please try again.";
    return { success: false, error: errorMessage };
  }
}
