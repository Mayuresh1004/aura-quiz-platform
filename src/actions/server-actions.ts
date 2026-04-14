"use server";

import { registerUser, loginUser, confirmUser } from "../lib/auth-service";
import {
  saveQuiz,
  saveAttempt,
  getQuiz,
  listQuizzes,
  listAttemptsByStudent,
  updateQuizQuestionDifficulties,
} from "../lib/quiz-service";
import { estimateQuestionDifficulty } from "../lib/ai-service";
import { Quiz, Attempt, User, Question } from "../models/DatabaseInterfaces";
import { v4 as uuidv4 } from "uuid";
import { dynamo } from "../lib/dynamo";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { DYNAMO_TABLE_NAME } from "../lib/config";

/**
 * Decodes a Cognito JWT Access Token to extract the user's sub (unique ID).
 * The token payload is base64url-encoded in the second segment.
 */
function extractUserIdFromToken(token: string): string {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));
    return decoded.sub as string;
  } catch {
    return uuidv4(); // Fallback for degenerate token formats
  }
}

/**
 * Registers a user in Cognito AND saves a User metadata record to DynamoDB
 * (including the selected role) so that the platform can authorise them correctly.
 */
export async function handleRegister(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;

  try {
    const cognitoResult = await registerUser(email, password);

    // Persist user metadata (including role) in DynamoDB immediately after Cognito signup.
    // The Cognito sub is used as the canonical user ID across the platform.
    const userId = cognitoResult.UserSub || uuidv4();
    const userRecord: User = {
      PK: `USER#${userId}`,
      SK: "METADATA",
      email,
      role: role as User["role"],
      name: email.split("@")[0], // Default display name from email prefix
      createdAt: new Date().toISOString(),
    };

    await dynamo.send(
      new PutCommand({
        TableName: DYNAMO_TABLE_NAME,
        Item: userRecord,
      })
    );

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Confirms a user's Cognito account using the verification code sent to their email.
 */
export async function handleConfirmRegistration(formData: FormData) {
  const email = formData.get("email") as string;
  const code = formData.get("code") as string;
  try {
    await confirmUser(email, code);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Logs a user in via Cognito and returns the access token and user info.
 */
export async function handleLogin(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;
  try {
    const result = await loginUser(email, password);
    return { success: true, token: result?.AccessToken, user: { email, role } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Creates a new quiz and saves it to DynamoDB.
 * Extracts the real teacherId from the Cognito access token if provided.
 */
export async function handleCreateQuiz(
  quizData: Partial<Quiz>,
  accessToken?: string
) {
  try {
    // Resolve the real teacher ID from the Cognito access token if available,
    // falling back to a placeholder for development without live AWS credentials.
    const teacherUserId = accessToken
      ? extractUserIdFromToken(accessToken)
      : "DEMO_TEACHER";

    const newQuiz: Quiz = {
      PK: `QUIZ#${uuidv4()}`,
      SK: "METADATA",
      title: quizData.title || "Untitled Quiz",
      subject: quizData.subject || "General",
      timeLimitMinutes: quizData.timeLimitMinutes || 30,
      questions: quizData.questions || [],
      createdAt: new Date().toISOString(),
      teacherId: `USER#${teacherUserId}`,
    };
    await saveQuiz(newQuiz);
    return { success: true, quizId: newQuiz.PK.split("#")[1] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Handles a student's quiz submission:
 * 1. Saves the raw attempt to DynamoDB.
 * 2. Fetches the original quiz questions.
 * 3. Runs per-question AI difficulty estimation via SageMaker.
 * 4. Writes the updated difficulty tags back to DynamoDB.
 */
export async function handleQuizSubmission(attempt: Attempt) {
  try {
    // 1. Persist the student's raw attempt immediately for data durability.
    await saveAttempt(attempt);

    // 2. Fetch the original quiz to access each question's ID and metadata.
    const quizId = attempt.quizId;
    const quiz = await getQuiz(quizId);

    if (!quiz || quiz.questions.length === 0) {
      // Attempt saved; skip AI update if quiz metadata is unavailable.
      return { success: true };
    }

    // 3. AI Difficulty Estimation Loop:
    //    For each question, calculate what fraction of students answered correctly
    //    based on this new attempt's response, then ask SageMaker to re-estimate
    //    the difficulty tag. In a production system you would aggregate across all
    //    historical attempts; here we use this single attempt's binary outcome.
    const updatedQuestions: Question[] = await Promise.all(
      quiz.questions.map(async (question, idx) => {
        const studentAnswer = attempt.responses[idx];
        // successRate: 1 if this student got it right, 0 if wrong, 0.5 if unanswered.
        const successRate =
          studentAnswer === undefined
            ? 0.5
            : studentAnswer === question.correctOptionIndex
            ? 1.0
            : 0.0;

        const newDifficulty = await estimateQuestionDifficulty(
          question.id,
          successRate
        );

        return { ...question, difficulty: newDifficulty };
      })
    );

    // 4. Write the AI-updated difficulty tags back to DynamoDB.
    await updateQuizQuestionDifficulties(quizId, updatedQuestions);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetches a single quiz by ID from DynamoDB.
 * Used by the student quiz-taking page to load real questions.
 */
export async function handleGetQuiz(quizId: string) {
  try {
    const quiz = await getQuiz(quizId);
    if (!quiz) return { quiz: null, error: "Quiz not found." };
    return { quiz };
  } catch (err: any) {
    return { quiz: null, error: err.message };
  }
}

/**
 * Lists all quizzes from DynamoDB.
 * Used by the student and teacher dashboards to show available quizzes.
 */
export async function handleListQuizzes() {
  try {
    const quizzes = await listQuizzes();
    return { success: true, quizzes };
  } catch (err: any) {
    return { success: false, quizzes: [], error: err.message };
  }
}

/**
 * Lists all attempts for a given student from DynamoDB.
 * Used by the student dashboard to show completed quizzes and scores.
 */
export async function handleListStudentAttempts(studentId: string) {
  try {
    const attempts = await listAttemptsByStudent(studentId);
    return { success: true, attempts };
  } catch (err: any) {
    return { success: false, attempts: [], error: err.message };
  }
}
