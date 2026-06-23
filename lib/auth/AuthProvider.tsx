"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isValidRole, type Role } from "./permissions";

export type AuthUser = {
  name: string;
  email: string;
  role: Role;
  employeeId: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<AuthUser | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeUser(raw: Partial<AuthUser> | null | undefined): AuthUser | null {
  if (
    !raw ||
    typeof raw.name !== "string" ||
    typeof raw.email !== "string" ||
    !isValidRole(raw.role)
  ) {
    return null;
  }

  return {
    name: raw.name.trim(),
    email: raw.email.trim().toLowerCase(),
    role: raw.role,
    employeeId:
      typeof raw.employeeId === "string" && raw.employeeId.trim()
        ? raw.employeeId.trim()
        : null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return normalizeUser((await response.json()) as Partial<AuthUser>);
      })
      .catch(() => null)
      .then((nextUser) => {
        if (!active) return;
        setUser(nextUser);
        setReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const next = normalizeUser((await res.json()) as Partial<AuthUser>);
        if (!next) return null;
        setUser(next);
        return next;
      }

      return null;
    } catch {
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, logout }),
    [user, ready, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
