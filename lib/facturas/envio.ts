import { empresaLabel } from "@/lib/facturas/helpers";
import { readFacturaAttachment } from "@/lib/facturas/storage";
import type { EmpresaFactura, Factura } from "@/lib/types";

export type EmpresaEnvio = Exclude<EmpresaFactura, "">;

// Destinatarios por defecto de cada asesoría; se pueden sobreescribir por env.
const ASESORIAS: Record<EmpresaEnvio, { email: string; envVar: string }> = {
  kosushi: { email: "agi2grupoasesor@gmail.com", envVar: "FACTURAS_EMAIL_KOSUSHI" },
  spicy: { email: "sociedades.yaou@gmail.com", envVar: "FACTURAS_EMAIL_SPICY" },
};

// Resend admite hasta 40 MB por petición; el base64 infla ~37%, así que
// agrupamos adjuntos en tandas de como mucho 15 MB de bytes originales.
const MAX_ATTACHMENT_BYTES_PER_EMAIL = 15 * 1024 * 1024;

export type EnvioResult =
  | { sent: true; emails: number; facturaIds: string[]; recipient: string }
  | { sent: false; error: string };

export function asesoriaEmail(empresa: EmpresaEnvio): string {
  const config = ASESORIAS[empresa];
  return process.env[config.envVar]?.trim() || config.email;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatEuro(value: number): string {
  return `${value.toFixed(2).replace(".", ",")} €`;
}

type Attachment = { filename: string; content: string };

type LoadedFactura = {
  factura: Factura;
  attachment: Attachment | null;
  bytes: number;
};

function attachmentFileName(factura: Factura, index: number): string {
  const base = factura.archivoNombre?.trim();
  if (base) return `${factura.fecha}_${base}`;
  const ext = factura.archivoTipo.includes("pdf") ? "pdf" : "bin";
  return `${factura.fecha}_factura-${index + 1}.${ext}`;
}

async function loadAttachment(factura: Factura, index: number): Promise<LoadedFactura> {
  if (factura.archivoData) {
    const match = factura.archivoData.match(/^data:[^;,]+;base64,(.+)$/);
    if (match) {
      const content = match[1];
      return {
        factura,
        attachment: { filename: attachmentFileName(factura, index), content },
        bytes: Math.ceil((content.length * 3) / 4),
      };
    }
  }

  if (factura.archivoPath) {
    const file = await readFacturaAttachment(factura.archivoPath);
    if (file) {
      return {
        factura,
        attachment: {
          filename: attachmentFileName(factura, index),
          content: Buffer.from(file.bytes).toString("base64"),
        },
        bytes: file.bytes.byteLength,
      };
    }
  }

  return { factura, attachment: null, bytes: 0 };
}

function buildListado(facturas: Factura[], sinAdjunto: Factura[]) {
  const total = facturas.reduce((sum, f) => sum + f.importe, 0);

  const textLines = facturas.map(
    (f, i) =>
      `${i + 1}. [${f.fecha}] ${f.proveedor} — ${formatEuro(f.importe)} (${f.categoria})`,
  );

  const rows = facturas
    .map(
      (f, i) => `
        <tr>
          <td style="padding:6px 10px;color:#6b7280">${i + 1}</td>
          <td style="padding:6px 10px">${escapeHtml(f.fecha)}</td>
          <td style="padding:6px 10px">${escapeHtml(f.proveedor)}</td>
          <td style="padding:6px 10px;text-align:right;font-weight:600">${escapeHtml(formatEuro(f.importe))}</td>
          <td style="padding:6px 10px;color:#6b7280">${escapeHtml(f.categoria)}</td>
        </tr>`,
    )
    .join("");

  const sinAdjuntoNote =
    sinAdjunto.length > 0
      ? `Nota: ${sinAdjunto.length} factura(s) del listado no tienen PDF adjunto (solo constan los datos).`
      : "";

  return { total, textLines, rows, sinAdjuntoNote };
}

async function sendResendEmail(payload: Record<string, unknown>): Promise<string | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return "RESEND_API_KEY no está configurada";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    return `Resend devolvió ${response.status}${details ? `: ${details.slice(0, 200)}` : ""}`;
  }

  return null;
}

