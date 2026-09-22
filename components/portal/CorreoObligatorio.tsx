"use client";

import { useEffect, useState } from "react";
import { KeyRound, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";

type Step = "email" | "verify";

export function CorreoObligatorio() {
  const { user, ready } = useAuth();
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [emailHint, setEmailHint] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ready || !user?.employeeId) return setPending(false);
    let active = true;
    fetch("/api/portal/correo", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudo comprobar la cuenta");
        return data as { pendiente?: boolean; email?: string | null };
      })
      .then((data) => {
        if (!active) return;
        setPending(data.pendiente === true);
        if (data.email) setEmail(data.email);
      })
      .catch((cause) => active && setError(cause instanceof Error ? cause.message : "Error de conexión"));
    return () => { active = false; };
  }, [ready, user?.employeeId]);

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setError(""); setSaving(true);
    try {
      const res = await fetch("/api/portal/correo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo enviar el código");
      setVerificationId(data.verificationId);
      setEmailHint(data.emailHint || email);
      setStep("verify");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error de conexión");
    } finally { setSaving(false); }
  }

  async function activate(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) return setError("Las contraseñas no coinciden.");
    setSaving(true);
    try {
      const res = await fetch("/api/portal/correo/verificar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationId, code, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo activar la cuenta");
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error de conexión");
    } finally { setSaving(false); }
  }

  if (!pending) return null;
  const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-base text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-tinta/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[95vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:max-w-md sm:rounded-2xl">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-karuma-50 text-karuma-600">
          {step === "email" ? <Mail className="h-6 w-6" /> : <KeyRound className="h-6 w-6" />}
        </div>
        <h2 className="text-lg font-semibold text-gray-900">
          {step === "email" ? "Protege tu cuenta" : "Verifica y crea tu contraseña"}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {step === "email"
            ? "Apunta tu correo personal. Recibirás un código para comprobar que es tuyo."
            : `Escribe el código enviado a ${emailHint} y crea una contraseña privada.`}
        </p>

        <form onSubmit={step === "email" ? requestCode : activate} className="mt-5 space-y-3">
          {step === "email" ? (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-gray-700">Tu correo personal</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className={inputClass} placeholder="tunombre@gmail.com" autoComplete="email" required autoFocus />
            </label>
          ) : (
            <>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Código de 6 cifras</span>
                <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className={`${inputClass} text-center text-2xl tracking-[0.35em]`} inputMode="numeric"
                  autoComplete="one-time-code" maxLength={6} required autoFocus />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Nueva contraseña</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className={inputClass} autoComplete="new-password" minLength={8} required />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Repite la contraseña</span>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass} autoComplete="new-password" minLength={8} required />
              </label>
              <p className="text-xs text-gray-500">Mínimo 8 caracteres, con una letra y un número.</p>
            </>
          )}
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={saving}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-karuma-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">
            {saving ? "Guardando…" : step === "email" ? "Enviar código" : "Activar cuenta"}
          </button>
          {step === "verify" && (
            <button type="button" onClick={() => { setStep("email"); setCode(""); setError(""); }}
              className="w-full text-center text-sm text-karuma-600">Cambiar correo</button>
          )}
        </form>
        <p className="mt-4 text-center text-xs text-gray-500">
          Después de activarla, el PIN antiguo dejará de funcionar.
        </p>
      </div>
    </div>
  );
}
