"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Upload } from "lucide-react";

export default function UploadInvoicesPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selectedFiles]);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setMessage("Por favor selecciona al menos un archivo");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/stock/upload-invoices", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ ${data.count} facturas subidas correctamente`);
        setFiles([]);
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Subir Facturas"
        description="Carga las PDFs de facturas de Makro para extraer productos automáticamente"
      />

      <div className="max-w-2xl rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <p className="mb-2 text-sm font-medium text-gray-900">
            Arrastra archivos aquí o haz clic para seleccionar
          </p>
          <p className="mb-4 text-xs text-gray-500">
            Solo PDFs de facturas (.pdf)
          </p>
          <input
            type="file"
            multiple
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
            id="file-input"
          />
          <label htmlFor="file-input" className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Seleccionar archivos
          </label>
        </div>

        {files.length > 0 && (
          <div className="mb-6 rounded-lg bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-900">
              {files.length} archivo{files.length > 1 ? "s" : ""} seleccionado{files.length > 1 ? "s" : ""}:
            </p>
            <ul className="mt-2 space-y-1">
              {files.map((file, i) => (
                <li key={i} className="text-xs text-blue-700">
                  • {file.name}
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setFiles([])}
            >
              Limpiar selección
            </Button>
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900">
            {message}
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={files.length === 0 || loading}
          className="w-full"
        >
          {loading ? "Subiendo..." : "Subir facturas"}
        </Button>

        <p className="mt-4 text-xs text-gray-500">
          Las facturas se procesarán automáticamente y los productos se añadirán al inventario.
        </p>
      </div>
    </div>
  );
}
