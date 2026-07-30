"use client";

// Registro de MFA TOTP (Authenticator). Muestra el QR y la clave manual para
// que el propietario los añada a su app. La clave NUNCA se registra en logs ni
// en tablas de negocio. Tras verificar el primer código, la sesión pasa a aal2.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldAlert } from "lucide-react";
import { getSupabaseAuthBrowser } from "@/lib/supabase/ssr-browser";
import { completeMfaBridge } from "@/lib/owner/mfa-client";

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-center text-lg tracking-[0.4em] text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20";

export default function SetupMfaPage() {
  const router = useRouter();
  const [factorId, setFactorId] = useState("");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "verifying" | "error">(
    "loading",
  );
  const [error, setError] = useState("");

  const enroll = useCallback(async () => {
    setStatus("loading");
    setError("");
    const supabase = getSupabaseAuthBrowser();
    if (!supabase) {
      setError("Acceso seguro no disponible.");
      setStatus("error");
      return;
    }
    // Limpia factores TOTP sin verificar para no acumularlos.
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      for (const f of factors?.all ?? []) {
        if (f.factor_type === "totp" && f.status === "unverified") {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }
    } catch {
      /* no bloqueante */
    }

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
    });
    if (enrollError || !data) {
      setError("No se pudo iniciar el registro. Inténtalo de nuevo.");
      setStatus("error");
      return;
    }
    setFactorId(data.id);
    setQr(data.totp.qr_code);
    setSecret(data.totp.secret);
    setStatus("ready");
  }, []);

  useEffect(() => {
    void enroll();
  }, [enroll]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const supabase = getSupabaseAuthBrowser();
    if (!supabase) return;
    setStatus("verifying");
    try {
      const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (chErr || !challenge) throw new Error("challenge");
      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: code.trim(),
      });
      if (verifyErr) throw new Error("verify");
      const redirect = await completeMfaBridge();
      router.replace(redirect);
    } catch {
      setError("Código incorrecto. Revisa tu app Authenticator.");
      setStatus("ready");
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-white">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Configura la verificación en dos pasos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Escanea el código con Google Authenticator, Authy o similar.
          </p>
        </div>

        {status === "loading" && (
          <p className="py-8 text-center text-sm text-gray-500">Generando código…</p>
        )}

        {status === "error" && (
          <div className="space-y-3 text-center">
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            <button
              onClick={() => void enroll()}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"
            >
              Reintentar
            </button>
          </div>
        )}

        {(status === "ready" || status === "verifying") && (
          <>
            <div className="mb-4 flex justify-center">
              {qr.startsWith("<svg") ? (
                <div
                  className="h-44 w-44"
                  // QR generado por Supabase; contenido SVG controlado.
                  dangerouslySetInnerHTML={{ __html: qr }}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt="Código QR MFA" className="h-44 w-44" />
              )}
            </div>

            <div className="mb-4 rounded-lg bg-gray-50 p-3 text-center">
              <p className="text-xs text-gray-500">Clave manual (si no puedes escanear)</p>
              <p className="mt-1 break-all font-mono text-sm text-gray-800">{secret}</p>
            </div>

            <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Guarda una copia de seguridad de tu app Authenticator. Si pierdes el
                dispositivo necesitarás al administrador para restablecer el acceso. No
                compartas esta clave con nadie.
              </span>
            </div>

            <form onSubmit={handleVerify} className="space-y-3">
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className={inputClass}
                placeholder="000000"
                autoComplete="one-time-code"
                required
              />
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              )}
              <button
                type="submit"
                disabled={status === "verifying" || code.length !== 6}
                className="inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
              >
                {status === "verifying" ? "Verificando…" : "Activar y continuar"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
