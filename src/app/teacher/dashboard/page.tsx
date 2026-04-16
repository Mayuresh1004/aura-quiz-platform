"use client";

import { motion } from "framer-motion";
import { Plus, Users, TrendingUp, Activity, Loader2, Search, ExternalLink, LogOut } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import type { ComponentType } from "react";
import {
  ScoreDistributionChart,
  DifficultyTrendLine,
  AvgScorePerQuizChart,
} from "@/components/AnalyticsCharts";
import { handleGetTeacherDashboardData } from "@/actions/server-actions";
import { Quiz, Attempt } from "@/models/DatabaseInterfaces";
import { useAuth } from "@/lib/auth-context";

export default function TeacherDashboard() {
  const { logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [trendLabels, setTrendLabels] = useState<string[]>([]);
  const [easyData, setEasyData] = useState<number[]>([]);
  const [mediumData, setMediumData] = useState<number[]>([]);
  const [hardData, setHardData] = useState<number[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeQuizzes: 0,
    avgPassRate: 0,
  });
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError("");
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("quickquiz_token") ?? localStorage.getItem("aura_token") ?? undefined
          : undefined;

      const result = await handleGetTeacherDashboardData(token);
      if (!result.success) {
        const errorMessage = "error" in result ? result.error : undefined;
        setError(errorMessage || "Failed to load analytics.");
      } else {
        setQuizzes(result.quizzes);
        setAttempts(result.attempts);
        setTrendLabels(result.trendLabels);
        setEasyData(result.easyData);
        setMediumData(result.mediumData);
        setHardData(result.hardData);
        setStats(result.stats);
      }
      setIsLoading(false);
    };

    fetchDashboardData();
  }, []);

  // Per-quiz attempt count badge
  const attemptCountByQuiz = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of attempts) {
      map[a.quizId] = (map[a.quizId] || 0) + 1;
    }
    return map;
  }, [attempts]);

  const filteredQuizzes = useMemo(
    () =>
      quizzes.filter((q) =>
        q.title.toLowerCase().includes(search.toLowerCase()) ||
        q.subject.toLowerCase().includes(search.toLowerCase())
      ),
    [quizzes, search]
  );

  return (
    <div className="min-h-screen bg-[#020617] p-6 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Teacher Dashboard</h1>
            <p className="text-slate-400 mt-1">Manage quizzes and monitor student performance.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/teacher/quiz/create"
              className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white px-5 py-2.5 rounded-xl font-medium transition-colors w-max"
            >
              <Plus className="w-5 h-5" />
              Create Quiz
            </Link>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-2 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 px-4 py-2.5 rounded-xl font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </header>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Total Students" value={String(stats.totalStudents)} icon={Users} color="text-sky-400" />
          <StatCard title="Active Quizzes" value={String(stats.activeQuizzes)} icon={Activity} color="text-emerald-400" />
          <StatCard
            title="Avg Pass Rate"
            value={`${stats.avgPassRate}%`}
            icon={TrendingUp}
            color="text-purple-400"
          />
        </div>

        {/* Analytics Charts */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
            <span>Loading analytics…</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6"
              >
                <ScoreDistributionChart allAttempts={attempts} quizzes={quizzes} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6"
              >
                <DifficultyTrendLine
                  labels={trendLabels}
                  easyData={easyData}
                  mediumData={mediumData}
                  hardData={hardData}
                />
              </motion.div>
            </div>

            {/* Avg Score Per Quiz — full width */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <AvgScorePerQuizChart quizzes={quizzes} allAttempts={attempts} />
            </motion.div>
          </>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Recent Quizzes List */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-semibold text-white">Your Quizzes</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                id="quiz-search"
                type="text"
                placeholder="Search by title or subject…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 placeholder:text-slate-500 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 w-full sm:w-64"
              />
            </div>
          </div>
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="divide-y divide-slate-800/50">
              {filteredQuizzes.map((quiz) => {
                const quizId = quiz.PK.split("#")[1];
                const count = attemptCountByQuiz[quizId] || 0;
                return (
                  <div
                    key={quiz.PK}
                    className="p-6 flex items-center justify-between hover:bg-slate-800/20 transition-colors gap-4"
                  >
                    <div className="min-w-0">
                      <h3 className="text-lg font-medium text-slate-200 truncate">{quiz.title}</h3>
                      <div className="flex items-center flex-wrap gap-3 mt-2 text-sm text-slate-400">
                        <span>{quiz.timeLimitMinutes} Min</span>
                        <span>•</span>
                        <span>{quiz.questions.length} Questions</span>
                        <span>•</span>
                        <span className="text-slate-500">{quiz.subject}</span>
                        {count > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-sky-400 font-medium">{count} attempt{count !== 1 ? "s" : ""}</span>
                          </>
                        )}
                        {quiz.dueAt && (
                          <>
                            <span>•</span>
                            <span className="text-amber-400">
                              Due {new Date(quiz.dueAt).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/teacher/quiz/${quizId}/results`}
                      className="flex items-center gap-1.5 text-sky-400 font-medium hover:text-sky-300 transition-colors shrink-0 text-sm"
                    >
                      View Results
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                );
              })}
              {filteredQuizzes.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  {quizzes.length === 0
                    ? "No quizzes yet. Create your first quiz to see analytics."
                    : "No quizzes match your search."}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
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
      <div className={`p-4 rounded-xl bg-slate-800 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h3 className="text-slate-400 text-sm font-medium">{title}</h3>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
      </div>
    </motion.div>
  );
}
