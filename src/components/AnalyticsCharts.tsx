"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import AnnotationPlugin from "chartjs-plugin-annotation";
import { Bar } from "react-chartjs-2";
import { useState, useMemo } from "react";
import { Quiz, Attempt } from "@/models/DatabaseInterfaces";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  AnnotationPlugin
);

// Set default text colors for dark mode
ChartJS.defaults.color = "#94a3b8";
ChartJS.defaults.font.family = "Inter, sans-serif";

// ─── Color palette for score buckets (red → green gradient) ──────────────────
const BUCKET_BG = [
  "rgba(239, 68, 68, 0.75)",   // 0-20%  red-500
  "rgba(249, 115, 22, 0.75)",  // 21-40% orange-500
  "rgba(234, 179, 8, 0.75)",   // 41-60% yellow-500
  "rgba(132, 204, 22, 0.75)",  // 61-80% lime-500
  "rgba(34, 197, 94, 0.75)",   // 81-100% green-500
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

// ─── Score Distribution Chart (Horizontal Bar) ───────────────────────────────
// Changed from vertical bar to horizontal bar - score ranges on Y axis are
// much easier to scan, and the bar length directly communicates "how many
// students landed in each band" without needing to trace up to an axis.

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

  const classAvgPct =
    total > 0
      ? parseFloat(
          (
            filteredAttempts.reduce(
              (s, a) => s + (a.totalQuestions ? (a.score / a.totalQuestions) * 100 : 0),
              0
            ) / filteredAttempts.length
          ).toFixed(1)
        )
      : 0;

  // Horizontal bar — x axis = number of students, y axis = score band
  const chartData = {
    labels: BUCKET_LABELS,
    datasets: [
      {
        label: "Students",
        data: counts,
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
    indexAxis: "y" as const, // ← horizontal bars
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const n = ctx.parsed.x;
            const pct = total > 0 ? ((n / total) * 100).toFixed(1) : "0.0";
            return ` ${n} student${n !== 1 ? "s" : ""} (${pct}% of class)`;
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
        annotations:
          total > 0
            ? {
                avgLine: {
                  type: "line" as const,
                  // draw a vertical reference line at the avg bucket index
                  // We annotate on the x-axis (student count) — draw a label note instead
                },
              }
            : {},
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: "rgba(255,255,255,0.05)" },
        ticks: {
          stepSize: 1,
          precision: 0,
        },
        title: {
          display: true,
          text: "Number of Students",
          color: "#64748b",
          font: { size: 11 },
        },
      },
      y: {
        grid: { display: false },
      },
    },
  };

  return (
    <div>
      {/* Header row with title + quiz filter */}
      <div className="flex items-center justify-between mb-1 gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-semibold text-slate-100">Score Distribution</h3>
          {total > 0 && (
            <p className="text-xs text-slate-500 mt-0.5">
              Class avg:{" "}
              <span className={classAvgPct >= 60 ? "text-emerald-400" : "text-red-400"}>
                {classAvgPct}%
              </span>{" "}
              · {total} attempt{total !== 1 ? "s" : ""}
            </p>
          )}
        </div>
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

      {/* Passing threshold legend */}
      {total > 0 && (
        <div className="flex items-center gap-4 mb-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500/70 inline-block" />
            Below passing
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-lime-500/70 inline-block" />
            Passing (≥61%)
          </span>
        </div>
      )}

      <div className="h-56 md:h-64 w-full">
        <Bar data={chartData} options={options as any} />
      </div>
      {total === 0 && (
        <div className="h-56 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xl">📊</div>
          <p className="text-slate-500 text-sm">No attempts for this quiz yet.</p>
        </div>
      )}
    </div>
  );
}

