"use server";

import { registerUser, loginUser, confirmUser } from "../lib/auth-service";
import {
  saveQuiz,
  saveAttempt,
  getQuiz,
  listQuizzes,
  listAllAttempts,
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
    return "";
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
    // If this secondary write fails, keep the Cognito signup successful so the user can verify.
    try {
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
    } catch (dbErr: any) {
      console.error("Dynamo write failed after Cognito signup:", dbErr);
      return {
        success: true,
        warning:
          "Account created in Cognito, but profile write to DynamoDB failed. Please verify your account and then fix DynamoDB IAM/table schema.",
      };
    }

    return { success: true };
  } catch (err: any) {
    // If the user already exists in Cognito, allow them to move to verification flow.
    if (err?.name === "UsernameExistsException") {
      return {
        success: true,
        warning:
          "User already exists. If not verified yet, please enter the verification code sent to your email.",
      };
    }

    const details = [err?.name, err?.message].filter(Boolean).join(": ");
    console.error("Register failed:", err);
    return { success: false, error: details || "Registration failed." };
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
    if (!accessToken) {
      return { success: false, error: "Authentication required to create quizzes." };
    }

    const teacherUserId = extractUserIdFromToken(accessToken);
    if (!teacherUserId) {
      return { success: false, error: "Invalid access token." };
    }

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

/**
 * Computes teacher dashboard analytics from live DynamoDB quiz/attempt data.
 */
export async function handleGetTeacherDashboardData(accessToken?: string) {
  try {
    if (!accessToken) {
      return {
        success: false,
        error: "Authentication required.",
        quizzes: [],
        scoreLabels: [],
        scoreData: [],
        trendLabels: [],
        easyData: [],
        mediumData: [],
        hardData: [],
        stats: { totalStudents: 0, activeQuizzes: 0, aiCalibrations: 0 },
      };
    }

    const teacherId = extractUserIdFromToken(accessToken);
    const allQuizzes = await listQuizzes();
    const teacherQuizzes = allQuizzes.filter(
      (quiz) => quiz.teacherId === `USER#${teacherId}`
    );

    const allAttempts = await listAllAttempts();
    const teacherQuizIds = new Set(teacherQuizzes.map((q) => q.PK.split("#")[1]));
    const attempts = allAttempts.filter((a) => teacherQuizIds.has(a.quizId));

    const scoreBuckets = [0, 0, 0, 0, 0];
    for (const attempt of attempts) {
      if (!attempt.totalQuestions) continue;
      const percent = Math.round((attempt.score / attempt.totalQuestions) * 100);
      if (percent <= 20) scoreBuckets[0]++;
      else if (percent <= 40) scoreBuckets[1]++;
      else if (percent <= 60) scoreBuckets[2]++;
      else if (percent <= 80) scoreBuckets[3]++;
      else scoreBuckets[4]++;
    }

    const latestQuizzes = [...teacherQuizzes]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 5)
      .reverse();

    const trendLabels = latestQuizzes.map(
      (q, idx) => q.title || `Quiz ${idx + 1}`
    );

    const easyData = latestQuizzes.map((q) =>
      q.questions.length
        ? Math.round(
            (q.questions.filter((ques) => ques.difficulty === "EASY").length /
              q.questions.length) *
              100
          )
        : 0
    );
    const mediumData = latestQuizzes.map((q) =>
      q.questions.length
        ? Math.round(
            (q.questions.filter((ques) => ques.difficulty === "MEDIUM").length /
              q.questions.length) *
              100
          )
        : 0
    );
    const hardData = latestQuizzes.map((q) =>
      q.questions.length
        ? Math.round(
            (q.questions.filter((ques) => ques.difficulty === "HARD").length /
              q.questions.length) *
              100
          )
        : 0
    );

    const uniqueStudents = new Set(attempts.map((a) => a.PK));
    const aiCalibrations = attempts.reduce(
      (sum, attempt) => sum + (attempt.totalQuestions || 0),
      0
    );

    return {
      success: true,
      quizzes: teacherQuizzes.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
      scoreLabels: ["0-20%", "21-40%", "41-60%", "61-80%", "81-100%"],
      scoreData: scoreBuckets,
      trendLabels,
      easyData,
      mediumData,
      hardData,
      stats: {
        totalStudents: uniqueStudents.size,
        activeQuizzes: teacherQuizzes.length,
        aiCalibrations,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      quizzes: [],
      scoreLabels: [],
      scoreData: [],
      trendLabels: [],
      easyData: [],
      mediumData: [],
      hardData: [],
      stats: { totalStudents: 0, activeQuizzes: 0, aiCalibrations: 0 },
    };
  }
}
