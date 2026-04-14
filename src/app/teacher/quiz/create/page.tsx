"use client";

import { motion } from "framer-motion";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { handleCreateQuiz } from "@/actions/server-actions";
import { v4 as uuidv4 } from "uuid";
import { Question } from "@/models/DatabaseInterfaces";

export default function CreateQuiz() {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [timeLimit, setTimeLimit] = useState(30);
  const [questions, setQuestions] = useState<Question[]>([
    { id: uuidv4(), text: "", options: ["", "", "", ""], correctOptionIndex: 0, difficulty: "MEDIUM" },
  ]);
  const [loading, setLoading] = useState(false);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { id: uuidv4(), text: "", options: ["", "", "", ""], correctOptionIndex: 0, difficulty: "MEDIUM" },
    ]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length === 1) return;
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const updateQuestionOption = (qIdx: number, optIdx: number, val: string) => {
    const updated = [...questions];
    updated[qIdx].options[optIdx] = val;
    setQuestions(updated);
  };

  const updateQuestionText = (qIdx: number, val: string) => {
    const updated = [...questions];
    updated[qIdx].text = val;
    setQuestions(updated);
  };

  const updateCorrectOption = (qIdx: number, optIdx: number) => {
    const updated = [...questions];
    updated[qIdx].correctOptionIndex = optIdx;
    setQuestions(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Read the Cognito access token saved at login so the server action
    // can resolve the real teacher ID from the JWT.
    const accessToken = typeof window !== "undefined"
      ? localStorage.getItem("aura_token") ?? undefined
      : undefined;

    const result = await handleCreateQuiz(
      {
        title,
        subject,
        timeLimitMinutes: timeLimit,
        questions,
      },
      accessToken
    );

    if (result.success) {
      alert("Quiz successfully saved to DynamoDB!");
      window.location.href = "/teacher/dashboard";
    } else {
      alert("Error saving quiz: " + result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#020617] p-6 lg:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/teacher/dashboard"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Create New Quiz</h1>
              <p className="text-slate-400 mt-1">Configure metadata and add questions.</p>
            </div>
          </div>
        </header>

        <form onSubmit={handleSave} className="space-y-8">
          <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Quiz Title</label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-sky-500/50"
                  placeholder="e.g. Intro to AWS"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Subject Area</label>
                <input
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-sky-500/50"
                  placeholder="e.g. Cloud Computing"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Time Limit (Minutes)</label>
              <input
                type="number"
                min="1"
                required
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                className="w-full max-w-[200px] bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-sky-500/50"
              />
            </div>
          </div>

          <div className="space-y-6">
            {questions.map((q, qIdx) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl relative"
              >
                <button
                  type="button"
                  onClick={() => removeQuestion(q.id)}
                  className="absolute top-6 right-6 p-2 text-slate-500 hover:text-red-400 bg-slate-800/50 rounded-xl transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-medium text-white mb-6">Question {qIdx + 1}</h3>

                <div className="space-y-4">
                  <input
                    required
                    value={q.text}
                    onChange={(e) => updateQuestionText(qIdx, e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-white"
                    placeholder="Enter question text..."
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    {q.options.map((opt, optIdx) => {
                      const isCorrect = q.correctOptionIndex === optIdx;
                      return (
                      <div key={optIdx} className="flex flex-col gap-2">
                        <div className="flex items-center justify-between px-2">
                          <label className={`text-xs font-bold uppercase tracking-wider ${isCorrect ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {isCorrect ? "✓ Correct Answer" : `Option ${optIdx + 1}`}
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="radio"
                              name={`correct-${q.id}`}
                              checked={isCorrect}
                              onChange={() => updateCorrectOption(qIdx, optIdx)}
                              className="w-4 h-4 text-emerald-500 focus:ring-emerald-500/50 bg-slate-900 border-slate-700 cursor-pointer"
                            />
                            <span className="text-xs text-slate-400 group-hover:text-emerald-400 transition-colors">Mark Correct</span>
                          </label>
                        </div>
                        <input
                          required
                          value={opt}
                          onChange={(e) => updateQuestionOption(qIdx, optIdx, e.target.value)}
                          className={`w-full bg-slate-950/50 border rounded-xl px-4 py-3 text-white transition-all ${isCorrect ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : 'border-slate-700'}`}
                          placeholder="Type an answer..."
                        />
                      </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 pt-8 pb-12">
            <button
              type="button"
              onClick={addQuestion}
              className="flex items-center gap-2 text-sky-400 hover:text-sky-300 font-medium bg-sky-500/10 px-6 py-3 rounded-xl transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Question
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-3 rounded-xl font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Quiz to Cloud"}
              <Save className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
