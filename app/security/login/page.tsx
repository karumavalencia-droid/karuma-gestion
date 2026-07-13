"use client";

// Acceso seguro del propietario (Supabase Auth email+password). Tras el login,
// el middleware envía a /security/setup-mfa o /security/verify-mfa según el
// estado del MFA. No afecta al login de empleados (PIN) ni al de oficina.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getSupabaseAuthBrowser } from "@/lib/supabase/ssr-browser";

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20";

export default function OwnerSecureLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const supabase = getSupabaseAuthBrowser();
    if (!supabase) {
      setError("Acceso seguro no disponible en este entorno.");
      return;
    }
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setSubmitting(false);
    if (signInError) {
      setError("Email o contraseña incorrectos.");
      return;
    }
    // El middleware decide setup-mfa / verify-mfa / owner según el estado.
    router.replace("/owner");
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Acceso seguro del propietario</h1>
          <p className="mt-1 text-sm text-gray-500">
            Requiere verificación en dos pasos (Authenticator).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              autoComplete="username"
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              autoComplete="current-password"
              required
            />
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {submitting ? "Entrando…" : "Continuar"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-gray-400">
          ¿Eres empleado o encargado?{" "}
          <Link href="/login" className="underline hover:text-gray-600">
            Entrar aquí
          </Link>
        </p>
      </div>
    </div>
  );
}
