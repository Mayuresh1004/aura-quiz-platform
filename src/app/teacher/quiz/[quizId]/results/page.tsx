"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Users, BarChart2, Clock } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { handleGetQuizResults } from "@/actions/server-actions";
import { ScoreDistributionChart, QuestionFailureRateChart } from "@/components/AnalyticsCharts";
import { Attempt, Quiz } from "@/models/DatabaseInterfaces";
import type { ComponentType } from "react";

export default function QuizResultsPage() {
  const params = useParams<{ quizId: string }>();
  const quizId = params?.quizId;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [failureRates, setFailureRates] = useState<{ text: string; failureRate: number }[]>([]);
  const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!quizId) return;
      setIsLoading(true);
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("quickquiz_token") ?? localStorage.getItem("aura_token") ?? undefined
          : undefined;
      const result = await handleGetQuizResults(quizId, token);
      if (!result.success || !result.quiz) {
        setError(result.error || "Failed to load quiz results.");
      } else {
        setQuiz(result.quiz);
        setAttempts(result.attempts);
        setFailureRates(result.failureRates);
      }
      setIsLoading(false);
    };
    load();
  }, [quizId]);

  const avgScore =
    attempts.length > 0
      ? (
          attempts.reduce(
            (s, a) => s + (a.totalQuestions ? (a.score / a.totalQuestions) * 100 : 0),
            0
          ) / attempts.length
        ).toFixed(1)
      : null;

  const passRate =
    attempts.length > 0
      ? Math.round(
          (attempts.filter((a) => a.totalQuestions && a.score / a.totalQuestions >= 0.6).length /
            attempts.length) *
            100
        )
      : null;

  // Enrich attempts with quiz title for chart tooltip
  const attemptsWithTitle = attempts.map((a) => ({ ...a, quizTitle: quiz?.title }));

  return (
    <div className="min-h-screen bg-[#020617] p-6 lg:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex items-start gap-4">
          <Link
            href="/teacher/dashboard"
            className="mt-1 p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              {quiz?.title ?? "Quiz Results"}
            </h1>
            <p className="text-slate-400 mt-1">
              {quiz?.subject} &nbsp;·&nbsp; {quiz?.timeLimitMinutes} min &nbsp;·&nbsp;{" "}
              {quiz?.questions.length} questions
            </p>
          </div>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center py-32 gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
            <span>Loading results…</span>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-4 text-sm text-red-300">
            {error}
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <SummaryCard title="Total Attempts" value={String(attempts.length)} icon={Users} color="text-sky-400" />
              <SummaryCard
                title="Class Avg Score"
                value={avgScore !== null ? `${avgScore}%` : "—"}
                icon={BarChart2}
                color="text-purple-400"
              />
              <SummaryCard
                title="Pass Rate (≥ 60%)"
                value={passRate !== null ? `${passRate}%` : "—"}
                icon={Clock}
                color={passRate !== null && passRate >= 60 ? "text-emerald-400" : "text-red-400"}
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Score distribution — filtered to this quiz */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6"
              >
                <ScoreDistributionChart
                  allAttempts={attemptsWithTitle as Attempt[]}
                  quizzes={quiz ? [quiz] : []}
                />
              </motion.div>

              {/* Question failure rate */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6"
              >
                <h3 className="text-base font-semibold text-slate-100 mb-4">Question Failure Rate</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Bars sorted worst → best. Hover for full question text. Red ≥ 70%, Orange ≥ 40%.
                </p>
                <QuestionFailureRateChart questions={failureRates} />
              </motion.div>
            </div>

            {/* Attempt Table */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Student Attempts</h2>
              {attempts.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-10 text-center text-slate-500">
                  No students have attempted this quiz yet.
                </div>
              ) : (
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-left">
                          <th className="px-6 py-4 font-medium">Student ID</th>
                          <th className="px-6 py-4 font-medium">Score</th>
                          <th className="px-6 py-4 font-medium">Date</th>
                          <th className="px-6 py-4 font-medium">AI Feedback</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {[...attempts]
                          .sort((a, b) => (a.completedAt > b.completedAt ? -1 : 1))
                          .map((attempt, i) => {
                            const pct = attempt.totalQuestions
                              ? Math.round((attempt.score / attempt.totalQuestions) * 100)
                              : 0;
                            const studentId = attempt.PK.replace("USER#", "");
                            const attemptKey = attempt.SK;
                            const isExpanded = expandedFeedback === attemptKey;
                            return (
                              <motion.tr
                                key={attempt.SK}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.04 }}
                                className="hover:bg-slate-800/20 transition-colors align-top"
                              >
                                <td className="px-6 py-4 text-slate-300 font-mono text-xs">
                                  {studentId.slice(0, 12)}…
                                </td>
                                <td className="px-6 py-4">
                                  <span
                                    className={`font-bold ${
                                      pct >= 60 ? "text-emerald-400" : "text-red-400"
                                    }`}
                                  >
                                    {pct}%
                                  </span>
                                  <span className="text-slate-500 ml-1.5 text-xs">
                                    ({attempt.score}/{attempt.totalQuestions})
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-slate-400">
                                  {new Date(attempt.completedAt).toLocaleString()}
                                </td>
                                <td className="px-6 py-4">
                                  {attempt.aiFeedback ? (
                                    <div>
                                      <button
                                        onClick={() =>
                                          setExpandedFeedback(isExpanded ? null : attemptKey)
                                        }
                                        className="text-sky-400 hover:text-sky-300 text-xs font-medium transition-colors"
                                      >
                                        {isExpanded ? "Hide" : "View Feedback"} ↕
                                      </button>
                                      {isExpanded && (
                                        <motion.div
                                          initial={{ opacity: 0, height: 0 }}
                                          animate={{ opacity: 1, height: "auto" }}
                                          className="mt-3 text-xs text-slate-400 leading-relaxed bg-slate-800/50 rounded-lg p-3 max-w-md"
                                        >
                                          {attempt.aiFeedback}
                                        </motion.div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-600 text-xs">—</span>
                                  )}
                                </td>
                              </motion.tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex items-center gap-4"
    >
      <div className={`p-3 rounded-xl bg-slate-800 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-slate-400 text-sm">{title}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
      </div>
    </motion.div>
  );
}
