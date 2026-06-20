import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { calcularSlotsDisponibles } from "@/lib/reservas/disponibilidad";
import type { Mesa, Reserva, ReservasConfig } from "@/lib/reservas/types";

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

  const [{ data: mesas }, { data: reservas }, { data: configData }] = await Promise.all([
    supabase.from("mesas").select("*").eq("activa", true),
    supabase.from("reservas").select("*").eq("fecha", fecha),
    supabase.from("reservas_config").select("*").eq("id", 1).single(),
  ]);

  if (!mesas || !configData) {
    return NextResponse.json({ error: "Error al cargar datos" }, { status: 500 });
  }

  let slots = calcularSlotsDisponibles(
    mesas as Mesa[],
    (reservas ?? []) as Reserva[],
    configData as ReservasConfig,
    fecha,
    servicio,
    personas,
  );

  // Filter past slots and min-advance slots for today
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