export async function enviarFacturasAsesoria(
  empresa: EmpresaEnvio,
  facturas: Factura[],
): Promise<EnvioResult> {
  const from = process.env.FACTURAS_EMAIL_FROM?.trim() || process.env.RESERVAS_EMAIL_FROM;
  if (!process.env.RESEND_API_KEY || !from) {
    return {
      sent: false,
      error: "Falta configurar RESEND_API_KEY o el remitente (FACTURAS_EMAIL_FROM / RESERVAS_EMAIL_FROM)",
    };
  }
  if (facturas.length === 0) {
    return { sent: false, error: "No hay facturas para enviar" };
  }

  const recipient = asesoriaEmail(empresa);
  const ordenadas = [...facturas].sort((a, b) => a.fecha.localeCompare(b.fecha));

  const loaded: LoadedFactura[] = [];
  for (const [index, factura] of ordenadas.entries()) {
    loaded.push(await loadAttachment(factura, index));
  }

  const sinAdjunto = loaded.filter((l) => !l.attachment).map((l) => l.factura);
  const { total, textLines, rows, sinAdjuntoNote } = buildListado(ordenadas, sinAdjunto);

  // Agrupar adjuntos en tandas que respeten el límite de tamaño por email.
  const batches: Attachment[][] = [];
  let current: Attachment[] = [];
  let currentBytes = 0;
  for (const item of loaded) {
    if (!item.attachment) continue;
    if (current.length > 0 && currentBytes + item.bytes > MAX_ATTACHMENT_BYTES_PER_EMAIL) {
      batches.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(item.attachment);
    currentBytes += item.bytes;
  }
  if (current.length > 0) batches.push(current);
  if (batches.length === 0) batches.push([]);

  const empresaNombre = empresaLabel(empresa);
  const periodo = `${ordenadas[0].fecha} a ${ordenadas[ordenadas.length - 1].fecha}`;

  for (const [batchIndex, attachments] of batches.entries()) {
    const parte = batches.length > 1 ? ` (parte ${batchIndex + 1}/${batches.length})` : "";
    const subject = `Facturas ${empresaNombre} — ${periodo}${parte}`;

    const text = [
      "Estimados,",
      "",
      `Adjuntamos las facturas de ${empresaNombre} correspondientes al período ${periodo}.`,
      "",
      `Total: ${ordenadas.length} facturas, ${formatEuro(total)}`,
      "",
      ...textLines,
      "",
      sinAdjuntoNote,
      "",
      "Saludos cordiales,",
      "Karuma Gestión",
    ]
      .filter((line, i, arr) => line !== "" || arr[i - 1] !== "")
      .join("\n");

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:640px;margin:0 auto;padding:24px">
        <h1 style="font-size:20px;margin:0 0 8px">Facturas ${escapeHtml(empresaNombre)}</h1>
        <p style="margin:0 0 16px;color:#4b5563">Período ${escapeHtml(periodo)}${parte ? escapeHtml(parte) : ""}</p>
        <p>Estimados,</p>
        <p>Adjuntamos las facturas de ${escapeHtml(empresaNombre)}. Resumen: <strong>${ordenadas.length} facturas</strong>, total <strong>${escapeHtml(formatEuro(total))}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:12px;overflow:hidden;margin:20px 0;font-size:13px">
          <thead>
            <tr style="text-align:left;color:#6b7280">
              <th style="padding:6px 10px">#</th>
              <th style="padding:6px 10px">Fecha</th>
              <th style="padding:6px 10px">Proveedor</th>
              <th style="padding:6px 10px;text-align:right">Importe</th>
              <th style="padding:6px 10px">Categoría</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        ${sinAdjuntoNote ? `<p style="font-size:13px;color:#b45309">${escapeHtml(sinAdjuntoNote)}</p>` : ""}
        <p>Quedamos a disposición para cualquier aclaración.</p>
        <p style="margin-top:16px">Saludos cordiales,<br/>Karuma Gestión</p>
      </div>
    `;

    const error = await sendResendEmail({
      from,
      to: recipient,
      ...(process.env.FACTURAS_EMAIL_REPLY_TO
        ? { reply_to: process.env.FACTURAS_EMAIL_REPLY_TO }
        : {}),
      subject,
      text,
      html,
      ...(attachments.length > 0 ? { attachments } : {}),
    });

    if (error) {
      return {
        sent: false,
        error:
          batchIndex === 0
            ? `No se pudo enviar el email: ${error}`
            : `Se enviaron ${batchIndex} de ${batches.length} emails y luego falló: ${error}`,
      };
    }
  }

  return {
    sent: true,
    emails: batches.length,
    facturaIds: ordenadas.map((f) => f.id),
    recipient,
  };
}
