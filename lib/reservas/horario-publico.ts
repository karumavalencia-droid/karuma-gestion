import type { HorarioDia, ReservasConfig } from "./types";

// Horario de apertura del local; ultimoPase es la última hora aceptada para reservar.
export const APERTURA = {
  comida: { inicio: "13:00", ultimoPase: "15:30" },
  cena: { inicio: "19:00", ultimoPase: "22:00", cierre: "23:30" },
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
  const ultimoPaseConfig = servicio === "comida" ? config.comida_fin : config.cena_fin;
  const horaMin = minutos(hora);
  // El restaurante puede seguir abierto después del último pase de reservas.
  // Comida: último pase 15:30. Cena: último pase 22:00.
  return Number.isFinite(horaMin) && Number.isFinite(duracionMin)
    && horaMin >= Math.max(minutos(apertura.inicio), minutos(inicio))
    && horaMin <= Math.min(minutos(ultimoPaseConfig), minutos(apertura.ultimoPase));
}
