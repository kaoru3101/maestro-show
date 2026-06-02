"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getUser, isLoggedIn, clearTokens } from "@/lib/auth";
import api from "@/lib/axios";
import { ep } from "@/lib/endpoints";
import type { User } from "@/types/api";

interface AuthContextType {
  user: User | null;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const PUBLIC_PATHS = ["/login", "/register", "/view"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
    if (isLoggedIn()) {
      setUser(getUser());
    } else if (!isPublic) {
      router.replace("/login");
    }
    setIsLoading(false);
  }, [pathname, router]);

  const logout = useCallback(async () => {
    try {
      await api.post(ep.auth.logout);
    } catch {
      // ignore
    } finally {
      clearTokens();
      setUser(null);
      router.replace("/login");
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