// ─── Difficulty Composition (Stacked Bar) ─────────────────────────────────────
// Changed from stacked area line chart to stacked bar chart.
// Stacked bars make it instantly clear what fraction of each quiz is
// Easy / Medium / Hard — no need to mentally "read areas" off a line chart.

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

  const truncate = (s: string, max = 16) => s.length > max ? s.slice(0, max) + "…" : s;

  if (slicedLabels.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-100">Difficulty Composition</h3>
        </div>
        <div className="h-64 md:h-72 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-2xl">📊</div>
          <p className="text-slate-400 font-medium">No quizzes yet</p>
          <p className="text-slate-600 text-sm max-w-xs">Create quizzes to see difficulty breakdown.</p>
        </div>
      </div>
    );
  }

  const barData = {
    labels: slicedLabels.map((l) => truncate(l)),
    datasets: [
      {
        label: "Easy",
        data: slicedEasy,
        backgroundColor: "rgba(52, 211, 153, 0.8)",
        borderColor: "rgb(52, 211, 153)",
        borderWidth: 1,
        borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 4, bottomRight: 4 },
        stack: "difficulty",
      },
      {
        label: "Medium",
        data: slicedMedium,
        backgroundColor: "rgba(251, 191, 36, 0.8)",
        borderColor: "rgb(251, 191, 36)",
        borderWidth: 1,
        borderRadius: 0,
        stack: "difficulty",
      },
      {
        label: "Hard",
        data: slicedHard,
        backgroundColor: "rgba(248, 113, 113, 0.8)",
        borderColor: "rgb(248, 113, 113)",
        borderWidth: 1,
        borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
        stack: "difficulty",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: { color: "#cbd5e1", usePointStyle: true, boxWidth: 10, padding: 16 },
      },
      title: { display: false },
      tooltip: {
        callbacks: {
          title: (items: any[]) => {
            const idx = items[0].dataIndex;
            return slicedLabels[idx] || items[0].label;
          },
          label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.parsed.y}%`,
          footer: (items: any[]) => {
            const idx = items[0].dataIndex;
            const total = (slicedEasy[idx] || 0) + (slicedMedium[idx] || 0) + (slicedHard[idx] || 0);
            return `Total: ${total.toFixed(0)}%`;
          },
        },
        backgroundColor: "rgba(15,23,42,0.95)",
        borderColor: "rgba(148,163,184,0.2)",
        borderWidth: 1,
        titleColor: "#f8fafc",
        bodyColor: "#94a3b8",
        footerColor: "#64748b",
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
        title: {
          display: true,
          text: "% of Questions",
          color: "#64748b",
          font: { size: 11 },
        },
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
        <div>
          <h3 className="text-base font-semibold text-slate-100">Difficulty Composition</h3>
          <p className="text-xs text-slate-500 mt-0.5">Per-quiz question difficulty breakdown</p>
        </div>
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
        <Bar data={barData} options={options as any} />
      </div>
    </div>
  );
}

// ─── Average Score Per Quiz (Color-coded Bar) ─────────────────────────────────
// Changed from a plain line chart to a bar chart where each bar is individually
// colored: green (≥80%), sky (60-79%), amber (40-59%), red (<40%).
// This makes it immediately obvious which quizzes the class struggled on vs
// excelled at — no need to mentally compare a line's height to an axis.

interface AvgScoreProps {
  quizzes: Quiz[];
  allAttempts: Attempt[];
}

function scoreColor(pct: number): { bg: string; border: string } {
  if (pct >= 80) return { bg: "rgba(34,197,94,0.75)", border: "rgb(34,197,94)" };
  if (pct >= 60) return { bg: "rgba(56,189,248,0.75)", border: "rgb(56,189,248)" };
  if (pct >= 40) return { bg: "rgba(251,191,36,0.75)", border: "rgb(251,191,36)" };
  return { bg: "rgba(239,68,68,0.75)", border: "rgb(239,68,68)" };
}

export function AvgScorePerQuizChart({ quizzes, allAttempts }: AvgScoreProps) {
  const { labels, data, fullLabels, attemptCounts } = useMemo(() => {
    const sorted = [...quizzes].sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
    const labels: string[] = [];
    const fullLabels: string[] = [];
    const data: number[] = [];
    const attemptCounts: number[] = [];
    for (const quiz of sorted) {
      const qId = quiz.PK.split("#")[1];
      const qAttempts = allAttempts.filter((a) => a.quizId === qId);
      if (qAttempts.length === 0) continue;
      const avg =
        qAttempts.reduce(
          (s, a) => s + (a.totalQuestions ? (a.score / a.totalQuestions) * 100 : 0),
          0
        ) / qAttempts.length;
      const truncated = quiz.title.length > 16 ? quiz.title.slice(0, 16) + "…" : quiz.title;
      labels.push(truncated);
      fullLabels.push(quiz.title);
      data.push(parseFloat(avg.toFixed(1)));
      attemptCounts.push(qAttempts.length);
    }
    return { labels, data, fullLabels, attemptCounts };
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

  const bgColors = data.map((v) => scoreColor(v).bg);
  const borderColors = data.map((v) => scoreColor(v).border);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Avg Score",
        data,
        backgroundColor: bgColors,
        borderColor: borderColors,
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
          title: (items: any[]) => fullLabels[items[0].dataIndex] || items[0].label,
          label: (ctx: any) => {
            const score = ctx.parsed.y;
            const n = attemptCounts[ctx.dataIndex];
            return [
              ` Avg Score: ${score}%`,
              ` Attempts: ${n} student${n !== 1 ? "s" : ""}`,
            ];
          },
          footer: (items: any[]) => {
            const score = items[0].parsed.y;
            if (score >= 80) return "✓ Excellent";
            if (score >= 60) return "✓ Passing";
            if (score >= 40) return "⚠ Below average";
            return "✗ Struggling";
          },
        },
        backgroundColor: "rgba(15,23,42,0.95)",
        borderColor: "rgba(148,163,184,0.2)",
        borderWidth: 1,
        titleColor: "#f8fafc",
        bodyColor: "#94a3b8",
        footerColor: "#64748b",
        padding: 12,
      },
      annotation: {
        annotations: {
          passingLine: {
            type: "line" as const,
            yMin: 60,
            yMax: 60,
            borderColor: "rgba(251,191,36,0.7)",
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
          excellentLine: {
            type: "line" as const,
            yMin: 80,
            yMax: 80,
            borderColor: "rgba(34,197,94,0.4)",
            borderWidth: 1.5,
            borderDash: [4, 4],
            label: {
              display: true,
              content: "80% Excellent",
              position: "start" as const,
              backgroundColor: "rgba(34,197,94,0.08)",
              color: "rgb(34,197,94)",
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
        title: {
          display: true,
          text: "Avg Score (%)",
          color: "#64748b",
          font: { size: 11 },
        },
      },
      x: {
        grid: { display: false },
      },
    },
  };

  // Color legend
  const legend = [
    { label: "Excellent (≥80%)", color: "bg-emerald-500/75" },
    { label: "Passing (60–79%)", color: "bg-sky-400/75" },
    { label: "Below avg (40–59%)", color: "bg-amber-400/75" },
    { label: "Struggling (<40%)", color: "bg-red-500/75" },
  ];

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-100">Class Average Score — Per Quiz</h3>
          <p className="text-xs text-slate-500 mt-0.5">Color indicates overall class performance</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {legend.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className={`w-2.5 h-2.5 rounded-sm ${l.color} inline-block`} />
              {l.label}
            </span>
          ))}
        </div>
      </div>
      <div className="h-56 w-full">
        <Bar data={chartData} options={options as any} />
      </div>
    </div>
  );
}

// ─── Question Failure Rate Chart (unchanged — used on per-quiz results page) ──

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
