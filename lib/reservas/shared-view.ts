import type { ServicioLocal } from "./local-store";

const SERVICIO_KEY = "karuma_shared_servicio";

export function getSharedServicio(): ServicioLocal | null {
  if (typeof window === "undefined") return null;

  const servicio = localStorage.getItem(SERVICIO_KEY);
  return servicio === "comida" || servicio === "cena" ? servicio : null;
}

export function setSharedServicio(servicio: ServicioLocal) {
  if (typeof window !== "undefined") {
    localStorage.setItem(SERVICIO_KEY, servicio);
  }
}
