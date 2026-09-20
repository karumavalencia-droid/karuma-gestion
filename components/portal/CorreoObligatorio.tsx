"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";

/**
 * Pantalla que tapa el portal hasta que el empleado registra su correo.
 *
 * Solo sale a las cuentas de empleado cuya ficha no tiene una dirección real
 * (las que hoy llevan el `@karuma.es` de relleno, o ninguna). Con el correo
 * guardado, el portal puede mandarle su nómina, los avisos y —cuando el
 * dominio esté verificado— el código para entrar desde el móvil.
 *
 * Si la consulta falla, NO se tapa nada: el portal es por donde se ficha.
 */
export function CorreoObligatorio() {
  const { user, ready } = useAuth();
  const [pendiente, setPendiente] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!ready || !user?.employeeId) {
      setPendiente(false);
      return;
    }

    let vigente = true;
    fetch("/api/portal/correo", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .then((data: { pendiente?: boolean } | null) => {
        if (vigente) setPendiente(data?.pendiente === true);
      });

    return () => {
      vigente = false;
    };
  }, [ready, user?.employeeId]);

  const guardar = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setGuardando(true);
      try {
        const res = await fetch("/api/portal/correo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "No se pudo guardar. Inténtalo otra vez.");
          return;
        }
        setPendiente(false);
      } catch {
        setError("Sin conexión. Inténtalo otra vez.");
      } finally {
        setGuardando(false);
      }
    },
    [email],
  );

  if (!pendiente) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-tinta/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[95vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:max-w-md sm:rounded-2xl">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-karuma-50 text-karuma-600">
          <Mail className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Registra tu correo</h2>
        <p className="mt-2 text-sm text-gray-600">
          Antes de seguir, apunta tu correo personal. Es donde recibirás tu nómina,
          los avisos del restaurante y el código para entrar desde el móvil.
        </p>

        <form onSubmit={guardar} className="mt-5 space-y-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Tu correo</span>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-base text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20"
              placeholder="tunombre@gmail.com"
              autoComplete="email"
              inputMode="email"
              autoFocus
              required
            />
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={guardando}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-karuma-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-karuma-700 disabled:opacity-60"
          >
            {guardando ? "Guardando…" : "Guardar y continuar"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-500">
          ¿No tienes correo? Pídele ayuda al encargado antes de seguir.
        </p>
      </div>
    </div>
  );
}
