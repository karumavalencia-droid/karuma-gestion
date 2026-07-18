"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getDefaultRoute } from "@/lib/auth/permissions";

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20";

type Mode = "empleado" | "oficina";
type OtpStep = "phone" | "code";

export default function LoginPage() {
  const router = useRouter();
  const { user, ready, login } = useAuth();
  const [mode, setMode] = useState<Mode>("empleado");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // OTP login state
  const [otpStep, setOtpStep] = useState<OtpStep>("phone");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpExpiresIn, setOtpExpiresIn] = useState<number | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);

  useEffect(() => {
    if (ready && user) {
      router.replace(getDefaultRoute(user.role, user.employeeId));
    }
  }, [ready, user, router]);

  // Employee PIN login (unchanged)
  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const loggedIn = await login(pin, pin);
    setSubmitting(false);

    if (!loggedIn) {
      setError("PIN incorrecto. Pide tu PIN al encargado.");
      return;
    }

    router.push(getDefaultRoute(loggedIn.role, loggedIn.employeeId));
  };

  // OTP login: request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOtpLoading(true);

    try {
      const res = await fetch("/api/auth/login/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Error solicitando OTP");
        setOtpLoading(false);
        return;
      }

      // OTP enviado correctamente
      setOtpExpiresIn(data.expiresIn);
      setOtpStep("code");

      // Countdown timer
      if (data.expiresIn) {
        let remaining = data.expiresIn;
        const timer = setInterval(() => {
          remaining--;
          setOtpExpiresIn(remaining);
          if (remaining <= 0) clearInterval(timer);
        }, 1000);
      }
    } catch (err) {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setOtpLoading(false);
    }
  };

  // OTP login: verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOtpLoading(true);

    try {
      const res = await fetch("/api/auth/login/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otpCode }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "OTP inválido");
        setOtpLoading(false);
        return;
      }

      // Si es nuevo usuario, redirigir a registro
      if (data.isNewUser) {
        // TODO: implementar página de registro
        router.push(`/auth/complete-profile?phone=${encodeURIComponent(phone)}`);
        return;
      }

      // Login exitoso - la cookie se estableció automáticamente
      router.push(getDefaultRoute(data.user.role, null));
    } catch (err) {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setOtpLoading(false);
    }
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

        <form
          onSubmit={mode === "empleado" ? handleEmployeeSubmit : otpStep === "phone" ? handleRequestOtp : handleVerifyOtp}
          className="space-y-4"
        >
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
          ) : otpStep === "phone" ? (
            <>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Número de teléfono</span>
                <input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  placeholder="+34 600 123 456"
                  required
                />
              </label>
              <p className="text-center text-xs text-gray-500">
                Recibirás un código de 6 dígitos por SMS.
              </p>
            </>
          ) : (
            <>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Código de verificación</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  className={`${inputClass} text-center text-3xl tracking-[0.3em] font-mono`}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  required
                />
              </label>
              <p className="text-center text-xs text-gray-500">
                {otpExpiresIn ? `Válido por ${otpExpiresIn}s` : "Código expirado, solicita uno nuevo"}
              </p>
              <button
                type="button"
                onClick={() => {
                  setOtpStep("phone");
                  setOtpCode("");
                  setOtpExpiresIn(null);
                }}
                className="w-full text-center text-xs text-karuma-600 hover:text-karuma-700 underline"
              >
                ← Cambiar número
              </button>
            </>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || otpLoading}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-karuma-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-karuma-700 disabled:opacity-60"
          >
            {otpLoading ? "Verificando..." : mode === "empleado" ? "Entrar" : otpStep === "phone" ? "Enviar código" : "Verificar"}
          </button>
        </form>
      </div>
    </div>
  );
}
