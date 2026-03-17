import { PutCommand, GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo } from "./dynamo";
import { DYNAMO_TABLE_NAME } from "./config";
import { Quiz, Attempt } from "../models/DatabaseInterfaces";

/**
 * Creates or overwrites a quiz in DynamoDB.
 */
export async function saveQuiz(quiz: Quiz) {
  return dynamo.send(
    new PutCommand({
      TableName: DYNAMO_TABLE_NAME,
      Item: quiz,
    })
  );
}

/**
 * Retrieves a quiz by its ID.
 */
export async function getQuiz(quizId: string): Promise<Quiz | null> {
  const response = await dynamo.send(
    new GetCommand({
      TableName: DYNAMO_TABLE_NAME,
      Key: {
        PK: `QUIZ#${quizId}`,
        SK: "METADATA",
      },
    })
  );
  return (response.Item as Quiz) || null;
}

/**
 * Deletes a quiz by its ID.
 */
export async function deleteQuiz(quizId: string) {
  return dynamo.send(
    new DeleteCommand({
      TableName: DYNAMO_TABLE_NAME,
      Key: {
        PK: `QUIZ#${quizId}`,
        SK: "METADATA",
      },
    })
  );
}

/**
 * Saves a student's attempt to the database for analytics and grading.
 */
export async function saveAttempt(attempt: Attempt) {
  return dynamo.send(
    new PutCommand({
      TableName: DYNAMO_TABLE_NAME,
      Item: attempt,
    })
  );
}
