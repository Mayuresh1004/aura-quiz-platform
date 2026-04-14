"use client";

import { motion } from "framer-motion";
import { PlayCircle, Clock, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { handleListQuizzes, handleListStudentAttempts } from "@/actions/server-actions";
import { useAuth } from "@/lib/auth-context";
import { Quiz, Attempt } from "@/models/DatabaseInterfaces";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"AVAILABLE" | "COMPLETED">("AVAILABLE");

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch available quizzes and this student's past attempts from DynamoDB
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [quizzesResult, attemptsResult] = await Promise.all([
        handleListQuizzes(),
        user?.email
          ? handleListStudentAttempts(user.email)
          : Promise.resolve({ success: true, attempts: [] }),
      ]);

      if (quizzesResult.success) setQuizzes(quizzesResult.quizzes);
      if (attemptsResult.success) setAttempts(attemptsResult.attempts);
      setIsLoading(false);
    };
    fetchData();
  }, [user]);

  // Build a map of quizId -> best attempt for easy lookup
  const attemptMap = attempts.reduce<Record<string, Attempt>>((acc, a) => {
    const quizId = a.quizId;
    if (!acc[quizId] || a.score > acc[quizId].score) {
      acc[quizId] = a;
    }
    return acc;
  }, {});

  const completedQuizIds = new Set(Object.keys(attemptMap));

  const availableQuizzes = quizzes.filter((q) => {
    const quizId = q.PK.split("#")[1];
    return !completedQuizIds.has(quizId);
  });

  const completedQuizzes = quizzes.filter((q) => {
    const quizId = q.PK.split("#")[1];
    return completedQuizIds.has(quizId);
  });

  const displayList = activeTab === "AVAILABLE" ? availableQuizzes : completedQuizzes;

  return (
    <div className="min-h-screen bg-[#020617] p-6 lg:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-white tracking-tight">Student Dashboard</h1>
          <p className="text-slate-400 mt-1">
            {user ? `Welcome back, ${user.email.split("@")[0]}!` : "Ready to test your knowledge?"}
          </p>
        </header>

        <div className="flex gap-4 border-b border-slate-800">
          <button
            onClick={() => setActiveTab("AVAILABLE")}
            className={`pb-4 px-2 font-medium transition-colors relative ${
              activeTab === "AVAILABLE" ? "text-sky-400" : "text-slate-400 hover:text-slate-300"
            }`}
          >
            Available Quizzes
            {activeTab === "AVAILABLE" && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-t-full"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab("COMPLETED")}
            className={`pb-4 px-2 font-medium transition-colors relative ${
              activeTab === "COMPLETED" ? "text-sky-400" : "text-slate-400 hover:text-slate-300"
            }`}
          >
            Completed
            {completedQuizIds.size > 0 && (
              <span className="ml-2 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                {completedQuizIds.size}
              </span>
            )}
            {activeTab === "COMPLETED" && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-t-full"
              />
            )}
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
            <span>Loading quizzes...</span>
          </div>
        ) : (
          <div className="grid gap-4">
            {displayList.map((quiz, i) => {
              const quizId = quiz.PK.split("#")[1];
              const attempt = attemptMap[quizId];
              const percentScore = attempt
                ? Math.round((attempt.score / attempt.totalQuestions) * 100)
                : null;

              return (
                <motion.div
                  key={quiz.PK}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition-colors"
                >
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">{quiz.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {quiz.timeLimitMinutes} Min
                      </span>
                      <span>•</span>
                      <span>{quiz.questions.length} Questions</span>
                      <span>•</span>
                      <span className="text-slate-500">{quiz.subject}</span>
                    </div>
                  </div>

                  {activeTab === "AVAILABLE" ? (
                    <Link
                      href={`/student/quiz/${quizId}`}
                      className="flex items-center justify-center gap-2 bg-sky-500/10 text-sky-400 border border-sky-500/20 px-6 py-2.5 rounded-xl font-semibold hover:bg-sky-500 hover:text-white transition-all w-full sm:w-auto"
                    >
                      <PlayCircle className="w-5 h-5" />
                      Start Attempt
                    </Link>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-slate-400 font-medium">Score</p>
                        <p className={`text-2xl font-bold ${percentScore !== null && percentScore >= 60 ? "text-emerald-400" : "text-red-400"}`}>
                          {percentScore !== null ? `${percentScore}%` : "—"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {attempt ? `${attempt.score}/${attempt.totalQuestions} correct` : ""}
                        </p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-emerald-500/50" />
                    </div>
                  )}
                </motion.div>
              );
            })}

            {displayList.length === 0 && (
              <div className="text-center py-16 text-slate-500">
                {activeTab === "AVAILABLE"
                  ? "No quizzes available right now. Check back later!"
                  : "You haven't completed any quizzes yet. Start one above!"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
