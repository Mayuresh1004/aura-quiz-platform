import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Aura - Cloud Quiz Platform",
  description: "Secure Cloud-Based Quiz and Performance Analytics Platform powered by AWS and AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body
        className={`${inter.variable} font-sans min-h-screen bg-[#020617] text-slate-50 antialiased selection:bg-sky-500/30`}
      >
        {children}
      </body>
    </html>
  );
}
