"use client";

import { motion } from "framer-motion";
import { PlayCircle, Clock, CheckCircle, Loader2, Search, ChevronDown, ChevronUp, MessageSquareText, Calendar } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { handleListQuizzes, handleListStudentAttempts } from "@/actions/server-actions";
import { useAuth } from "@/lib/auth-context";
import { Quiz, Attempt } from "@/models/DatabaseInterfaces";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"AVAILABLE" | "COMPLETED">("AVAILABLE");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedAttemptHistory, setExpandedAttemptHistory] = useState<string | null>(null);
  const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [quizzesResult, attemptsResult] = await Promise.all([
        handleListQuizzes(),
        user?.id
          ? handleListStudentAttempts(user.id)
          : Promise.resolve({ success: true, attempts: [] }),
      ]);
      if (quizzesResult.success) setQuizzes(quizzesResult.quizzes);
      if (attemptsResult.success) setAttempts(attemptsResult.attempts);
      setIsLoading(false);
    };
    fetchData();
  }, [user]);

  // Group all attempts by quizId (support multiple attempts per quiz)
  const attemptsByQuiz = useMemo(() => {
    const map: Record<string, Attempt[]> = {};
    for (const a of attempts) {
      if (!map[a.quizId]) map[a.quizId] = [];
      map[a.quizId].push(a);
    }
    // Sort each group newest first
    Object.values(map).forEach((arr) => arr.sort((a, b) => (a.completedAt > b.completedAt ? -1 : 1)));
    return map;
  }, [attempts]);

  // Best attempt per quiz (for score display in the completed card header)
  const bestAttemptByQuiz = useMemo(() => {
    const map: Record<string, Attempt> = {};
    for (const [quizId, arr] of Object.entries(attemptsByQuiz)) {
      map[quizId] = arr.reduce((best, a) =>
        a.score / a.totalQuestions > best.score / best.totalQuestions ? a : best
      );
    }
    return map;
  }, [attemptsByQuiz]);

  const completedQuizIds = new Set(Object.keys(attemptsByQuiz));

  const availableQuizzes = quizzes.filter((q) => {
    const quizId = q.PK.split("#")[1];
    return !completedQuizIds.has(quizId);
  });

  const completedQuizzes = quizzes.filter((q) => {
    const quizId = q.PK.split("#")[1];
    return completedQuizIds.has(quizId);
  });

  const displayList = activeTab === "AVAILABLE" ? availableQuizzes : completedQuizzes;

  const filteredList = useMemo(
    () =>
      displayList.filter(
        (q) =>
          q.title.toLowerCase().includes(search.toLowerCase()) ||
          q.subject.toLowerCase().includes(search.toLowerCase())
      ),
    [displayList, search]
  );

  return (
    <div className="min-h-screen bg-[#020617] p-6 lg:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-white tracking-tight">Student Dashboard</h1>
          <p className="text-slate-400 mt-1">
            {user ? `Welcome back, ${user.email.split("@")[0]}!` : "Ready to test your knowledge?"}
          </p>
        </header>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            id="student-quiz-search"
            type="text"
            placeholder="Search quizzes by title or subject…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 placeholder:text-slate-500 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-slate-800">
          <TabButton
            label="Available Quizzes"
            active={activeTab === "AVAILABLE"}
            onClick={() => setActiveTab("AVAILABLE")}
            badge={availableQuizzes.length > 0 ? availableQuizzes.length : undefined}
            badgeColor="sky"
          />
          <TabButton
            label="Completed"
            active={activeTab === "COMPLETED"}
            onClick={() => setActiveTab("COMPLETED")}
            badge={completedQuizIds.size > 0 ? completedQuizIds.size : undefined}
            badgeColor="emerald"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
            <span>Loading quizzes…</span>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredList.map((quiz, i) => {
              const quizId = quiz.PK.split("#")[1];
              const bestAttempt = bestAttemptByQuiz[quizId];
              const allAttempts = attemptsByQuiz[quizId] || [];
              const bestPct = bestAttempt
                ? Math.round((bestAttempt.score / bestAttempt.totalQuestions) * 100)
                : null;
              const isHistoryExpanded = expandedAttemptHistory === quizId;

              return (
                <motion.div
                  key={quiz.PK}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="bg-slate-900/40 border border-slate-800 rounded-2xl hover:border-slate-700 transition-colors"
                >
                  {/* Main quiz row */}
                  <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-xl font-semibold text-white mb-2 truncate">{quiz.title}</h3>
                      <div className="flex items-center flex-wrap gap-3 text-sm text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          {quiz.timeLimitMinutes} Min
                        </span>
                        <span>•</span>
                        <span>{quiz.questions.length} Questions</span>
                        <span>•</span>
                        <span className="text-slate-500">{quiz.subject}</span>
                        {quiz.dueAt && (
                          <>
                            <span>•</span>
                            <span className={`flex items-center gap-1 ${new Date(quiz.dueAt) < new Date() ? "text-red-400" : "text-amber-400"}`}>
                              <Calendar className="w-3.5 h-3.5" />
                              Due {new Date(quiz.dueAt).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {activeTab === "AVAILABLE" ? (
                      <Link
                        href={`/student/quiz/${quizId}`}
                        className="flex items-center justify-center gap-2 bg-sky-500/10 text-sky-400 border border-sky-500/20 px-6 py-2.5 rounded-xl font-semibold hover:bg-sky-500 hover:text-white transition-all w-full sm:w-auto shrink-0"
                      >
                        <PlayCircle className="w-5 h-5" />
                        Start Attempt
                      </Link>
                    ) : (
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-slate-400 font-medium">Best Score</p>
                          <p
                            className={`text-2xl font-bold ${
                              bestPct !== null && bestPct >= 60 ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {bestPct !== null ? `${bestPct}%` : "—"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {bestAttempt
                              ? `${bestAttempt.score}/${bestAttempt.totalQuestions} correct`
                              : ""}
                          </p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-emerald-500/50" />
                      </div>
                    )}
                  </div>

                  {/* Attempt history (Completed tab only) */}
                  {activeTab === "COMPLETED" && (
                    <div className="border-t border-slate-800/70">
                      <button
                        onClick={() =>
                          setExpandedAttemptHistory(isHistoryExpanded ? null : quizId)
                        }
                        className="w-full flex items-center justify-between px-6 py-3 text-xs text-slate-400 hover:text-slate-300 transition-colors"
                      >
                        <span>
                          {allAttempts.length} attempt{allAttempts.length !== 1 ? "s" : ""} — view history
                        </span>
                        {isHistoryExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      {isHistoryExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="px-6 pb-4 space-y-3"
                        >
                          {allAttempts.map((attempt) => {
                            const pct = attempt.totalQuestions
                              ? Math.round((attempt.score / attempt.totalQuestions) * 100)
                              : 0;
                            const isFeedbackOpen = expandedFeedback === attempt.SK;
                            return (
                              <div
                                key={attempt.SK}
                                className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-4 text-sm">
                                    <span
                                      className={`text-lg font-bold ${
                                        pct >= 60 ? "text-emerald-400" : "text-red-400"
                                      }`}
                                    >
                                      {pct}%
                                    </span>
                                    <span className="text-slate-400">
                                      {attempt.score}/{attempt.totalQuestions} correct
                                    </span>
                                    <span className="text-slate-600 text-xs">
                                      {new Date(attempt.completedAt).toLocaleString()}
                                    </span>
                                  </div>
                                  {attempt.aiFeedback && (
                                    <button
                                      onClick={() =>
                                        setExpandedFeedback(isFeedbackOpen ? null : attempt.SK)
                                      }
                                      className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
                                    >
                                      <MessageSquareText className="w-3.5 h-3.5" />
                                      {isFeedbackOpen ? "Hide" : "AI Feedback"}
                                    </button>
                                  )}
                                </div>
                                {isFeedbackOpen && attempt.aiFeedback && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    className="mt-3 p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg text-xs text-slate-300 leading-relaxed whitespace-pre-wrap"
                                  >
                                    {attempt.aiFeedback}
                                  </motion.div>
                                )}
                              </div>
                            );
                          })}
                        </motion.div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}

            {filteredList.length === 0 && (
              <div className="text-center py-16 text-slate-500">
                {search
                  ? "No quizzes match your search."
                  : activeTab === "AVAILABLE"
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

function TabButton({
  label,
  active,
  onClick,
  badge,
  badgeColor,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
  badgeColor: "sky" | "emerald";
}) {
  const badgeClasses =
    badgeColor === "sky"
      ? "bg-sky-500/20 text-sky-400 border-sky-500/30"
      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";

  return (
    <button
      onClick={onClick}
      className={`pb-4 px-2 font-medium transition-colors relative flex items-center gap-2 ${
        active ? "text-sky-400" : "text-slate-400 hover:text-slate-300"
      }`}
    >
      {label}
      {badge !== undefined && (
        <span className={`text-xs border px-2 py-0.5 rounded-full ${badgeClasses}`}>
          {badge}
        </span>
      )}
      {active && (
        <motion.div
          layoutId="activeTab"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-t-full"
        />
      )}
    </button>
  );
}
