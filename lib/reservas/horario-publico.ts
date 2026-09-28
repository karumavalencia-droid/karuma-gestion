import type { HorarioDia, ReservasConfig } from "./types";

// Horario de apertura del local; los campos *_fin de reservas son últimos pases.
export const APERTURA = {
  comida: { inicio: "13:00", cierre: "17:00", ultimoPase: "15:30" },
  cena: { inicio: "19:00", cierre: "23:30" },
} as const;

function minutos(hora: string): number {
  const [h, m] = hora.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

export function horarioEfectivo(config: ReservasConfig, dia?: HorarioDia | null): ReservasConfig {
  return dia ? {
    ...config,
    comida_inicio: dia.comida_inicio,
    comida_fin: dia.comida_fin,
    cena_inicio: dia.cena_inicio,
    cena_fin: dia.cena_fin,
  } : config;
}

export function reservaDentroDeHorario(
  hora: string,
  servicio: "comida" | "cena",
  duracionMin: number,
  config: ReservasConfig,
): boolean {
  const apertura = APERTURA[servicio];
  const inicio = servicio === "comida" ? config.comida_inicio : config.cena_inicio;
  const ultimoPase = servicio === "comida" ? config.comida_fin : config.cena_fin;
  const horaMin = minutos(hora);
  return Number.isFinite(horaMin) && Number.isFinite(duracionMin)
    && horaMin >= Math.max(minutos(apertura.inicio), minutos(inicio))
    && horaMin <= Math.min(minutos(ultimoPase), "ultimoPase" in apertura ? minutos(apertura.ultimoPase) : Infinity)
    // La cena admite el último pase a las 22:00 aunque la duración estándar
    // de la mesa sobrepase las 23:30; al mediodía se respeta el cierre a las 17:00.
    && (servicio === "cena" || horaMin + duracionMin <= minutos(apertura.cierre));
}
