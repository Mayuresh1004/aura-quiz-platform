import {
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo } from "./dynamo";
import { DYNAMO_TABLE_NAME } from "./config";
import { Quiz, Attempt, Difficulty, Question } from "../models/DatabaseInterfaces";

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
 * Lists all quizzes in the table.
 * Uses a Scan with a FilterExpression on the PK prefix.
 * For production, consider a GSI on entity type for efficiency.
 */
export async function listQuizzes(): Promise<Quiz[]> {
  const response = await dynamo.send(
    new ScanCommand({
      TableName: DYNAMO_TABLE_NAME,
      FilterExpression: "begins_with(PK, :prefix) AND SK = :sk",
      ExpressionAttributeValues: {
        ":prefix": "QUIZ#",
        ":sk": "METADATA",
      },
    })
  );
  return (response.Items as Quiz[]) || [];
}

/**
 * Lists all quiz attempt records for a specific student.
 */
export async function listAttemptsByStudent(studentId: string): Promise<Attempt[]> {
  const response = await dynamo.send(
    new QueryCommand({
      TableName: DYNAMO_TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": `USER#${studentId}`,
        ":skPrefix": "ATTEMPT#",
      },
    })
  );
  return (response.Items as Attempt[]) || [];
}

/**
 * Lists all attempt records in the table.
 * Used for teacher analytics dashboards.
 */
export async function listAllAttempts(): Promise<Attempt[]> {
  const response = await dynamo.send(
    new ScanCommand({
      TableName: DYNAMO_TABLE_NAME,
      FilterExpression: "begins_with(SK, :attemptPrefix)",
      ExpressionAttributeValues: {
        ":attemptPrefix": "ATTEMPT#",
      },
    })
  );
  return (response.Items as Attempt[]) || [];
}

/**
 * Updates the difficulty tags on each question in a quiz after AI estimation.
 * Persists the updated questions array back to DynamoDB.
 */
export async function updateQuizQuestionDifficulties(
  quizId: string,
  updatedQuestions: Question[]
) {
  return dynamo.send(
    new UpdateCommand({
      TableName: DYNAMO_TABLE_NAME,
      Key: {
        PK: `QUIZ#${quizId}`,
        SK: "METADATA",
      },
      UpdateExpression: "SET questions = :questions",
      ExpressionAttributeValues: {
        ":questions": updatedQuestions,
      },
    })
  );
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
