"use server";

import {
  SageMakerRuntimeClient,
  InvokeEndpointCommand,
} from "@aws-sdk/client-sagemaker-runtime";
import { AWS_REGION } from "./config";
import { Difficulty } from "../models/DatabaseInterfaces";

const sagemakerClient = new SageMakerRuntimeClient({
  region: AWS_REGION,
});

const SAGEMAKER_ENDPOINT_NAME = (process.env.SAGEMAKER_ENDPOINT_NAME || "").trim();
const ENABLE_SAGEMAKER = (process.env.ENABLE_SAGEMAKER || "").trim() === "true";

/**
 * Triggers the AI Model hosted on SageMaker to recalculate question difficulties
 * based on a batch of new quiz attempt responses.
 * 
 * @param questionId The UUID of the question to evaluate
 * @param successRate Float 0.0 to 1.0 representing the percentage of students who got it right
 * @returns The newly estimated Difficulty enum (EASY, MEDIUM, HARD)
 */
export async function estimateQuestionDifficulty(
  questionId: string,
  successRate: number
): Promise<Difficulty> {
  // Default local estimator for MVP mode (no SageMaker requirement).
  if (!ENABLE_SAGEMAKER || !SAGEMAKER_ENDPOINT_NAME) {
    if (successRate > 0.75) return "EASY";
    if (successRate > 0.40) return "MEDIUM";
    return "HARD";
  }

  const payload = {
    question_id: questionId,
    success_rate: successRate,
  };

  try {
    const command = new InvokeEndpointCommand({
      EndpointName: SAGEMAKER_ENDPOINT_NAME,
      Body: new TextEncoder().encode(JSON.stringify(payload)),
      ContentType: "application/json",
    });

    const response = await sagemakerClient.send(command);
    
    if (response.Body) {
      const responseData = JSON.parse(new TextDecoder().decode(response.Body));
      return responseData.estimated_difficulty as Difficulty;
    }

    throw new Error("Empty response from SageMaker");
  } catch {
    // Fallback logic if SageMaker is unavailable or rate limited (Free Tier safety)
    if (successRate > 0.75) return "EASY";
    if (successRate > 0.40) return "MEDIUM";
    return "HARD";
  }
}
