"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20";

export function LoginPanel() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = "/dashboard";
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-karuma-600 text-lg font-bold text-white">
            K
          </div>
          <h1 className="text-xl font-bold text-gray-900">{t("pages.login.title")}</h1>
          <p className="mt-1 text-sm text-gray-500">{t("pages.login.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">{t("pages.login.email")}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="admin@karuma.es"
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">{t("pages.login.password")}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              required
            />
          </label>
          <Button type="submit" className="w-full">
            {t("pages.login.submit")}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          <Link href="/dashboard" className="text-karuma-600 hover:underline">
            {t("pages.login.skip")}
          </Link>
        </p>
      </div>
    </div>
  );
}
