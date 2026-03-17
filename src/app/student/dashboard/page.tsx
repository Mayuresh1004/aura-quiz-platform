"use client";

import { motion } from "framer-motion";
import { PlayCircle, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState<"AVAILABLE" | "COMPLETED">("AVAILABLE");

  const quizzes = [
    {
      id: "q1",
      title: "Cloud Computing Basics",
      duration: "30 Min",
      questions: 15,
      status: "AVAILABLE",
    },
    {
      id: "q2",
      title: "AWS Networking & Security",
      duration: "45 Min",
      questions: 20,
      status: "AVAILABLE",
    },
    {
      id: "q3",
      title: "Intro to DynamoDB",
      duration: "15 Min",
      questions: 10,
      status: "COMPLETED",
      score: "80%",
    },
  ];

  return (
    <div className="min-h-screen bg-[#020617] p-6 lg:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-white tracking-tight">Student Dashboard</h1>
          <p className="text-slate-400 mt-1">Ready to test your knowledge?</p>
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
            {activeTab === "COMPLETED" && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-t-full"
              />
            )}
          </button>
        </div>

        <div className="grid gap-4">
          {quizzes
            .filter((q) => q.status === activeTab)
            .map((quiz, i) => (
              <motion.div
                key={quiz.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition-colors"
              >
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{quiz.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {quiz.duration}
                    </span>
                    <span>•</span>
                    <span>{quiz.questions} Questions</span>
                  </div>
                </div>

                {quiz.status === "AVAILABLE" ? (
                  <Link
                    href={`/student/quiz/${quiz.id}`}
                    className="flex items-center justify-center gap-2 bg-sky-500/10 text-sky-400 border border-sky-500/20 px-6 py-2.5 rounded-xl font-semibold hover:bg-sky-500 hover:text-white transition-all w-full sm:w-auto"
                  >
                    <PlayCircle className="w-5 h-5" />
                    Start Attempt
                  </Link>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-slate-400 font-medium">Score</p>
                      <p className="text-2xl font-bold text-emerald-400">{quiz.score}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-emerald-500/50" />
                  </div>
                )}
              </motion.div>
            ))}

          {quizzes.filter((q) => q.status === activeTab).length === 0 && (
            <div className="text-center py-12 text-slate-500">No quizzes found in this category.</div>
          )}
        </div>
      </div>
    </div>
  );
}
