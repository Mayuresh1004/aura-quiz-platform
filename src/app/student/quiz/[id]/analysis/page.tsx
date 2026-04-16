"use client";

import { motion } from "framer-motion";
import { ArrowLeft, BarChart3, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  handleGetQuiz,
  handleGetStudentQuizAnalysis,
  handleListStudentAttempts,
} from "@/actions/server-actions";
import { ScoreDistributionChart, QuestionFailureRateChart } from "@/components/AnalyticsCharts";
import { useAuth } from "@/lib/auth-context";
import { Attempt, Quiz } from "@/models/DatabaseInterfaces";

export default function StudentQuizAnalysisPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const quizId = Array.isArray(id) ? id[0] : id;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [classAttempts, setClassAttempts] = useState<Attempt[]>([]);
  const [studentAttempts, setStudentAttempts] = useState<Attempt[]>([]);
  const [avgScore, setAvgScore] = useState<number>(0);
  const [failureRates, setFailureRates] = useState<{ text: string; failureRate: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!quizId) return;
      setIsLoading(true);
      setError("");

      const [quizResult, analysisResult, studentAttemptsResult] = await Promise.all([
        handleGetQuiz(quizId),
        handleGetStudentQuizAnalysis(quizId),
        user?.id
          ? handleListStudentAttempts(user.id)
          : Promise.resolve({ success: true, attempts: [] as Attempt[] }),
      ]);

      if (!quizResult.quiz) {
        setError(quizResult.error || "Quiz not found.");
        setIsLoading(false);
        return;
      }
      if (!analysisResult.success) {
        setError(analysisResult.error || "Failed to load quiz analysis.");
        setIsLoading(false);
        return;
      }

      setQuiz(quizResult.quiz);
      setClassAttempts(analysisResult.attempts);
      setAvgScore(analysisResult.avgScorePct);
      setFailureRates(analysisResult.failureRates);
      if (studentAttemptsResult.success) {
        setStudentAttempts(
          studentAttemptsResult.attempts
            .filter((attempt) => attempt.quizId === quizId)
            .sort((a, b) => (a.completedAt > b.completedAt ? -1 : 1))
        );
      }
      setIsLoading(false);
    };

    load();
  }, [quizId, user?.id]);

  const bestStudentPct = useMemo(() => {
    if (studentAttempts.length === 0) return null;
    const best = studentAttempts.reduce((top, cur) =>
      cur.score / cur.totalQuestions > top.score / top.totalQuestions ? cur : top
    );
    return Math.round((best.score / best.totalQuestions) * 100);
  }, [studentAttempts]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
          Loading analysis...
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900/40 border border-red-500/30 rounded-2xl p-6 text-center">
          <p className="text-red-300 text-sm">{error || "Could not load this analysis page."}</p>
          <Link
            href="/student/dashboard"
            className="mt-5 inline-block bg-sky-500 hover:bg-sky-400 text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] p-6 lg:p-12">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-start gap-4">
          <Link
            href="/student/dashboard"
            className="mt-1 p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">{quiz.title} Analysis</h1>
            <p className="text-slate-400 mt-1">
              {quiz.subject} · {quiz.questions.length} questions · {studentAttempts.length} your attempt
              {studentAttempts.length !== 1 ? "s" : ""}
            </p>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard title="Class Average" value={`${avgScore}%`} highlight={avgScore >= 60 ? "text-emerald-400" : "text-amber-400"} />
          <MetricCard
            title="Your Best Score"
            value={bestStudentPct !== null ? `${bestStudentPct}%` : "—"}
            highlight={bestStudentPct !== null && bestStudentPct >= 60 ? "text-emerald-400" : "text-red-400"}
          />
          <MetricCard title="Total Class Attempts" value={String(classAttempts.length)} highlight="text-sky-400" />
        </section>

        <section className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-sky-400" />
            <h2 className="text-xl font-semibold text-white">Performance Analysis</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
              <ScoreDistributionChart
                allAttempts={classAttempts.map((attempt) => ({ ...attempt, quizTitle: quiz.title }))}
                quizzes={[quiz]}
              />
            </div>
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-base font-semibold text-slate-100 mb-3">Question Difficulty (Class Failure Rate)</h3>
              <QuestionFailureRateChart questions={failureRates} />
            </div>
          </div>
        </section>

        <section className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Your Attempts & Feedback</h2>
          {studentAttempts.length === 0 ? (
            <p className="text-sm text-slate-500">No attempts found for this quiz.</p>
          ) : (
            <div className="space-y-3">
              {studentAttempts.map((attempt, idx) => {
                const pct = attempt.totalQuestions ? Math.round((attempt.score / attempt.totalQuestions) * 100) : 0;
                return (
                  <motion.div
                    key={attempt.SK}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <span className={`text-lg font-bold ${pct >= 60 ? "text-emerald-400" : "text-red-400"}`}>
                          {pct}%
                        </span>
                        <span className="text-sm text-slate-400">
                          {attempt.score}/{attempt.totalQuestions} correct
                        </span>
                        <span className="text-xs text-slate-600">{new Date(attempt.completedAt).toLocaleString()}</span>
                      </div>
                      <CheckCircle className="w-4 h-4 text-emerald-400/70" />
                    </div>
                    {attempt.aiFeedback && (
                      <div className="mt-3 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
                        {attempt.aiFeedback}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  highlight,
}: {
  title: string;
  value: string;
  highlight: string;
}) {
  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
      <p className="text-xs text-slate-400">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${highlight}`}>{value}</p>
    </div>
  );
}
