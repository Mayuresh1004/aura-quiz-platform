"use client";

import { motion } from "framer-motion";
import { Plus, Users, BrainCircuit, Activity, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ScoreDistributionChart, DifficultyTrendLine } from "@/components/AnalyticsCharts";
import { handleGetTeacherDashboardData } from "@/actions/server-actions";
import { Quiz } from "@/models/DatabaseInterfaces";

export default function TeacherDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [scoreLabels, setScoreLabels] = useState<string[]>([]);
  const [scoreData, setScoreData] = useState<number[]>([]);
  const [trendLabels, setTrendLabels] = useState<string[]>([]);
  const [easyData, setEasyData] = useState<number[]>([]);
  const [mediumData, setMediumData] = useState<number[]>([]);
  const [hardData, setHardData] = useState<number[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeQuizzes: 0,
    aiCalibrations: 0,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError("");
      const token =
        typeof window !== "undefined" ? localStorage.getItem("aura_token") ?? undefined : undefined;

      const result = await handleGetTeacherDashboardData(token);
      if (!result.success) {
        setError(result.error || "Failed to load analytics.");
      } else {
        setQuizzes(result.quizzes);
        setScoreLabels(result.scoreLabels);
        setScoreData(result.scoreData);
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

  return (
    <div className="min-h-screen bg-[#020617] p-6 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Teacher Dashboard</h1>
            <p className="text-slate-400 mt-1">Manage quizzes and monitor student AI analytics.</p>
          </div>
          <Link
            href="/teacher/quiz/create"
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white px-5 py-2.5 rounded-xl font-medium transition-colors w-max"
          >
            <Plus className="w-5 h-5" />
            Create Quiz
          </Link>
        </header>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Total Students" value={String(stats.totalStudents)} icon={Users} color="text-sky-400" />
          <StatCard title="Active Quizzes" value={String(stats.activeQuizzes)} icon={Activity} color="text-emerald-400" />
          <StatCard title="AI Calibrations" value={String(stats.aiCalibrations)} icon={BrainCircuit} color="text-purple-400" />
        </div>

        {/* Analytics Charts */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
            <span>Loading teacher analytics...</span>
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6"
          >
            <ScoreDistributionChart
              labels={scoreLabels.length ? scoreLabels : ["No attempts yet"]}
              data={scoreData.length ? scoreData : [0]}
              title="Score Distribution"
            />
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
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Recent Quizzes List */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Your Quizzes</h2>
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="divide-y divide-slate-800/50">
              {quizzes.map((quiz) => (
                <div key={quiz.PK} className="p-6 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
                  <div>
                    <h3 className="text-lg font-medium text-slate-200">{quiz.title}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                      <span>{quiz.timeLimitMinutes} Minutes</span>
                      <span>•</span>
                      <span>{quiz.questions.length} Questions</span>
                    </div>
                  </div>
                  <button className="text-sky-400 font-medium hover:text-sky-300 transition-colors cursor-not-allowed">
                    View Results
                  </button>
                </div>
              ))}
              {quizzes.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  No quizzes found yet. Create your first quiz to start seeing analytics.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string; icon: any; color: string }) {
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
