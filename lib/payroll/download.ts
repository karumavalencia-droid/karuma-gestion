export class PayrollDownloadError extends Error {
  constructor(public status: number) { super("Payroll download failed"); }
}

export async function fetchPayrollPdf(url: string): Promise<{ blob: Blob; filename: string }> {
  if (!/^\/api\/nominas\/[0-9a-f-]+\/download$/i.test(url)) throw new PayrollDownloadError(400);
  const response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new PayrollDownloadError(response.status);
  if (!response.headers.get("content-type")?.toLowerCase().startsWith("application/pdf")) throw new PayrollDownloadError(502);
  const blob = await response.blob();
  if (!blob.size) throw new PayrollDownloadError(502);
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(response.headers.get("content-disposition") ?? "")?.[1];
  let filename = "Nomina.pdf";
  if (encoded) {
    try { filename = decodeURIComponent(encoded).replace(/[\\/\x00-\x1f]/g, "_"); } catch { /* Keep the fallback filename. */ }
  }
  return { blob, filename };
}
