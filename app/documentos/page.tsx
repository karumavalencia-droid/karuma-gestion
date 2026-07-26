"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import {
  DOCUMENTO_CATEGORIA_LABELS,
  DOCUMENTO_CATEGORIAS,
} from "@/lib/documentos/constants";
import type { DbDocumentoCategoria } from "@/lib/supabase/types";
import { Download, FileText, Trash2, Upload } from "lucide-react";

type Documento = {
  id: string;
  nombre: string;
  categoria: DbDocumentoCategoria;
  mime_type: string | null;
  tamano_bytes: number | null;
  notas: string | null;
  created_at: string;
};

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20";

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentosPage() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [filtro, setFiltro] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [categoria, setCategoria] = useState<DbDocumentoCategoria>("bancos");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url = filtro ? `/api/documentos?categoria=${filtro}` : "/api/documentos";
      const res = await fetch(url, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Error cargando documentos");
      setDocumentos(body.documentos ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando documentos");
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.set("file", file);
        form.set("categoria", categoria);
        const res = await fetch("/api/documentos", { method: "POST", body: form });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || `Error subiendo ${file.name}`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error subiendo el archivo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDescargar = async (id: string) => {
    const res = await fetch(`/api/documentos/${id}`);
    const body = await res.json();
    if (res.ok && body.url) {
      window.open(body.url, "_blank", "noopener");
    } else {
      setError(body.error || "Error generando descarga");
    }
  };

  const handleEliminar = async (doc: Documento) => {
    if (!window.confirm(`¿Eliminar "${doc.nombre}"? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`/api/documentos/${doc.id}`, { method: "DELETE" });
    if (res.ok) {
      await load();
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.error || "Error eliminando el documento");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentos"
        description="Archivo confidencial — solo propietario. Bancos, contratos, nóminas, impuestos."
      />

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <Card title="Subir documento">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-gray-600">Categoría</span>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as DbDocumentoCategoria)}
              className={`${inputClass} w-auto`}
            >
              {DOCUMENTO_CATEGORIAS.map((cat) => (
                <option key={cat} value={cat}>
                  {DOCUMENTO_CATEGORIA_LABELS[cat]}
                </option>
              ))}
            </select>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => void handleUpload(e.target.files)}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-karuma-600 px-4 py-2 text-sm font-medium text-white hover:bg-karuma-700 disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Subiendo…" : "Elegir archivos"}
          </button>
          <p className="text-xs text-gray-500">
            PDF, imágenes, CSV… máx. 25 MB por archivo. Se guardan cifrados en el bucket
            privado; solo tú puedes verlos.
          </p>
        </div>
      </Card>

      <Card title="Archivo">
        <div className="mb-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFiltro("")}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filtro === ""
                ? "bg-karuma-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Todos
          </button>
          {DOCUMENTO_CATEGORIAS.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFiltro(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                filtro === cat
                  ? "bg-karuma-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {DOCUMENTO_CATEGORIA_LABELS[cat]}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Cargando…</p>
        ) : documentos.length === 0 ? (
          <p className="text-sm text-gray-500">No hay documentos en esta categoría.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {documentos.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 py-2.5">
                <FileText className="h-5 w-5 shrink-0 text-gray-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{doc.nombre}</p>
                  <p className="text-xs text-gray-500">
                    {DOCUMENTO_CATEGORIA_LABELS[doc.categoria] ?? doc.categoria} ·{" "}
                    {formatBytes(doc.tamano_bytes)} ·{" "}
                    {new Date(doc.created_at).toLocaleDateString("es-ES")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDescargar(doc.id)}
                  className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                  aria-label={`Descargar ${doc.nombre}`}
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleEliminar(doc)}
                  className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Eliminar ${doc.nombre}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
