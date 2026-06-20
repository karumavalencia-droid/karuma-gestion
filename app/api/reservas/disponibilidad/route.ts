import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { calcularSlotsDisponibles } from "@/lib/reservas/disponibilidad";
import type { Mesa, Reserva, ReservasConfig, HorarioDia } from "@/lib/reservas/types";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const fecha = searchParams.get("fecha");
  const servicio = searchParams.get("servicio") as "comida" | "cena" | null;
  const personas = parseInt(searchParams.get("personas") ?? "2", 10);

  if (!fecha || !servicio) {
    return NextResponse.json({ error: "fecha y servicio son requeridos" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  }

  // dia 0=Dom…6=Sáb — JS getDay() matches
  const diaSemana = new Date(fecha + "T12:00:00").getDay();

  const [
    { data: mesas },
    { data: reservas },
    { data: configData },
    { data: cierres },
    { data: horarioData },
  ] = await Promise.all([
    supabase.from("mesas").select("*").eq("activa", true),
    supabase.from("reservas").select("*").eq("fecha", fecha),
    supabase.from("reservas_config").select("*").eq("id", 1).single(),
    supabase.from("cierres_servicio").select("servicio").eq("fecha", fecha),
    supabase.from("horario_semanal").select("*").eq("dia", diaSemana).single(),
  ]);

  if (!mesas || !configData) {
    return NextResponse.json({ error: "Error al cargar datos" }, { status: 500 });
  }

  const horarioDia = horarioData as HorarioDia | null;

  // Restaurante cerrado ese día
  if (horarioDia && !horarioDia.activo) {
    return NextResponse.json({ slots: [], cerrado: true });
  }

  // Servicio desactivado para ese día
  if (horarioDia) {
    if (servicio === "comida" && !horarioDia.comida_activa) {
      return NextResponse.json({ slots: [], cerrado: true });
    }
    if (servicio === "cena" && !horarioDia.cena_activa) {
      return NextResponse.json({ slots: [], cerrado: true });
    }
  }

  // Cierre puntual (override manual)
  const cerrado = (cierres ?? []).some(
    (c) => c.servicio === servicio || c.servicio === "todo",
  );
  if (cerrado) {
    return NextResponse.json({ slots: [], cerrado: true });
  }

  // Build effective config — override global times with per-day horario
  const config = configData as ReservasConfig;
  const effectiveConfig: ReservasConfig = horarioDia
    ? {
        ...config,
        comida_inicio: horarioDia.comida_inicio,
        comida_fin:    horarioDia.comida_fin,
        cena_inicio:   horarioDia.cena_inicio,
        cena_fin:      horarioDia.cena_fin,
      }
    : config;

  let slots = calcularSlotsDisponibles(
    mesas as Mesa[],
    (reservas ?? []) as Reserva[],
    effectiveConfig,
    fecha,
    servicio,
    personas,
  );

  // Filter past/too-soon slots for today
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  if (fecha === todayStr) {
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const minAdvanceMin = 30;
    slots = slots.map((s) => {
      const [h, m] = s.hora.split(":").map(Number);
      const slotMin = h * 60 + m;
      if (slotMin < nowMin + minAdvanceMin) {
        return { ...s, disponible: false };
      }
      return s;
    });
  }

  return NextResponse.json({ slots });
}
