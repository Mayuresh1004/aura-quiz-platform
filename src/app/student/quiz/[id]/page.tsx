"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Clock, CheckCircle, ArrowRight, ArrowLeft, Loader2, AlertTriangle, BarChart3 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { handleGetQuiz, handleQuizSubmission, handleGetStudentQuizAnalysis } from "@/actions/server-actions";
import { Attempt, Quiz } from "@/models/DatabaseInterfaces";
import { useAuth } from "@/lib/auth-context";
import { ScoreDistributionChart, QuestionFailureRateChart } from "@/components/AnalyticsCharts";

export default function QuizAttempt() {
  const { id } = useParams();
  const { user } = useAuth();
  const quizId = Array.isArray(id) ? id[0] : id;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(true);
  const [quizError, setQuizError] = useState("");

  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [responses, setResponses] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiFeedback, setAiFeedback] = useState("");
  const [analysisAttempts, setAnalysisAttempts] = useState<Attempt[]>([]);
  const [analysisAvgScore, setAnalysisAvgScore] = useState<number | null>(null);
  const [analysisFailureRates, setAnalysisFailureRates] = useState<
    { text: string; failureRate: number }[]
  >([]);
  const [analysisError, setAnalysisError] = useState("");

  // Fetch quiz from DynamoDB on mount
  useEffect(() => {
    if (!quizId) return;
    const fetchQuiz = async () => {
      setIsLoadingQuiz(true);
      try {
        const result = await handleGetQuiz(quizId);
        if (result.quiz) {
          setQuiz(result.quiz);
          setTimeLeft(result.quiz.timeLimitMinutes * 60);
        } else {
          setQuizError(result.error || "Quiz not found.");
        }
      } catch {
        setQuizError("Failed to load quiz. Please try again.");
      } finally {
        setIsLoadingQuiz(false);
      }
    };
    fetchQuiz();
  }, [quizId]);

  // Countdown timer — only runs after quiz is loaded and before submission
  useEffect(() => {
    if (!quiz || isSubmitted || timeLeft <= 0) {
      if (quiz && !isSubmitted && timeLeft === 0 && quiz.timeLimitMinutes > 0) {
        handleSubmit(responses);
      }
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isSubmitted, quiz]);

  const handleSelectOption = (optIndex: number) => {
    const newResponses = [...responses];
    newResponses[currentQuestionIdx] = optIndex;
    setResponses(newResponses);
  };

  const handleSubmit = async (finalResponses: number[]) => {
    if (!quiz || isSubmitted) return;
    setIsSubmitted(true);
    setIsSubmitting(true);

    // Calculate score client-side for instant display
    let correct = 0;
    quiz.questions.forEach((q, i) => {
      if (finalResponses[i] === q.correctOptionIndex) correct++;
    });
    setScore(correct);

    // Persist to DynamoDB and trigger SageMaker AI difficulty update
    const studentId = user?.id;
    if (!studentId) {
      setIsSubmitting(false);
      setQuizError("Session expired. Please log in again.");
      return;
    }
    const attempt = {
      PK: `USER#${studentId}`,
      SK: `ATTEMPT#${quizId}#${new Date().toISOString()}`,
      quizId: quizId!,
      score: correct,
      totalQuestions: quiz.questions.length,
      responses: finalResponses,
      completedAt: new Date().toISOString(),
    };

    const result = await handleQuizSubmission(attempt);
    if (result.success && result.feedback) {
      setAiFeedback(result.feedback);
    }
    if (result.success && result.analytics) {
      setAnalysisAttempts(result.analytics.attempts);
      setAnalysisAvgScore(result.analytics.avgScorePct);
      setAnalysisFailureRates(result.analytics.failureRates);
      setAnalysisError("");
    } else if (quizId) {
      // Fallback fetch in case analytics payload is missing.
      const analysisResult = await handleGetStudentQuizAnalysis(quizId);
      if (analysisResult.success) {
        setAnalysisAttempts(analysisResult.attempts);
        setAnalysisAvgScore(analysisResult.avgScorePct);
        setAnalysisFailureRates(analysisResult.failureRates);
        setAnalysisError("");
      } else {
        setAnalysisError(analysisResult.error || "Failed to load analysis.");
      }
    }
    setIsSubmitting(false);
  };

  // --- Loading / Error states ---
  if (isLoadingQuiz) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin text-sky-400" />
          <p className="text-lg font-medium">Loading Quiz...</p>
        </div>
      </div>
    );
  }

  if (quizError || !quiz) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
        <div className="bg-slate-900/50 border border-red-500/30 p-8 rounded-3xl max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Quiz Not Found</h2>
          <p className="text-slate-400 mb-6">{quizError}</p>
          <Link
            href="/student/dashboard"
            className="block w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const percentScore = Math.round((score / quiz.questions.length) * 100);

  // --- Results screen ---
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#020617] p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-5xl mx-auto space-y-6"
        >
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl text-center">
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-white mb-2">Quiz Completed!</h2>
            <p className="text-slate-400 mb-8">
              {isSubmitting
                ? "Saving your results securely..."
                : "Your results have been securely recorded."}
            </p>

            <div className="bg-slate-950/50 p-6 rounded-2xl mb-8">
              <p className="text-sm font-medium text-slate-400 mb-1">Final Score</p>
              <p className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-sky-400">
                {percentScore}%
              </p>
              <p className="text-sm text-slate-400 mt-2">
                {score} out of {quiz.questions.length} correct
              </p>
              {analysisAvgScore !== null && (
                <p className="text-sm mt-3 text-slate-300">
                  Class average:{" "}
                  <span className={analysisAvgScore >= 60 ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                    {analysisAvgScore}%
                  </span>
                </p>
              )}
            </div>

            {!!aiFeedback && (
              <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-2xl mb-8 text-left">
                <p className="text-xs uppercase tracking-wider text-sky-400 mb-2">
                  AI Feedback
                </p>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{aiFeedback}</p>
              </div>
            )}

            <Link
              href="/student/dashboard"
              className="block w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Return to Dashboard
            </Link>
          </div>

          <section className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-sky-400" />
              <h3 className="text-xl font-semibold text-white">Quiz Analysis</h3>
            </div>
            <p className="text-sm text-slate-400 mb-6">
              Compare your attempt to class performance and identify the hardest questions.
            </p>

            {analysisError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-300 mb-4">
                {analysisError}
              </div>
            )}

            {!analysisError && (
              <div className="space-y-6">
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
                  <h4 className="text-base font-semibold text-slate-100 mb-4">Your Score vs Class Average</h4>
                  <div className="space-y-4">
                    <ScoreCompareBar
                      label="Your Score"
                      value={percentScore}
                      colorClass={percentScore >= 60 ? "bg-emerald-500" : "bg-red-500"}
                    />
                    <ScoreCompareBar
                      label="Class Average"
                      value={analysisAvgScore ?? 0}
                      colorClass={(analysisAvgScore ?? 0) >= 60 ? "bg-sky-500" : "bg-amber-500"}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
                  <ScoreDistributionChart
                    allAttempts={analysisAttempts.map((a) => ({ ...a, quizTitle: quiz.title }))}
                    quizzes={[quiz]}
                  />
                  </div>
                  <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
                    <h4 className="text-base font-semibold text-slate-100 mb-3">Question Difficulty (by class misses)</h4>
                    <QuestionFailureRateChart questions={analysisFailureRates} />
                  </div>
                </div>
              </div>
            )}
          </section>
        </motion.div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIdx];

  // --- Quiz taking screen ---
  return (
    <div className="min-h-screen bg-[#020617] p-6 lg:p-12">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/50 border border-slate-800 p-4 rounded-full mb-8 px-6">
          <h1 className="text-lg font-semibold text-white">{quiz.title}</h1>
          <div
            className={`flex items-center gap-2 font-mono text-xl px-4 py-1.5 rounded-full transition-colors ${
              timeLeft <= 60
                ? "text-red-400 bg-red-400/10"
                : "text-amber-400 bg-amber-400/10"
            }`}
          >
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
              Question {currentQuestionIdx + 1} of {quiz.questions.length}
            </span>
            {/* Progress bar */}
            <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-400 rounded-full transition-all"
                style={{ width: `${((currentQuestionIdx + 1) / quiz.questions.length) * 100}%` }}
              />
            </div>
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

            {currentQuestionIdx === quiz.questions.length - 1 ? (
              <button
                onClick={() => handleSubmit(responses)}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-3 rounded-xl font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)]"
              >
                Submit Quiz
                <CheckCircle className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestionIdx((p) => Math.min(quiz.questions.length - 1, p + 1))}
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

function ScoreCompareBar({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: number;
  colorClass: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="text-slate-300">{label}</span>
        <span className="text-white font-semibold">{clamped}%</span>
      </div>
      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}


