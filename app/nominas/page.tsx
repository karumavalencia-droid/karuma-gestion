"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, FileText, LoaderCircle, UploadCloud } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";

type Staff = { id: string; name: string; position?: string };

export default function NominasAdminPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/staff", { cache: "no-store" });
        if (!response.ok) throw new Error("No se pudo cargar la plantilla de empleados.");
        const data = (await response.json()) as Staff[];
        setStaff(data.filter((item) => item.id));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Error cargando empleados.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const upload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (uploading || !employeeId || !periodo || !file) return;
    setUploading(true);
    setError("");
    setMessage("");

    const form = new FormData();
    form.set("file", file);
    form.set("categoria", "nominas");
    form.set("employee_id", employeeId);
    form.set("periodo", periodo);

    try {
      const response = await fetch("/api/documentos", { method: "POST", body: form });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No se pudo guardar la nómina.");
      setMessage("Nómina guardada. El empleado ya puede verla desde su móvil.");
      setFile(null);
      const input = document.getElementById("payroll-file") as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Error guardando la nómina.");
    } finally {
      setUploading(false);
    }
  };

  if (user && user.role !== "owner") {
    return <main className="min-h-screen bg-gray-950 p-6 text-white">Solo el propietario puede gestionar nóminas.</main>;
  }

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Nóminas</h1>
            <p className="text-sm text-gray-400">Sube cada nómina asociada a su empleado y mes.</p>
          </div>
        </div>

        <form onSubmit={upload} className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <label className="block">
            <span className="mb-2 block text-sm text-gray-300">Empleado</span>
            <select
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              disabled={loading || uploading}
              className="w-full rounded-xl border border-white/10 bg-gray-900 px-3 py-3 text-white outline-none"
            >
              <option value="">Selecciona un empleado</option>
              {staff.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.name}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-gray-300">Mes</span>
            <input
              type="month"
              value={periodo}
              onChange={(event) => setPeriodo(event.target.value)}
              disabled={uploading}
              className="w-full rounded-xl border border-white/10 bg-gray-900 px-3 py-3 text-white outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-gray-300">PDF de la nómina</span>
            <div className="rounded-2xl border border-dashed border-white/15 bg-black/10 p-4">
              <input
                id="payroll-file"
                type="file"
                accept="application/pdf"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                disabled={uploading}
                className="block w-full text-sm text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-900"
              />
            </div>
          </label>

          {error && <div className="rounded-xl bg-red-400/10 p-3 text-sm text-red-200">{error}</div>}
          {message && <div className="flex items-center gap-2 rounded-xl bg-emerald-400/10 p-3 text-sm text-emerald-200"><CheckCircle2 className="h-4 w-4" />{message}</div>}

          <button
            type="submit"
            disabled={uploading || loading || !employeeId || !periodo || !file}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-medium text-gray-900 disabled:opacity-40"
          >
            {uploading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
            {uploading ? "Guardando…" : "Guardar nómina"}
          </button>
        </form>
      </div>
    </main>
  );
}
