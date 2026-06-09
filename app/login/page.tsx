"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getDefaultRoute, ROLE_LABELS, type Role } from "@/lib/auth/permissions";

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20";

type AccountPreview = { email: string; name: string; role: Role };

export default function LoginPage() {
  const router = useRouter();
  const { user, ready, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<AccountPreview[]>([]);

  useEffect(() => {
    if (ready && user) {
      router.replace(getDefaultRoute(user.role));
    }
  }, [ready, user, router]);

  useEffect(() => {
    fetch("/api/auth/accounts")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: AccountPreview[]) => setAccounts(data))
      .catch(() => setAccounts([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const loggedIn = await login(email, password);
    setSubmitting(false);

    if (!loggedIn) {
      setError("邮箱或密码错误");
      return;
    }

    router.push(getDefaultRoute(loggedIn.role));
  };

  const quickLogin = (accountEmail: string) => {
    setEmail(accountEmail);
    setPassword("123456");
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-karuma-600 text-lg font-bold text-white">
            K
          </div>
          <h1 className="text-xl font-bold text-gray-900">登录 Karuma ERP</h1>
          <p className="mt-1 text-sm text-gray-500">Supabase 数据库账号 · 选择角色登录</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">邮箱</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="manager@karuma.es"
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">密码</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="123456"
              required
            />
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-karuma-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-karuma-700 disabled:opacity-60"
          >
            {submitting ? "登录中…" : "登录"}
          </button>
        </form>

        <div className="mt-6 rounded-lg bg-gray-50 p-3">
          <p className="mb-2 text-xs font-medium text-gray-500">快速选择账号（密码 123456）</p>
          <ul className="space-y-1">
            {accounts.map((a) => (
              <li key={a.email}>
                <button
                  type="button"
                  onClick={() => quickLogin(a.email)}
                  className="w-full rounded-md px-2 py-1.5 text-left text-xs text-gray-700 hover:bg-white"
                >
                  {a.name} · {ROLE_LABELS[a.role]} · {a.email}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
