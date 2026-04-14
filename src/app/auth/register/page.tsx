"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Cloud, ArrowRight, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { handleRegister, handleConfirmRegistration } from "@/actions/server-actions";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [verified, setVerified] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);
    formData.append("role", role);

    const res = await handleRegister(formData);
    if (res.success) {
      setSuccess(true);
    } else {
      setError(res.error || "Failed to register");
    }
    setLoading(false);
  };

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("email", email);
    formData.append("code", verificationCode);

    const res = await handleConfirmRegistration(formData);
    if (res.success) {
      setVerified(true);
    } else {
      setError(res.error || "Failed to verify code");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center relative overflow-hidden px-4">
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-sky-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <Cloud className="w-10 h-10 text-sky-400" />
            <span className="text-3xl font-bold text-white tracking-tight">QuickQuiz</span>
          </Link>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Create an Account</h2>
            <p className="text-slate-400">Join the next-generation learning platform.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {verified ? (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-xl text-emerald-400 text-center">
              Account verified successfully! 
              <br/><br/>
              <Link href="/auth/login" className="font-bold underline text-white">Go to Login</Link>
            </div>
          ) : success ? (
            <form className="space-y-6" onSubmit={onVerify}>
              <div className="mb-6 p-4 bg-sky-500/10 border border-sky-500/50 rounded-xl text-sky-400 text-sm text-center">
                We sent a verification code to <strong>{email}</strong>. Enter it below to activate your account.
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Verification Code</label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 text-center tracking-widest text-lg font-mono"
                  placeholder="123456"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white py-3 rounded-xl font-bold hover:bg-emerald-400 transition-colors disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify Account"}
              </button>
            </form>
          ) : (
          <form className="space-y-6" onSubmit={onSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">I am a...</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole("STUDENT")}
                  className={`py-2 rounded-xl border text-sm font-semibold transition-all ${
                    role === "STUDENT"
                      ? "bg-sky-500/20 border-sky-500 text-sky-400"
                      : "bg-slate-800/30 border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole("TEACHER")}
                  className={`py-2 rounded-xl border text-sm font-semibold transition-all ${
                    role === "TEACHER"
                      ? "bg-sky-500/20 border-sky-500 text-sky-400"
                      : "bg-slate-800/30 border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  Teacher
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all"
                placeholder="you@school.edu"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-white text-slate-950 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              {loading ? "Creating..." : "Sign up"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
          )}

          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Secured via AWS Cognito</span>
          </div>
        </div>

        <p className="text-center mt-8 text-slate-400 text-sm">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-sky-400 hover:text-sky-300 font-medium transition-colors">
            Log in here
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
