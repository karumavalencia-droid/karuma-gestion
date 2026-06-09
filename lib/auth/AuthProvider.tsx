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
import { findAccount } from "./accounts";
import { normalizeRole, type Role } from "./permissions";

export const AUTH_STORAGE_KEY = "karuma_auth_user";

export type AuthUser = {
  name: string;
  email: string;
  role: Role;
};

export const DEFAULT_AUTH_USER: AuthUser = {
  name: "Zhou",
  email: "owner@karuma.es",
  role: "owner",
};

type AuthContextValue = {
  user: AuthUser;
  ready: boolean;
  login: (email: string, password: string) => Promise<AuthUser | null>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeUser(raw: Partial<AuthUser> | null | undefined): AuthUser {
  if (!raw) return DEFAULT_AUTH_USER;
  return {
    name: raw.name?.trim() || DEFAULT_AUTH_USER.name,
    email: raw.email?.trim().toLowerCase() || DEFAULT_AUTH_USER.email,
    role: normalizeRole(raw.role),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser>(DEFAULT_AUTH_USER);
  const [ready, setReady] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        setUser(normalizeUser(JSON.parse(raw) as Partial<AuthUser>));
      } else {
        setUser(DEFAULT_AUTH_USER);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(DEFAULT_AUTH_USER));
      }
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      setUser(DEFAULT_AUTH_USER);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(DEFAULT_AUTH_USER));
    } finally {
      setReady(true);
    }
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
        setUser(next);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
        return next;
      }

      if (res.status === 503) {
        const account = findAccount(email, password);
        if (!account) return null;
        const next: AuthUser = {
          name: account.name,
          email: account.email,
          role: account.role,
        };
        setUser(next);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
        return next;
      }

      return null;
    } catch {
      const account = findAccount(email, password);
      if (!account) return null;
      const next: AuthUser = {
        name: account.name,
        email: account.email,
        role: account.role,
      };
      setUser(next);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
      return next;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(DEFAULT_AUTH_USER);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(DEFAULT_AUTH_USER));
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
