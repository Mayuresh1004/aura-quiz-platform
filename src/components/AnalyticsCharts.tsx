"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import AnnotationPlugin from "chartjs-plugin-annotation";
import { Bar, Line } from "react-chartjs-2";
import { useState, useMemo } from "react";
import { Quiz, Attempt } from "@/models/DatabaseInterfaces";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  AnnotationPlugin
);

// Set default text colors for dark mode
ChartJS.defaults.color = "#94a3b8";
ChartJS.defaults.font.family = "Inter, sans-serif";

// ─── Color palette for score buckets (red → orange → yellow → lime → green) ──
const BUCKET_BG = [
  "rgba(239, 68, 68, 0.7)",   // 0-20%  red-500
  "rgba(249, 115, 22, 0.7)",  // 21-40% orange-500
  "rgba(234, 179, 8, 0.65)",  // 41-60% yellow-500
  "rgba(132, 204, 22, 0.7)",  // 61-80% lime-500
  "rgba(34, 197, 94, 0.7)",   // 81-100% green-500
];
const BUCKET_BORDER = [
  "rgb(239, 68, 68)",
  "rgb(249, 115, 22)",
  "rgb(234, 179, 8)",
  "rgb(132, 204, 22)",
  "rgb(34, 197, 94)",
];
const BUCKET_LABELS = ["0–20%", "21–40%", "41–60%", "61–80%", "81–100%"];

function computeBuckets(attempts: Attempt[]): number[] {
  const buckets = [0, 0, 0, 0, 0];
  for (const a of attempts) {
    if (!a.totalQuestions) continue;
    const pct = Math.round((a.score / a.totalQuestions) * 100);
    if (pct <= 20) buckets[0]++;
    else if (pct <= 40) buckets[1]++;
    else if (pct <= 60) buckets[2]++;
    else if (pct <= 80) buckets[3]++;
    else buckets[4]++;
  }
  return buckets;
}

// ─── Score Distribution Chart ─────────────────────────────────────────────────

interface ScoreDistributionProps {
  allAttempts: Attempt[];
  quizzes: Quiz[];
}

