// Envío de pedidos a proveedores por email (alternativa a WhatsApp).
// Reutiliza la misma cuenta de Resend que facturas/reservas.

export interface PedidoEmailItem {
  codigo: string;
  nombre: string;
  formato?: string;
  unidad?: string;
  cantidad: number;
}

export interface EnviarPedidoInput {
  supplierName: string;
  to: string;
  items: PedidoEmailItem[];
  observations?: string;
}

export interface EnviarPedidoResult {
  sent: boolean;
  recipient?: string;
  error?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatFecha(): string {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "long",
  }).format(new Date());
}

export function buildPedidoEmail(input: EnviarPedidoInput): {
  subject: string;
  text: string;
  html: string;
} {
  const fecha = formatFecha();
  const observations = (input.observations ?? "").trim();
  const totalUnidades = input.items.reduce((total, item) => total + item.cantidad, 0);

  const textItems = input.items
    .map(
      (item) =>
        `Código: ${item.codigo}\nProducto: ${item.nombre}\nUnidad: ${
          item.unidad || item.formato || "unidad"
        }\nCantidad: ${item.cantidad}`,
    )
    .join("\n\n");

  const text = `Hola,

Soy Karuma Valencia.

Quiero realizar el siguiente pedido:

${textItems}

Total: ${input.items.length} referencias · ${totalUnidades} unidades

Observaciones:
${observations || "—"}

Gracias.`;

  const rows = input.items
    .map(
      (item) => `
        <tr>
          <td style="padding:6px 10px;color:#6b7280">${escapeHtml(item.codigo)}</td>
          <td style="padding:6px 10px">${escapeHtml(item.nombre)}</td>
          <td style="padding:6px 10px;color:#6b7280">${escapeHtml(
            item.unidad || item.formato || "unidad",
          )}</td>
          <td style="padding:6px 10px;text-align:right;font-weight:bold">${item.cantidad}</td>
        </tr>`,
    )
    .join("");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:640px;margin:0 auto;padding:24px">
      <h1 style="font-size:20px;margin:0 0 8px">Pedido a ${escapeHtml(input.supplierName)}</h1>
      <p style="margin:0 0 16px;color:#4b5563">${escapeHtml(fecha)}</p>
      <p>Hola,</p>
      <p>Soy Karuma Valencia. Quiero realizar el siguiente pedido:</p>
      <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:12px;overflow:hidden;margin:20px 0;font-size:13px">
        <thead>
          <tr style="text-align:left;color:#6b7280">
            <th style="padding:6px 10px">Código</th>
            <th style="padding:6px 10px">Producto</th>
            <th style="padding:6px 10px">Unidad</th>
            <th style="padding:6px 10px;text-align:right">Cantidad</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="font-size:13px;color:#4b5563">Total: <strong>${input.items.length} referencias</strong> · <strong>${totalUnidades} unidades</strong></p>
      ${
        observations
          ? `<p style="font-size:13px"><strong>Observaciones:</strong> ${escapeHtml(observations)}</p>`
          : ""
      }
      <p style="margin-top:16px">Gracias,<br/>Karuma Valencia</p>
    </div>
  `;

  return {
    subject: `Pedido Karuma Valencia — ${input.supplierName} — ${fecha}`,
    text,
    html,
  };
}

export async function enviarPedidoProveedor(
  input: EnviarPedidoInput,
): Promise<EnviarPedidoResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.PEDIDOS_EMAIL_FROM?.trim() ||
    process.env.FACTURAS_EMAIL_FROM?.trim() ||
    process.env.RESERVAS_EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    return {
      sent: false,
      error:
        "Falta configurar RESEND_API_KEY o el remitente (PEDIDOS_EMAIL_FROM / FACTURAS_EMAIL_FROM / RESERVAS_EMAIL_FROM)",
    };
  }
  if (input.items.length === 0) {
    return { sent: false, error: "El carrito está vacío" };
  }
  if (!isValidEmail(input.to)) {
    return { sent: false, error: "Email del proveedor no válido" };
  }

  const recipient = input.to.trim();
  const { subject, text, html } = buildPedidoEmail({ ...input, to: recipient });
  const replyTo =
    process.env.PEDIDOS_EMAIL_REPLY_TO?.trim() ||
    process.env.FACTURAS_EMAIL_REPLY_TO?.trim();

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: recipient,
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    return {
      sent: false,
      error: `Resend devolvió ${response.status}${details ? `: ${details.slice(0, 200)}` : ""}`,
    };
  }

  return { sent: true, recipient };
}
