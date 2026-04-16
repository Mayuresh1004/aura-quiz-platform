"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Role } from "../models/DatabaseInterfaces";

interface User {
  id?: string;
  email: string;
  role: Role;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function base64UrlDecodeToString(input: string): string {
  // JWT parts are base64url (RFC 7515): '-' and '_' instead of '+' and '/' and may omit padding.
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  return atob(padded);
}

function extractUserIdFromToken(token: string): string | undefined {
  try {
    const payload = token.split(".")[1];
    if (!payload) return undefined;
    const decoded = JSON.parse(base64UrlDecodeToString(payload));
    return decoded.sub as string | undefined;
  } catch {
    return undefined;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    const storedUser = localStorage.getItem("quickquiz_user") || localStorage.getItem("aura_user");
    if (!storedUser) return null;
    try {
      return JSON.parse(storedUser) as User;
    } catch (e) {
      console.error("Failed to parse stored user", e);
      return null;
    }
  });
  const isLoading = false;

  const login = (token: string, userData: User) => {
    // In a real app we'd also store the token securely, e.g., HTTP-only cookie
    const tokenUserId = extractUserIdFromToken(token);
    const resolvedUser = {
      ...userData,
      id: userData.id || tokenUserId,
    };
    localStorage.setItem("quickquiz_token", token);
    localStorage.setItem("quickquiz_user", JSON.stringify(resolvedUser));
    // Keep legacy keys for backwards compatibility with older builds.
    localStorage.setItem("aura_token", token);
    localStorage.setItem("aura_user", JSON.stringify(resolvedUser));
    setUser(resolvedUser);
  };

  const logout = () => {
    localStorage.removeItem("quickquiz_token");
    localStorage.removeItem("quickquiz_user");
    // Cleanup legacy keys after brand rename.
    localStorage.removeItem("aura_token");
    localStorage.removeItem("aura_user");
    setUser(null);
    window.location.href = "/auth/login";
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
