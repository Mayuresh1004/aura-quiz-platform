"use client";

import { motion } from "framer-motion";
import { BrainCircuit, LineChart, ShieldCheck, ArrowRight, Zap, Cloud } from "lucide-react";
import Link from "next/link";

const features = [
  {
    title: "AI Difficulty Estimation",
    description: "Questions dynamically adjust tags (Easy/Medium/Hard) based on real student performance data powered by SageMaker.",
    icon: BrainCircuit,
    color: "text-purple-400",
  },
  {
    title: "Performance Analytics",
    description: "Teachers get deep insights with Chart.js dashboards showing score distributions, high/low marks, and topic analysis.",
    icon: LineChart,
    color: "text-emerald-400",
  },
  {
    title: "Secure AWS Cloud",
    description: "Built on Amazon Web Services utilizing DynamoDB, Cognito, and S3 for a scalable, highly secure environment.",
    icon: ShieldCheck,
    color: "text-blue-400",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#020617]">
      {/* Background Gradients */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Cloud className="w-8 h-8 text-sky-400" />
          <span className="text-xl font-bold tracking-tight text-white">QuickQuiz</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Login
          </Link>
          <Link
            href="/auth/register"
            className="text-sm font-medium bg-sky-500/10 text-sky-400 px-4 py-2 rounded-full border border-sky-500/20 hover:bg-sky-500/20 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 text-slate-300 text-sm mb-8"
        >
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Next Generation Quiz Platform</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight"
        >
          Assess Smarter with <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400">
            Cloud & AI Analytics
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-2xl mx-auto text-lg text-slate-400 mb-10"
        >
          QuickQuiz empowers educators to create secure, scalable quizzes while leveraging AI to automatically estimate
          question difficulty based on student performance metrics.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/auth/register"
            className="flex items-center gap-2 bg-white text-slate-950 px-8 py-3 rounded-full font-semibold hover:bg-slate-200 transition-colors w-full sm:w-auto justify-center"
          >
            Start Free Trial
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/features"
            className="flex items-center gap-2 px-8 py-3 rounded-full font-semibold text-white bg-slate-800/50 border border-slate-700 hover:bg-slate-800 transition-colors w-full sm:w-auto justify-center"
          >
            View Features
          </Link>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-32 text-left">
          {features.map((feature, idx) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + idx * 0.1 }}
              className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm hover:border-slate-700 transition-colors"
            >
              <div className={`w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center mb-6`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
