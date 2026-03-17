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
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

// Set default text colors for dark mode
ChartJS.defaults.color = "#94a3b8";
ChartJS.defaults.font.family = "Inter, sans-serif";

interface BarChartProps {
  labels: string[];
  data: number[];
  title: string;
}

export function ScoreDistributionChart({ labels, data, title }: BarChartProps) {
  const chartData = {
    labels,
    datasets: [
      {
        label: "Number of Students",
        data,
        backgroundColor: "rgba(56, 189, 248, 0.5)", // sky-400
        borderColor: "rgb(56, 189, 248)",
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: title,
        color: "#f8fafc",
        font: { size: 16, weight: "bold" as const },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(255,255,255,0.05)" },
      },
      x: {
        grid: { display: false },
      },
    },
  };

  return (
    <div className="h-64 md:h-80 w-full">
      <Bar data={chartData} options={options} />
    </div>
  );
}

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
  const lineData = {
    labels,
    datasets: [
      {
        label: "Easy",
        data: easyData,
        borderColor: "rgb(52, 211, 153)", // emerald-400
        backgroundColor: "rgba(52, 211, 153, 0.1)",
        tension: 0.4,
        fill: true,
      },
      {
        label: "Medium",
        data: mediumData,
        borderColor: "rgb(251, 191, 36)", // amber-400
        backgroundColor: "rgba(251, 191, 36, 0.1)",
        tension: 0.4,
      },
      {
        label: "Hard",
        data: hardData,
        borderColor: "rgb(248, 113, 113)", // red-400
        backgroundColor: "rgba(248, 113, 113, 0.1)",
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: { color: "#cbd5e1", usePointStyle: true, boxWidth: 6 },
      },
      title: {
        display: true,
        text: "Question Difficulty Tag Trends (AI Estimates)",
        color: "#f8fafc",
        font: { size: 16, weight: "bold" as const },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(255,255,255,0.05)" },
      },
      x: {
        grid: { color: "rgba(255,255,255,0.05)" },
      },
    },
  };

  return (
    <div className="h-64 md:h-80 w-full">
      <Line data={lineData} options={options} />
    </div>
  );
}
