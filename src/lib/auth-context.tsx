"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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

function extractUserIdFromToken(token: string): string | undefined {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.sub as string | undefined;
  } catch {
    return undefined;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // On mount, check if user session exists in localStorage (or via Cognito refresh token)
    const storedUser = localStorage.getItem("aura_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse stored user", e);
      }
    }
    setIsLoading(false);
  }, []);

  const login = (token: string, userData: User) => {
    // In a real app we'd also store the token securely, e.g., HTTP-only cookie
    const tokenUserId = extractUserIdFromToken(token);
    const resolvedUser = {
      ...userData,
      id: userData.id || tokenUserId,
    };
    localStorage.setItem("aura_token", token);
    localStorage.setItem("aura_user", JSON.stringify(resolvedUser));
    setUser(resolvedUser);
  };

  const logout = () => {
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
