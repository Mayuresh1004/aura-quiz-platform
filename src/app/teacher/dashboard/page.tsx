"use client";

import { motion } from "framer-motion";
import { Plus, Users, BrainCircuit, Activity } from "lucide-react";
import Link from "next/link";
import { ScoreDistributionChart, DifficultyTrendLine } from "@/components/AnalyticsCharts";

export default function TeacherDashboard() {
  // Mock data for demonstration of Chart.js & Analytics
  const scoreLabels = ["0-20%", "21-40%", "41-60%", "61-80%", "81-100%"];
  const scoreData = [2, 5, 12, 28, 15]; // Number of students in each bucket

  const trendLabels = ["Quiz 1", "Quiz 2", "Quiz 3", "Quiz 4", "Quiz 5"];
  const easyData = [40, 35, 30, 25, 20]; // Percentage of questions tagged easy
  const mediumData = [45, 45, 50, 55, 60];
  const hardData = [15, 20, 20, 20, 20];

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
          <StatCard title="Total Students" value="142" icon={Users} color="text-sky-400" />
          <StatCard title="Active Quizzes" value="8" icon={Activity} color="text-emerald-400" />
          <StatCard title="AI Calibrations" value="1,204" icon={BrainCircuit} color="text-purple-400" />
        </div>

        {/* Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6"
          >
            <ScoreDistributionChart labels={scoreLabels} data={scoreData} title="Latest Quiz Score Distribution" />
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

        {/* Recent Quizzes List */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Your Quizzes</h2>
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="divide-y divide-slate-800/50">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
                  <div>
                    <h3 className="text-lg font-medium text-slate-200">Introduction to Cloud Computing</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                      <span>45 Minutes</span>
                      <span>•</span>
                      <span>20 Questions</span>
                    </div>
                  </div>
                  <button className="text-sky-400 font-medium hover:text-sky-300 transition-colors">
                    View Results
                  </button>
                </div>
              ))}
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
