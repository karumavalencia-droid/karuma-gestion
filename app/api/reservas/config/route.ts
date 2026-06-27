import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    // Return safe defaults so public page always works
    return NextResponse.json({
      reservas_online_activas: true,
      max_personas_online: 4,
      dias_max_antelacion: 7,
      turno_gap_min: 30,
      telefono: "+34676706776",
      whatsapp: "+34676706776",
      comida_inicio: "13:00",
      comida_fin: "15:30",
      cena_inicio: "20:00",
      cena_fin: "23:00",
    });
  }

  // turno_gap_min se omite a propósito: la migración que añade esa columna aún no
  // está aplicada en producción. Si se incluye en el SELECT, la consulta falla y la
  // config cae a valores por defecto (horario incorrecto). La página pública no usa
  // ese campo, así que pedimos solo las columnas que existen seguro.
  const { data } = await supabase
    .from("reservas_config")
    .select(
      "reservas_online_activas, max_personas_online, dias_max_antelacion, telefono, whatsapp, comida_inicio, comida_fin, cena_inicio, cena_fin",
    )
    .eq("id", 1)
    .single();

  return NextResponse.json(
    data ?? {
      reservas_online_activas: true,
      max_personas_online: 4,
      dias_max_antelacion: 7,
      turno_gap_min: 30,
      telefono: "+34676706776",
      whatsapp: "+34676706776",
      comida_inicio: "13:00",
      comida_fin: "15:30",
      cena_inicio: "20:00",
      cena_fin: "23:00",
    },
  );
}