export function ScoreDistributionChart({ allAttempts, quizzes }: ScoreDistributionProps) {
  const [selectedQuizId, setSelectedQuizId] = useState<string>("ALL");

  const filteredAttempts = useMemo(() => {
    if (selectedQuizId === "ALL") return allAttempts;
    return allAttempts.filter((a) => a.quizId === selectedQuizId);
  }, [allAttempts, selectedQuizId]);

  const counts = useMemo(() => computeBuckets(filteredAttempts), [filteredAttempts]);
  const total = counts.reduce((s, c) => s + c, 0);
  const pctData = counts.map((c) => (total > 0 ? parseFloat(((c / total) * 100).toFixed(1)) : 0));
  const classAvgPct = total > 0
    ? parseFloat((filteredAttempts.reduce((s, a) => s + (a.totalQuestions ? (a.score / a.totalQuestions) * 100 : 0), 0) / filteredAttempts.length).toFixed(1))
    : 0;

  // Student names per bucket for tooltip detail
  const studentsByBucket = useMemo(() => {
    const groups: string[][] = [[], [], [], [], []];
    for (const a of filteredAttempts) {
      if (!a.totalQuestions) continue;
      const pct = Math.round((a.score / a.totalQuestions) * 100);
      const score = `${a.score}/${a.totalQuestions} (${pct}%)`;
      const label = a.quizTitle || a.quizId;
      const entry = a.quizTitle ? score : `${label}: ${score}`;
      if (pct <= 20) groups[0].push(entry);
      else if (pct <= 40) groups[1].push(entry);
      else if (pct <= 60) groups[2].push(entry);
      else if (pct <= 80) groups[3].push(entry);
      else groups[4].push(entry);
    }
    return groups;
  }, [filteredAttempts]);

  const chartData = {
    labels: BUCKET_LABELS,
    datasets: [
      {
        label: "% of Students",
        data: pctData,
        backgroundColor: BUCKET_BG,
        borderColor: BUCKET_BORDER,
        borderWidth: 1.5,
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const idx = ctx.dataIndex;
            const n = counts[idx];
            return `${ctx.parsed.y}% of class (${n} student${n !== 1 ? "s" : ""})`;
          },
          afterBody: (items: any[]) => {
            const idx = items[0].dataIndex;
            const names = studentsByBucket[idx];
            if (names.length === 0) return [];
            const lines = ["", "Scores in this bucket:"];
            names.slice(0, 8).forEach((s) => lines.push(`  • ${s}`));
            if (names.length > 8) lines.push(`  …and ${names.length - 8} more`);
            return lines;
          },
        },
        backgroundColor: "rgba(15,23,42,0.95)",
        borderColor: "rgba(148,163,184,0.2)",
        borderWidth: 1,
        titleColor: "#f8fafc",
        bodyColor: "#94a3b8",
        padding: 12,
      },
      annotation: {
        annotations: {
          passingLine: {
            type: "line" as const,
            yMin: 60,
            yMax: 60,
            borderColor: "rgba(251,191,36,0.8)",
            borderWidth: 2,
            borderDash: [6, 4],
            label: {
              display: true,
              content: "60% Passing",
              position: "end" as const,
              backgroundColor: "rgba(251,191,36,0.15)",
              color: "rgb(251,191,36)",
              font: { size: 11 },
              padding: { x: 6, y: 3 },
            },
          },
          avgLine: total > 0
            ? {
                type: "line" as const,
                yMin: classAvgPct,
                yMax: classAvgPct,
                borderColor: "rgba(56,189,248,0.8)",
                borderWidth: 2,
                borderDash: [3, 3],
                label: {
                  display: true,
                  content: `Avg ${classAvgPct}%`,
                  position: "start" as const,
                  backgroundColor: "rgba(56,189,248,0.15)",
                  color: "rgb(56,189,248)",
                  font: { size: 11 },
                  padding: { x: 6, y: 3 },
                },
              }
            : undefined,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: { color: "rgba(255,255,255,0.05)" },
        ticks: {
          callback: (val: number | string) => `${val}%`,
        },
        title: { display: true, text: "% of Class", color: "#64748b", font: { size: 11 } },
      },
      x: {
        grid: { display: false },
      },
    },
  };

  return (
    <div>
      {/* Header row with title + quiz filter */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h3 className="text-base font-semibold text-slate-100">Score Distribution</h3>
        <select
          id="score-dist-quiz-filter"
          value={selectedQuizId}
          onChange={(e) => setSelectedQuizId(e.target.value)}
          className="text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          <option value="ALL">All Quizzes</option>
          {quizzes.map((q) => (
            <option key={q.PK} value={q.PK.split("#")[1]}>
              {q.title.length > 32 ? q.title.slice(0, 32) + "…" : q.title}
            </option>
          ))}
        </select>
      </div>
      <div className="h-64 md:h-72 w-full">
        <Bar data={chartData} options={options as any} />
      </div>
      {total === 0 && (
        <p className="text-center text-slate-500 text-sm mt-4">No attempts yet for this quiz.</p>
      )}
    </div>
  );
}

// ─── Difficulty Trend (Stacked Area) ─────────────────────────────────────────

const QUIZ_LIMIT_OPTIONS = [
  { label: "Last 5", value: 5 },
  { label: "Last 10", value: 10 },
  { label: "All Time", value: 0 },
];

