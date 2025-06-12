"use server";

import { generateDistractors as generateDistractorsFlow, type GenerateDistractorsInput } from "@/ai/flows/generate-distractors";

export async function generateDistractorsAction(input: GenerateDistractorsInput) {
  try {
    const result = await generateDistractorsFlow(input);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error generating distractors:", error);
    return { success: false, error: "Failed to generate distractors. Please try again." };
  }
}
