
"use server";

import { generateDistractors as generateDistractorsFlow, type GenerateDistractorsInput } from "@/ai/flows/generate-distractors";
import { explainAnswer as explainAnswerFlow, type ExplainAnswerInput } from "@/ai/flows/explain-answer-flow";
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
  } catch (error)
   {
    console.error("Error generating explanation:", error);
    return { success: false, error: "Failed to generate explanation. Please try again." };
  }
}