export function DifficultyTrendLine({
  labels,
  easyData,
  mediumData,
  hardData,
}: {
  labels: string[];
  easyData: number[];
  mediumData: number[];
  hardData: number[];
}) {
  const [quizLimit, setQuizLimit] = useState(5);

  const slicedLabels = quizLimit === 0 ? labels : labels.slice(-quizLimit);
  const slicedEasy   = quizLimit === 0 ? easyData   : easyData.slice(-quizLimit);
  const slicedMedium = quizLimit === 0 ? mediumData : mediumData.slice(-quizLimit);
  const slicedHard   = quizLimit === 0 ? hardData   : hardData.slice(-quizLimit);

  // Truncate long titles for ticks; show full in tooltip
  const truncate = (s: string, max = 18) => s.length > max ? s.slice(0, max) + "…" : s;

  if (slicedLabels.length < 2) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-100">Difficulty Composition</h3>
        </div>
        <div className="h-64 md:h-72 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-2xl">📊</div>
          <p className="text-slate-400 font-medium">Not enough quizzes yet</p>
          <p className="text-slate-600 text-sm max-w-xs">Create at least 2 quizzes to see a difficulty trend across time.</p>
        </div>
      </div>
    );
  }

  const lineData = {
    labels: slicedLabels.map((l) => truncate(l)),
    datasets: [
      {
        label: "Easy",
        data: slicedEasy,
        borderColor: "rgb(52, 211, 153)",
        backgroundColor: "rgba(52, 211, 153, 0.35)",
        tension: 0,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: "Medium",
        data: slicedMedium,
        borderColor: "rgb(251, 191, 36)",
        backgroundColor: "rgba(251, 191, 36, 0.35)",
        tension: 0,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: "Hard",
        data: slicedHard,
        borderColor: "rgb(248, 113, 113)",
        backgroundColor: "rgba(248, 113, 113, 0.35)",
        tension: 0,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: { color: "#cbd5e1", usePointStyle: true, boxWidth: 8, padding: 16 },
      },
      title: { display: false },
      tooltip: {
        callbacks: {
          title: (items: any[]) => {
            const idx = items[0].dataIndex;
            return slicedLabels[idx] || items[0].label;
          },
          label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.parsed.y}%`,
        },
        backgroundColor: "rgba(15,23,42,0.95)",
        borderColor: "rgba(148,163,184,0.2)",
        borderWidth: 1,
        titleColor: "#f8fafc",
        bodyColor: "#94a3b8",
        padding: 12,
      },
    },
    scales: {
      y: {
        stacked: true,
        beginAtZero: true,
        max: 100,
        grid: { color: "rgba(255,255,255,0.05)" },
        ticks: { callback: (v: number | string) => `${v}%` },
        title: { display: true, text: "% of Questions", color: "#64748b", font: { size: 11 } },
      },
      x: {
        stacked: true,
        grid: { display: false },
      },
    },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h3 className="text-base font-semibold text-slate-100">Difficulty Composition</h3>
        <div className="flex gap-1.5">
          {QUIZ_LIMIT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setQuizLimit(opt.value)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                quizLimit === opt.value
                  ? "bg-sky-500/20 border-sky-500/50 text-sky-300"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-64 md:h-72 w-full">
        <Line data={lineData} options={options as any} />
      </div>
    </div>
  );
}

// ─── Average Score Per Quiz (Line Chart) ──────────────────────────────────────

interface AvgScoreProps {
  quizzes: Quiz[];
  allAttempts: Attempt[];
}

export function AvgScorePerQuizChart({ quizzes, allAttempts }: AvgScoreProps) {
  const { labels, data } = useMemo(() => {
    const sorted = [...quizzes].sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
    const labels: string[] = [];
    const data: number[] = [];
    for (const quiz of sorted) {
      const qId = quiz.PK.split("#")[1];
      const qAttempts = allAttempts.filter((a) => a.quizId === qId);
      if (qAttempts.length === 0) continue;
      const avg = qAttempts.reduce((s, a) => s + (a.totalQuestions ? (a.score / a.totalQuestions) * 100 : 0), 0) / qAttempts.length;
      labels.push(quiz.title.length > 18 ? quiz.title.slice(0, 18) + "…" : quiz.title);
      data.push(parseFloat(avg.toFixed(1)));
    }
    return { labels, data };
  }, [quizzes, allAttempts]);

  if (labels.length === 0) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-base font-semibold text-slate-100 mb-4">Class Average Score — Per Quiz</h3>
        <div className="h-48 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xl">📈</div>
          <p className="text-slate-500 text-sm">No attempts recorded yet.</p>
        </div>
      </div>
    );
  }

  const chartData = {
    labels,
    datasets: [
      {
        label: "Avg Score",
        data,
        borderColor: "rgb(139,92,246)",
        backgroundColor: "rgba(139,92,246,0.15)",
        tension: 0,
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: "rgb(139,92,246)",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` Class Avg: ${ctx.parsed.y}%`,
        },
        backgroundColor: "rgba(15,23,42,0.95)",
        borderColor: "rgba(148,163,184,0.2)",
        borderWidth: 1,
        titleColor: "#f8fafc",
        bodyColor: "#94a3b8",
        padding: 12,
      },
      annotation: {
        annotations: {
          passingLine: {
            type: "line" as const,
            yMin: 60,
            yMax: 60,
            borderColor: "rgba(251,191,36,0.6)",
            borderWidth: 2,
            borderDash: [6, 4],
            label: {
              display: true,
              content: "60% Passing",
              position: "end" as const,
              backgroundColor: "rgba(251,191,36,0.12)",
              color: "rgb(251,191,36)",
              font: { size: 11 },
              padding: { x: 6, y: 3 },
            },
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: { color: "rgba(255,255,255,0.05)" },
        ticks: { callback: (v: number | string) => `${v}%` },
        title: { display: true, text: "Avg Score (%)", color: "#64748b", font: { size: 11 } },
      },
      x: {
        grid: { display: false },
      },
    },
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
      <h3 className="text-base font-semibold text-slate-100 mb-4">Class Average Score — Per Quiz</h3>
      <div className="h-56 w-full">
        <Line data={chartData} options={options as any} />
      </div>
    </div>
  );
}

// ─── Question Failure Rate Chart ──────────────────────────────────────────────

interface FailureRateProps {
  questions: { text: string; failureRate: number }[];
}

export function QuestionFailureRateChart({ questions }: FailureRateProps) {
  if (questions.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
        No attempt data yet.
      </div>
    );
  }

  const sorted = [...questions].sort((a, b) => b.failureRate - a.failureRate);
  const labels = sorted.map((q, i) => `Q${i + 1}`);
  const fullLabels = sorted.map((q) => q.text);
  const data = sorted.map((q) => parseFloat((q.failureRate * 100).toFixed(1)));

  const bgColors = data.map((v) =>
    v >= 70 ? "rgba(239,68,68,0.7)" : v >= 40 ? "rgba(249,115,22,0.7)" : "rgba(34,197,94,0.7)"
  );

  const chartData = {
    labels,
    datasets: [
      {
        label: "Failure Rate",
        data,
        backgroundColor: bgColors,
        borderRadius: 5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y" as const,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items: any[]) => fullLabels[items[0].dataIndex],
          label: (ctx: any) => ` ${ctx.parsed.x}% failure rate`,
        },
        backgroundColor: "rgba(15,23,42,0.95)",
        borderColor: "rgba(148,163,184,0.2)",
        borderWidth: 1,
        titleColor: "#f8fafc",
        bodyColor: "#94a3b8",
        padding: 12,
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
        grid: { color: "rgba(255,255,255,0.05)" },
        ticks: { callback: (v: number | string) => `${v}%` },
      },
      y: {
        grid: { display: false },
      },
    },
  };

  return (
    <div className="w-full" style={{ height: `${Math.max(200, sorted.length * 36)}px` }}>
      <Bar data={chartData} options={options as any} />
    </div>
  );
}
