import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { DbReserva, DbSalesDaily, DbInventoryItem, DbTurno } from "@/lib/supabase/types";
import type { SessionUser } from "@/lib/auth/session";
import { computeMetrics, seedProfit } from "@/lib/profit/helpers";
import { seedReviews } from "@/lib/reviews/helpers";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export async function getTodaySales() {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase no configurado");

  const date = todayIso();
  const { data, error } = await supabase
    .from("sales_daily")
    .select("*")
    .eq("business_date", date)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()
    .returns<DbSalesDaily>();
  if (error) throw new Error(error.message);

  const netSales = Number(data?.net_sales ?? 0);
  const customers = Number(data?.customers ?? 0);
  const orders = Number(data?.orders ?? 0);
  const averageTicket = Number(
    data?.average_ticket ?? (customers > 0 ? netSales / customers : 0),
  );

  return {
    date,
    found: Boolean(data),
    netSales,
    grossSales: Number(data?.gross_sales ?? netSales),
    customers,
    orders,
    averageTicket,
    source: data?.source ?? null,
    locationId: data?.location_id ?? null,
    syncedAt: data?.synced_at ?? data?.updated_at ?? null,
  };
}

export async function getStaffSchedule() {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase no configurado");

  const today = new Date();
  const todayDay = today.getDay();
  const { data, error } = await supabase
    .from("turnos")
    .select("*")
    .eq("dia", todayDay)
    .order("employee_key", { ascending: true });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as DbTurno[];
  const byService = {
    comida: rows.filter((row) => row.servicio === "Comida"),
    cena: rows.filter((row) => row.servicio === "Cena"),
    descanso: rows.filter((row) => row.servicio === "Descanso"),
  };

  return {
    day: todayDay,
    total: rows.length,
    rows: rows.map((row) => ({
      employeeKey: row.employee_key,
      service: row.servicio,
      start: row.hora_inicio,
      end: row.hora_fin,
    })),
    byService,
  };
}

export async function getTodayReservations() {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase no configurado");

  const date = todayIso();
  const [{ data: reservations, error: reservationsError }, { data: tables, error: tablesError }] =
    await Promise.all([
      supabase.from("reservas").select("*").eq("fecha", date),
      supabase.from("mesas").select("id, numero, capacidad, activa").eq("activa", true),
    ]);

  if (reservationsError) throw new Error(reservationsError.message);
  if (tablesError) throw new Error(tablesError.message);

  const rows = (reservations ?? []) as DbReserva[];
  const confirmed = rows.filter((row) => row.estado === "Confirmada" || row.estado === "Sentado");
  const walkins = rows.filter((row) => row.origen === "walkin" || row.estado === "WalkIn");

  return {
    date,
    total: rows.length,
    confirmed: confirmed.length,
    walkins: walkins.length,
    seated: rows.filter((row) => row.estado === "Sentado").length,
    canceled: rows.filter((row) => row.estado === "Cancelada").length,
    totalPeople: rows.reduce((sum, row) => sum + (row.personas ?? 0), 0),
    tablesAvailable: (tables ?? []).length,
    rows: rows.map((row) => ({
      id: row.id,
      time: row.hora_inicio,
      people: row.personas,
      service: row.servicio,
      status: row.estado,
      origin: row.origen,
      tables: row.mesa_ids,
    })),
  };
}

export async function getMonthSalesSummary() {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase no configurado");

  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const startIso = start.toISOString().slice(0, 10);
  const endIso = end.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("sales_daily")
    .select("*")
    .gte("business_date", startIso)
    .lte("business_date", endIso)
    .order("business_date", { ascending: true });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as DbSalesDaily[];
  const revenue = rows.reduce((sum, row) => sum + Number(row.net_sales ?? 0), 0);
  const customers = rows.reduce((sum, row) => sum + Number(row.customers ?? 0), 0);
  const orders = rows.reduce((sum, row) => sum + Number(row.orders ?? 0), 0);

  return {
    start: startIso,
    end: endIso,
    days: rows.length,
    revenue,
    customers,
    orders,
    averageTicket: customers > 0 ? revenue / customers : 0,
  };
}

export async function getLowStockItems() {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase no configurado");

  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("active", true)
    .lte("current_quantity", 10)
    .order("current_quantity", { ascending: true })
    .limit(10);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as DbInventoryItem[];
  return {
    count: rows.length,
    items: rows.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.current_quantity,
      minimum: item.minimum_quantity,
      unit: item.unit,
      supplier: item.supplier_name,
    })),
  };
}

export function getProfitSummary() {
  const metrics = computeMetrics(seedProfit().registros.at(-1) ?? null);
  const reviews = seedReviews();
  return {
    month: seedProfit().registros.at(-1)?.mes ?? null,
    ventas: metrics.ventas,
    compras: metrics.compras,
    personal: metrics.personal,
    alquiler: metrics.alquiler,
    beneficioNeto: metrics.beneficioNeto,
    margenNetoPct: metrics.margenNetoPct,
    costePersonalPct: metrics.costePersonalPct,
    costeComidaPct: metrics.costeComidaPct,
    puntoEquilibrio: metrics.puntoEquilibrio,
    ratings: {
      google: reviews.ratingActual,
      totalResenas: reviews.totalResenas,
      pendientes: reviews.registrosMensuales.at(-1)?.pendientesRespuesta ?? 0,
    },
  };
}

export function getReviewsSummary() {
  const reviews = seedReviews();
  const latest = reviews.registrosMensuales.at(-1) ?? null;
  const recent = reviews.resenas.slice(0, 5);
  const bad = reviews.resenas.filter((review) => review.rating <= 2);
  const pending = reviews.resenas.filter((review) => !review.respondida);
  return {
    rating: reviews.ratingActual,
    totalResenas: reviews.totalResenas,
    objetivoResenas: reviews.objetivoResenas,
    progresoPct:
      reviews.objetivoResenas > 0
        ? Number(((reviews.totalResenas / reviews.objetivoResenas) * 100).toFixed(1))
        : 0,
    pendientes: latest?.pendientesRespuesta ?? pending.length,
    negativas: latest?.negativas ?? bad.length,
    positivas: latest?.positivas ?? reviews.resenas.length - bad.length,
    recientes: recent.map((review) => ({
      fecha: review.fecha,
      autor: review.autor,
      rating: review.rating,
      plataforma: review.plataforma,
      respondida: review.respondida,
      texto: review.texto,
    })),
  };
}

export function buildCeoSystemPrompt(user: SessionUser): string {
  return [
    "Eres el AI CEO del sistema Karuma ERP.",
    "Responde en español, claro y directo.",
    "Usa solo datos reales devueltos por herramientas o indicados explícitamente.",
    "Si falta un dato, dilo con honestidad.",
    "No inventes cifras, reservas, turnos ni ventas.",
    "No ejecutes acciones de escritura; solo análisis y borradores.",
    "Si una sugerencia implica riesgo operativo o económico, propón confirmación manual.",
    `Usuario actual: ${user.name} (${user.role})${user.employeeId ? `, empleado ${user.employeeId}` : ""}.`,
  ].join("\n");
}
