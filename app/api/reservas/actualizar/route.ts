import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { canMoveReservation } from "@/lib/reservas/helpers";
import { mesasOcupadasEnSlot } from "@/lib/reservas/disponibilidad";
import type { EstadoReserva, Reserva, ReservasConfig } from "@/lib/reservas/types";
import type { DbReserva } from "@/lib/supabase/types";

const MESA_NO_DISPONIBLE_ERROR =
  "Esta mesa no está disponible: cada reserva bloquea la mesa al menos 1h30.";

type ActualizarReservaBody = {
  action: "seat" | "liberar" | "estado" | "cambiar-mesa" | "editar";
  id: string;
  estado?: EstadoReserva;
  mesaIds?: number[];
  personas?: number;
  fecha?: string;
  hora?: string;
};

type ReservaUpdate = Partial<Omit<DbReserva, "id" | "created_at" | "updated_at">>;
type MesaCapacidad = { id: number; capacidad: number };

function duracionPorPersonas(personas: number, config: ReservasConfig): number {
  return personas <= 2 ? config.duracion_1_2_min : config.duracion_3_4_min;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as ActualizarReservaBody;

  const { action, id, estado, mesaIds } = body;

  if (!action || !id) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  }

  let update: ReservaUpdate;

  switch (action) {
    case "seat":
      update = { estado: "Sentado" as EstadoReserva };
      break;
    case "liberar":
      update = { estado: "Finalizada" as EstadoReserva };
      break;
    case "estado":
      if (!estado) return NextResponse.json({ error: "Falta estado" }, { status: 400 });
      update = { estado };
      break;
    case "cambiar-mesa":
      if (!mesaIds?.length) return NextResponse.json({ error: "Falta mesaIds" }, { status: 400 });
      {
        const [{ data: actual }, { data: configData }] = await Promise.all([
          supabase.from("reservas").select("*").eq("id", id).single(),
          supabase.from("reservas_config").select("*").eq("id", 1).single(),
        ]);
        if (!actual || !configData) {
          return NextResponse.json({ error: "Reserva o configuración no encontrada" }, { status: 404 });
        }

        const reserva = actual as Reserva;
        if (!canMoveReservation(reserva.estado)) {
          return NextResponse.json({ error: "Esta reserva ya no permite cambiar de mesa" }, { status: 409 });
        }
        if (reserva.mesa_ids.length === 0) {
          return NextResponse.json({ error: "Esta reserva todavía no tiene mesa asignada" }, { status: 409 });
        }

        const config = configData as ReservasConfig;
        const [{ data: reservasDia }, { data: mesasSeleccionadas }] = await Promise.all([
          supabase
            .from("reservas")
            .select("*")
            .eq("fecha", reserva.fecha),
          supabase
            .from("mesas")
            .select("id, capacidad")
            .in("id", mesaIds),
        ]);
        const ocupadas = mesasOcupadasEnSlot(
          ((reservasDia ?? []) as Reserva[]).filter((r) => r.id !== id),
          reserva.fecha,
          reserva.hora_inicio,
          reserva.duracion_min || duracionPorPersonas(reserva.personas, config),
          config.turno_gap_min ?? 30,
        );
        if (mesaIds.some((mesaId) => ocupadas.has(mesaId))) {
          return NextResponse.json({ error: MESA_NO_DISPONIBLE_ERROR }, { status: 409 });
        }

        const capacidad = ((mesasSeleccionadas ?? []) as MesaCapacidad[])
          .reduce((total, mesa) => total + mesa.capacidad, 0);
        if (capacidad < reserva.personas) {
          return NextResponse.json(
            { error: `Las mesas seleccionadas tienen ${capacidad} plazas para ${reserva.personas} personas.` },
            { status: 409 },
          );
        }
      }
      update = { mesa_ids: mesaIds };
      break;
    case "editar":
      {
        const [{ data: actual }, { data: configData }] = await Promise.all([
          supabase.from("reservas").select("*").eq("id", id).single(),
          supabase.from("reservas_config").select("*").eq("id", 1).single(),
        ]);
        if (!actual || !configData) {
          return NextResponse.json({ error: "Reserva o configuración no encontrada" }, { status: 404 });
        }

        const reserva = actual as Reserva;
        const config = configData as ReservasConfig;
        const nextPersonas =
          typeof body.personas === "number" && body.personas > 0 ? body.personas : reserva.personas;
        const nextFecha = body.fecha && body.fecha.length >= 8 ? body.fecha : reserva.fecha;
        const nextHora = body.hora && body.hora.length >= 4 ? body.hora : reserva.hora_inicio;
        const nextDuracion = duracionPorPersonas(nextPersonas, config);

        if (reserva.mesa_ids.length > 0) {
          const { data: reservasDia } = await supabase
            .from("reservas")
            .select("*")
            .eq("fecha", nextFecha);
          const ocupadas = mesasOcupadasEnSlot(
            ((reservasDia ?? []) as Reserva[]).filter((r) => r.id !== id),
            nextFecha,
            nextHora,
            nextDuracion,
            config.turno_gap_min ?? 30,
          );
          if (reserva.mesa_ids.some((mesaId) => ocupadas.has(mesaId))) {
            return NextResponse.json({ error: MESA_NO_DISPONIBLE_ERROR }, { status: 409 });
          }
        }

        update = {};
        if (typeof body.personas === "number" && body.personas > 0) {
          update.personas = body.personas;
          update.duracion_min = nextDuracion;
        }
        if (body.fecha && body.fecha.length >= 8) update.fecha = body.fecha;
        if (body.hora && body.hora.length >= 4) update.hora_inicio = body.hora;
      }
      if (Object.keys(update).length === 0) {
        return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
      }
      break;
    default:
      return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
  }

  const { error } = await supabase.from("reservas").update(update).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
