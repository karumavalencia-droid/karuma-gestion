"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getDefaultRoute } from "@/lib/auth/permissions";

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20";

type Mode = "empleado" | "oficina";

export default function LoginPage() {
  const router = useRouter();
  const { user, ready, login } = useAuth();
  const [mode, setMode] = useState<Mode>("empleado");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && user) {
      router.replace(getDefaultRoute(user.role, user.employeeId));
    }
  }, [ready, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    // Los empleados usan el PIN como usuario y contraseña.
    const loggedIn =
      mode === "empleado" ? await login(pin, pin) : await login(username, password);
    setSubmitting(false);

    if (!loggedIn) {
      setError(
        mode === "empleado"
          ? "PIN incorrecto. Pide tu PIN al encargado."
          : "Usuario o contraseña incorrectos",
      );
      return;
    }

    router.push(getDefaultRoute(loggedIn.role, loggedIn.employeeId));
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-karuma-600 text-lg font-bold text-white">
            K
          </div>
          <h1 className="text-xl font-bold text-gray-900">Karuma ERP</h1>
          <p className="mt-1 text-sm text-gray-500">Elige cómo quieres entrar</p>
        </div>

        <div className="mb-5 flex gap-1 rounded-xl bg-gray-100 p-1">
          {(
            [
              { id: "empleado" as Mode, label: "Empleado · PIN" },
              { id: "oficina" as Mode, label: "Oficina / Jefe" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setMode(t.id);
                setError("");
              }}
              className={`min-h-[44px] flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                mode === t.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "empleado" ? (
            <>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-gray-700">PIN de empleado</span>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  className={`${inputClass} text-center text-2xl tracking-[0.5em]`}
                  placeholder="••••"
                  autoComplete="off"
                  required
                />
              </label>
              <p className="text-center text-xs text-gray-500">
                Entra con tu PIN para fichar y ver tu horario.
              </p>
            </>
          ) : (
            <>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Usuario</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={inputClass}
                  placeholder="Nombre de usuario"
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
                  placeholder="Introduce la contraseña"
                  autoComplete="current-password"
                  required
                />
              </label>
              <p className="text-center text-xs text-gray-500">
                Acceso completo: dashboard, reservas y facturas.
              </p>
            </>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-karuma-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-karuma-700 disabled:opacity-60"
          >
            {submitting ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-5 border-t border-gray-100 pt-4 text-center">
          <Link
            href="/security/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Acceso seguro del propietario
          </Link>
        </div>
      </div>
    </div>
  );
}
