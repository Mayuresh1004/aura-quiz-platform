"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Clock, CheckCircle, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

// Mock Data Structure
const mockQuiz = {
  title: "AWS Networking & Security",
  timeLimitMinutes: 20,
  questions: [
    {
      id: "q1",
      text: "Which service is used to create a logically isolated virtual network in AWS?",
      options: ["Amazon S3", "Amazon VPC", "Amazon EC2", "AWS IAM"],
      correctOptionIndex: 1,
    },
    {
      id: "q2",
      text: "What does IAM stand for?",
      options: [
        "Internal Access Management",
        "Identity and Access Management",
        "Internet Application Monitoring",
        "Instance Alert Mechanism",
      ],
      correctOptionIndex: 1,
    },
  ],
};

export default function QuizAttempt() {
  const { id } = useParams();
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [responses, setResponses] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(mockQuiz.timeLimitMinutes * 60);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (isSubmitted || timeLeft <= 0) {
      if (!isSubmitted) handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isSubmitted]);

  const handleSelectOption = (optIndex: number) => {
    const newResponses = [...responses];
    newResponses[currentQuestionIdx] = optIndex;
    setResponses(newResponses);
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    let correct = 0;
    mockQuiz.questions.forEach((q, i) => {
      if (responses[i] === q.correctOptionIndex) correct++;
    });
    setScore(correct);
    
    // Server action to save attempt to DynamoDB and trigger SageMaker update here
  };

  const percentScore = Math.round((score / mockQuiz.questions.length) * 100);

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl max-w-md w-full text-center"
        >
          <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-2">Quiz Completed!</h2>
          <p className="text-slate-400 mb-8">Your results have been securely recorded.</p>
          
          <div className="bg-slate-950/50 p-6 rounded-2xl mb-8">
            <p className="text-sm font-medium text-slate-400 mb-1">Final Score</p>
            <p className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-sky-400">
              {percentScore}%
            </p>
            <p className="text-sm text-slate-400 mt-2">
              {score} out of {mockQuiz.questions.length} correct
            </p>
          </div>

          <Link
            href="/student/dashboard"
            className="block w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Return to Dashboard
          </Link>
        </motion.div>
      </div>
    );
  }

  const currentQuestion = mockQuiz.questions[currentQuestionIdx];

  return (
    <div className="min-h-screen bg-[#020617] p-6 lg:p-12">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/50 border border-slate-800 p-4 rounded-full mb-8 px-6">
          <h1 className="text-lg font-semibold text-white">{mockQuiz.title}</h1>
          <div className="flex items-center gap-2 text-amber-400 font-mono text-xl bg-amber-400/10 px-4 py-1.5 rounded-full">
            <Clock className="w-5 h-5" />
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
          </div>
        </header>

        <motion.div
          key={currentQuestionIdx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl"
        >
          <div className="mb-8 flex items-center justify-between">
            <span className="text-sm font-medium text-sky-400 uppercase tracking-wider">
              Question {currentQuestionIdx + 1} of {mockQuiz.questions.length}
            </span>
          </div>

          <h2 className="text-2xl font-medium text-white mb-8 leading-relaxed">{currentQuestion.text}</h2>

          <div className="space-y-4 mb-12">
            {currentQuestion.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSelectOption(i)}
                className={`w-full text-left p-5 rounded-2xl border transition-all ${
                  responses[currentQuestionIdx] === i
                    ? "bg-sky-500/20 border-sky-500 shadow-[0_0_15px_rgba(56,189,248,0.2)]"
                    : "bg-slate-950/40 border-slate-800 hover:border-slate-600 hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-medium border ${
                      responses[currentQuestionIdx] === i
                        ? "bg-sky-500 text-white border-transparent"
                        : "text-slate-400 border-slate-700 font-mono"
                    }`}
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className={`text-lg ${responses[currentQuestionIdx] === i ? "text-white" : "text-slate-300"}`}>
                    {opt}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-800">
            <button
              onClick={() => setCurrentQuestionIdx((p) => Math.max(0, p - 1))}
              disabled={currentQuestionIdx === 0}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Previous
            </button>

            {currentQuestionIdx === mockQuiz.questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-3 rounded-xl font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)]"
              >
                Submit Quiz
                <CheckCircle className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestionIdx((p) => Math.min(mockQuiz.questions.length - 1, p + 1))}
                className="flex items-center gap-2 bg-white hover:bg-slate-200 text-slate-950 px-8 py-3 rounded-xl font-bold transition-colors"
              >
                Next
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
