"use client";

import { useRef, useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { fetchPayrollPdf, PayrollDownloadError } from "@/lib/payroll/download";

export function PayrollDownloadButton({ url, locale = "es", label }: { url: string; locale?: "es" | "zh"; label?: string }) {
  const busy = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const text = locale === "zh" ? {
    download: "下载 PDF", loading: "准备中…", failed: "下载失败，请重试。", login: "登录已过期，请重新登录后下载。", forbidden: "此账号无权下载这份工资单。", missing: "这份工资单目前不可用，请刷新列表。", saved: "已请求下载。若手机打开 PDF 预览，可用分享菜单保存到文件。",
  } : {
    download: "Descargar PDF", loading: "Preparando…", failed: "No se pudo descargar. Inténtalo de nuevo.", login: "La sesión ha caducado. Inicia sesión de nuevo.", forbidden: "Esta cuenta no puede descargar esta nómina.", missing: "Esta nómina ya no está disponible. Actualiza la lista.", saved: "Descarga solicitada. Si se abre una vista previa, usa Compartir para guardar el PDF en Archivos.",
  };
  async function download() {
    if (busy.current) return;
    busy.current = true; setLoading(true); setError(""); setStarted(false);
    try {
      const { blob, filename } = await fetchPayrollPdf(url);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl; anchor.download = filename;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      setStarted(true);
    } catch (failure) {
      const status = failure instanceof PayrollDownloadError ? failure.status : 0;
      setError(status === 401 ? text.login : status === 403 ? text.forbidden : status === 404 ? text.missing : text.failed);
    } finally { busy.current = false; setLoading(false); }
  }
  return <span className="my-1 inline-flex max-w-full flex-col items-start gap-2">
    <button type="button" onClick={() => void download()} disabled={loading} aria-busy={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-karuma-600 px-3 py-2 text-sm font-semibold text-white hover:bg-karuma-700 disabled:opacity-60">
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
      {loading ? text.loading : label ?? text.download}
    </button>
    {error && <span role="alert" className="text-sm text-red-400">{error}</span>}
    {started && <span role="status" className="text-xs text-gray-400">{text.saved}</span>}
  </span>;
}
