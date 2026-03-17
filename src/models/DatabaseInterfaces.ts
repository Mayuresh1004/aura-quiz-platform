export type Role = "ADMIN" | "TEACHER" | "STUDENT";

export interface User {
  PK: string; // USER#<id>
  SK: string; // METADATA
  email: string;
  role: Role;
  name: string;
  createdAt: string;
}

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export interface Question {
  id: string; // UUID
  text: string;
  options: string[]; // exactly 4 strings for Multiple Choice
  correctOptionIndex: number;
  difficulty: Difficulty;
  imageUrl?: string;
}

export interface Quiz {
  PK: string; // QUIZ#<id>
  SK: string; // METADATA
  title: string;
  subject: string;
  timeLimitMinutes: number;
  questions: Question[]; // Embedded to save read capacity units
  createdAt: string;
  teacherId: string; // USER#<id>
}

export interface Attempt {
  PK: string; // USER#<studentId>
  SK: string; // ATTEMPT#<quizId>#<timestamp>
  quizId: string;
  score: number;
  totalQuestions: number;
  responses: number[]; // Index of the option selected for each question
  completedAt: string;
}
