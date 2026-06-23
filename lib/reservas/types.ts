export type Servicio = "comida" | "cena";
export type EstadoReserva = "Confirmada" | "Sentado" | "Finalizada" | "Cancelada" | "NoShow" | "WalkIn";

export interface Mesa {
  id: number;
  numero: number;
  capacidad: number;
  zona: string | null;
  combinable: boolean;
  activa: boolean;
  pos_x: number | null;
  pos_y: number | null;
}

export interface ClienteReserva {
  id: string;
  nombre: string;
  telefono: string;
  email: string | null;
  visitas: number;
  no_shows: number;
  vip: boolean;
  bloqueado: boolean;
  notas: string | null;
  ultima_visita: string | null;
  created_at: string;
}

export interface Reserva {
  id: string;
  cliente_id: string | null;
  cliente?: ClienteReserva;
  fecha: string;
  hora_inicio: string;
  duracion_min: number;
  servicio: Servicio;
  personas: number;
  mesa_ids: number[];
  estado: EstadoReserva;
  notas: string | null;
  origen: "online" | "telefono" | "walkin" | "manual";
  review_email_sent_at: string | null;
  created_at: string;
}

export interface ReservasConfig {
  reservas_online_activas: boolean;
  max_personas_online: number;
  intervalo_min: number;
  turno_gap_min: number;
  duracion_1_2_min: number;
  duracion_3_4_min: number;
  dias_max_antelacion: number;
  capacidad_online_pct: number;
  comida_inicio: string;
  comida_fin: string;
  cena_inicio: string;
  cena_fin: string;
  telefono: string | null;
  whatsapp: string | null;
  google_review_link: string | null;
}

/** Horario por día de la semana (0=Dom … 6=Sab) */
export interface HorarioDia {
  dia: number;           // 0 domingo … 6 sábado
  activo: boolean;       // si el restaurante abre ese día
  comida_activa: boolean;
  comida_inicio: string; // "HH:MM"
  comida_fin: string;    // último pase "HH:MM"
  cena_activa: boolean;
  cena_inicio: string;
  cena_fin: string;
}

/** Slot horario calculado para mostrar al cliente */
export interface SlotDisponible {
  hora: string;
  disponible: boolean;
}
