/** Forma de los hilos y mensajes tal y como los devuelve /api/inbox. */

export type ThreadResumen = {
  id: string;
  platform: string;
  kind: string;
  customer_name: string | null;
  customer_username: string | null;
  customer_avatar_url: string | null;
  language: string | null;
  rating: number | null;
  sentiment: number | null;
  intents: string[];
  is_complaint: boolean;
  status: string;
  priority: string;
  unread: boolean;
  first_inbound_at: string | null;
  last_inbound_at: string | null;
  last_message_at: string | null;
  replied: boolean;
  replied_at: string | null;
  permalink: string | null;
};

export type MensajeApi = {
  id: string;
  direction: "in" | "out";
  author_name: string | null;
  author_username: string | null;
  body: string | null;
  attachments: unknown[];
  sent_at: string | null;
  received_at: string;
};

export type SugerenciaApi = {
  id: string;
  model: string;
  language: string | null;
  reply_text: string;
  analysis: Record<string, unknown>;
  used?: boolean;
  created_at: string;
};

export type Contadores = {
  total: number;
  porPlataforma: Record<string, number>;
  urgentes: number;
};

/** Iniciales para el avatar cuando la plataforma no da foto. */
export function iniciales(nombre: string | null): string {
  if (!nombre) return "?";
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

export const ETIQUETAS_INTENCION: Record<string, string> = {
  reserva: "Reserva",
  precio: "Precio",
  horario: "Horario",
  queja: "Queja",
  alergia: "Alergia",
  grupo: "Grupo",
  elogio: "Elogio",
  otro: "Otro",
};
