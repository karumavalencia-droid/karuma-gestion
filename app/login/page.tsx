"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getDefaultRoute } from "@/lib/auth/permissions";

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20";

type Mode = "empleado" | "oficina" | "admin";
type AdminStep = "creds" | "code";
type EmpleadoStep = "pin" | "code";

/** Paso "escribe el código SMS". Lo comparten el admin y el empleado. */
function CodeFields({
  code,
  onCode,
  phoneHint,
  expiresIn,
  onBack,
}: {
  code: string;
  onCode: (value: string) => void;
  phoneHint: string;
  expiresIn: number | null;
  onBack: () => void;
}) {
  return (
    <>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-gray-700">Código SMS</span>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => onCode(e.target.value.replace(/\D/g, ""))}
          className={`${inputClass} text-center text-3xl tracking-[0.3em] font-mono`}
          placeholder="000000"
          autoComplete="one-time-code"
          required
        />
      </label>
      <p className="text-center text-xs text-gray-500">
        Código enviado a {phoneHint || "tu teléfono"}.
        {expiresIn ? ` Válido por ${expiresIn}s.` : " Código expirado, vuelve a empezar."}
      </p>
      <button
        type="button"
        onClick={onBack}
        className="w-full text-center text-xs text-karuma-600 hover:text-karuma-700 underline"
      >
        ← Volver
      </button>
    </>
  );
}

/** Cuenta atrás compartida por los dos flujos de código. */
function startCountdown(seconds: number, onTick: (remaining: number) => void) {
  let remaining = seconds;
  const timer = setInterval(() => {
    remaining--;
    onTick(remaining);
    if (remaining <= 0) clearInterval(timer);
  }, 1000);
}

export default function LoginPage() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [mode, setMode] = useState<Mode>("empleado");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [empStep, setEmpStep] = useState<EmpleadoStep>("pin");
  const [empCode, setEmpCode] = useState("");
  const [empPhoneHint, setEmpPhoneHint] = useState("");
  const [empExpiresIn, setEmpExpiresIn] = useState<number | null>(null);

  const [officeUser, setOfficeUser] = useState("oficina");
  const [officePass, setOfficePass] = useState("");

  const [adminStep, setAdminStep] = useState<AdminStep>("creds");
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [adminPhoneHint, setAdminPhoneHint] = useState("");
  const [adminExpiresIn, setAdminExpiresIn] = useState<number | null>(null);

  useEffect(() => {
    if (ready && user) {
      router.replace(getDefaultRoute(user.role, user.employeeId));
    }
  }, [ready, user, router]);

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      // El PIN viaja en los dos campos, como hasta ahora. Desde el móvil el
      // servidor responde requiresOtp y manda un SMS a la ficha del empleado.
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pin, password: pin }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "PIN incorrecto. Pide tu PIN al encargado.");
        return;
      }

      if (data.requiresOtp) {
        setEmpPhoneHint(data.phoneHint || "");
        setEmpExpiresIn(data.expiresIn ?? null);
        setEmpStep("code");
        if (data.expiresIn) startCountdown(data.expiresIn, setEmpExpiresIn);
        return;
      }

      if (data.role) {
        router.push(getDefaultRoute(data.role, data.employeeId ?? null));
        return;
      }

      setError("PIN incorrecto. Pide tu PIN al encargado.");
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmployeeVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login/employee/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, code: empCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Código inválido");
        return;
      }

      window.location.assign(getDefaultRoute(data.role, data.employeeId ?? null));
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOfficeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: officeUser, password: officePass }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Usuario o contraseña incorrectos");
        return;
      }

      window.location.assign(getDefaultRoute(data.role, data.employeeId ?? null));
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminUser, password: adminPass }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Usuario o contraseña incorrectos");
        return;
      }

      if (data.requiresOtp) {
        setAdminPhoneHint(data.phoneHint || "");
        setAdminExpiresIn(data.expiresIn ?? null);
        setAdminStep("code");

        if (data.expiresIn) startCountdown(data.expiresIn, setAdminExpiresIn);
        return;
      }

      if (data.role) {
        window.location.assign(getDefaultRoute(data.role, data.employeeId ?? null));
        return;
      }

      setError("Respuesta inesperada del servidor");
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: adminUser, password: adminPass, code: adminCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Código inválido");
        return;
      }

      window.location.assign(getDefaultRoute(data.role, data.employeeId ?? null));
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const formHandler =
    mode === "empleado"
      ? empStep === "pin"
        ? handleEmployeeSubmit
        : handleEmployeeVerify
      : mode === "oficina"
        ? handleOfficeSubmit
        : adminStep === "creds"
          ? handleAdminCreds
          : handleAdminVerify;

  const submitLabel = submitting
    ? "Verificando..."
    : mode === "empleado"
      ? empStep === "pin"
        ? "Entrar"
        : "Verificar"
      : mode === "oficina"
        ? "Entrar a Oficina"
        : adminStep === "creds"
          ? "Continuar"
          : "Verificar";

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
          {[
            { id: "empleado" as Mode, label: "Empleado" },
            { id: "oficina" as Mode, label: "Oficina" },
            { id: "admin" as Mode, label: "Admin" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setMode(t.id);
                setError("");
                setEmpStep("pin");
                setEmpCode("");
                setEmpExpiresIn(null);
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

        <form onSubmit={formHandler} className="space-y-4">
          {mode === "empleado" ? (
            empStep === "pin" ? (
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
              <CodeFields
                code={empCode}
                onCode={setEmpCode}
                phoneHint={empPhoneHint}
                expiresIn={empExpiresIn}
                onBack={() => {
                  setEmpStep("pin");
                  setEmpCode("");
                  setEmpExpiresIn(null);
                  setError("");
                }}
              />
            )
          ) : mode === "oficina" ? (
            <>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Usuario</span>
                <input
                  type="text"
                  value={officeUser}
                  onChange={(e) => setOfficeUser(e.target.value)}
                  className={inputClass}
                  autoComplete="username"
                  required
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Contraseña</span>
                <input
                  type="password"
                  value={officePass}
                  onChange={(e) => setOfficePass(e.target.value)}
                  className={inputClass}
                  autoComplete="current-password"
                  required
                />
              </label>
              <p className="text-center text-xs text-gray-500">
                Acceso de oficina para la gestión diaria. Permisos limitados frente a Admin.
              </p>
            </>
          ) : adminStep === "creds" ? (
            <>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Usuario</span>
                <input
                  type="text"
                  value={adminUser}
                  onChange={(e) => setAdminUser(e.target.value)}
                  className={inputClass}
                  autoComplete="username"
                  required
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Contraseña</span>
                <input
                  type="password"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  className={inputClass}
                  autoComplete="current-password"
                  required
                />
              </label>
              <p className="text-center text-xs text-gray-500">
                Tras la contraseña recibirás un código SMS de verificación.
              </p>
            </>
          ) : (
            <CodeFields
              code={adminCode}
              onCode={setAdminCode}
              phoneHint={adminPhoneHint}
              expiresIn={adminExpiresIn}
              onBack={() => {
                setAdminStep("creds");
                setAdminCode("");
                setAdminExpiresIn(null);
                setError("");
              }}
            />
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-karuma-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-karuma-700 disabled:opacity-60"
          >
            {submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
