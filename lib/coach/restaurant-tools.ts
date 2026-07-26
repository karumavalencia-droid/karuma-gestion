// ─── Karuma Coach — herramientas de datos reales del restaurante ──────────────
// Cada función es una consulta FIJA del servidor con getSupabaseAdmin (o repos
// existentes). El modelo nunca ejecuta SQL: solo elige qué herramienta llamar.
// Todas degradan con elegancia si la tabla no existe o no hay datos.

import { canViewSales, isSalesAdmin } from "@/lib/auth/guards";
import type { SessionUser } from "@/lib/auth/session";
import { KIOSK_EMPLOYEES } from "@/lib/kiosk/employees";
import { isActiveReservation, isTableBlockReservation } from "@/lib/reservas/helpers";
import { getDefaultLocationId } from "@/lib/sales-sync/config";
import { readDailySales } from "@/lib/sales-sync/supabaseRepo";
import { getEmployeeWeek } from "@/lib/schedule/portal";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const MADRID = "Europe/Madrid";
const WEEKDAY_LABELS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
] as const;

/** Fecha de calendario "hoy" en Madrid (YYYY-MM-DD), igual que reservas y ventas. */
function todayInMadrid(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MADRID,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Hora actual "HH:MM" en Madrid. */
function nowHHMMInMadrid(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: MADRID,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

/** Día de la semana de una fecha ISO (0 = domingo … 6 = sábado), como la tabla turnos. */
function diaFromIso(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
}

/** Servicio en curso según la hora (umbral 17:00, igual que classifyServicio). */
function currentServicio(): "comida" | "cena" {
  return nowHHMMInMadrid() < "17:00" ? "comida" : "cena";
}

function firstName(fullName: string | null | undefined): string {
  const clean = String(fullName ?? "").trim();
  if (!clean) return "Sin nombre";
  return clean.split(/\s+/)[0];
}

type ReservaRow = {
  hora_inicio: string | null;
  servicio: "comida" | "cena" | null;
  personas: number | null;
  mesa_ids: number[] | null;
  estado: string | null;
  origen: string | null;
  notas: string | null;
  clientes_reservas: { nombre?: string | null } | null;
};

const RESERVA_COLS =
  "hora_inicio, servicio, personas, mesa_ids, estado, origen, notas, clientes_reservas(nombre)";

/**
 * 1) Reservas de hoy: totales, por servicio, estado y próximas llegadas.
 * No expone teléfono ni email (solo el nombre de pila, para uso operativo).
 */
export async function runGetTodayReservations(): Promise<string> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return JSON.stringify({ available: false, message: "Base de datos no disponible." });
  }
  const today = todayInMadrid();

  const { data, error } = await supabase
    .from("reservas")
    .select(RESERVA_COLS)
    .eq("fecha", today)
    .order("hora_inicio");

  if (error) {
    return JSON.stringify({ available: false, message: "No se pudieron leer las reservas." });
  }

  const rows = (data ?? []) as unknown as ReservaRow[];
  const reales = rows.filter((r) => !isTableBlockReservation({ notas: r.notas }));
  const activas = reales.filter((r) => isActiveReservation(r.estado));
  const now = nowHHMMInMadrid();

  const isSeated = (e: string | null) => e === "Sentado" || e === "WalkIn";

  const upcoming = activas
    .filter((r) => r.estado === "Confirmada" && String(r.hora_inicio ?? "").slice(0, 5) >= now)
    .slice(0, 8)
    .map((r) => ({
      hora: String(r.hora_inicio ?? "").slice(0, 5),
      nombre: firstName(r.clientes_reservas?.nombre),
      personas: r.personas ?? 0,
      mesas: (r.mesa_ids ?? []).map((n) => `Mesa ${n}`),
    }));

  const paxActivas = activas.reduce((s, r) => s + (r.personas ?? 0), 0);
  const porServicio = (servicio: "comida" | "cena") => {
    const list = activas.filter((r) => r.servicio === servicio);
    return { reservas: list.length, personas: list.reduce((s, r) => s + (r.personas ?? 0), 0) };
  };

  return JSON.stringify({
    available: true,
    fecha: today,
    hora_actual: now,
    total_reservas_activas: activas.length,
    total_personas: paxActivas,
    comida: porServicio("comida"),
    cena: porServicio("cena"),
    sentados_ahora: reales.filter((r) => isSeated(r.estado)).length,
    walk_ins: reales.filter((r) => r.origen === "walkin" || r.estado === "WalkIn").length,
    no_shows: reales.filter((r) => r.estado === "NoShow").length,
    canceladas: reales.filter((r) => r.estado === "Cancelada").length,
    proximas_llegadas: upcoming,
  });
}

/**
 * 2) Estado de las mesas para un servicio (por defecto el que esté en curso):
 * libre / reservada / ocupada, con capacidad y zona.
 */
export async function runGetTableStatus(args: unknown): Promise<string> {
  const input = (args ?? {}) as { servicio?: unknown };
  const servicio =
    input.servicio === "comida" || input.servicio === "cena"
      ? input.servicio
      : currentServicio();

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return JSON.stringify({ available: false, message: "Base de datos no disponible." });
  }
  const today = todayInMadrid();

  const { data: mesasData, error: mesasError } = await supabase
    .from("mesas")
    .select("numero, capacidad, zona")
    .eq("activa", true)
    .order("numero");

  if (mesasError || !mesasData) {
    return JSON.stringify({ available: false, message: "No se pudieron leer las mesas." });
  }

  const { data: resData } = await supabase
    .from("reservas")
    .select(RESERVA_COLS)
    .eq("fecha", today)
    .eq("servicio", servicio);

  const reservas = ((resData ?? []) as unknown as ReservaRow[]).filter((r) =>
    isActiveReservation(r.estado),
  );

  const ocupadaPor = new Set<number>();
  const reservadaPor = new Set<number>();
  for (const r of reservas) {
    const seated = r.estado === "Sentado" || r.estado === "WalkIn";
    for (const n of r.mesa_ids ?? []) {
      if (seated) ocupadaPor.add(n);
      else if (r.estado === "Confirmada") reservadaPor.add(n);
    }
  }

  const mesas = (mesasData as { numero: number; capacidad: number; zona: string | null }[]).map(
    (m) => {
      const status = ocupadaPor.has(m.numero)
        ? "ocupada"
        : reservadaPor.has(m.numero)
          ? "reservada"
          : "libre";
      return { numero: m.numero, capacidad: m.capacidad, zona: m.zona ?? "Interior", status };
    },
  );

  return JSON.stringify({
    available: true,
    fecha: today,
    servicio,
    total_mesas: mesas.length,
    libres: mesas.filter((m) => m.status === "libre").length,
    reservadas: mesas.filter((m) => m.status === "reservada").length,
    ocupadas: mesas.filter((m) => m.status === "ocupada").length,
    mesas,
  });
}

/**
 * 3) Ventas de hoy (y acumulado del mes). SOLO gerencia (owner/manager).
 * Los empleados reciben "no_access" para que el modelo no revele cifras.
 */
export async function runGetTodaySales(user: SessionUser): Promise<string> {
  if (!canViewSales(user)) {
    return JSON.stringify({
      error: "no_access",
      message:
        "Las ventas y la facturación son información solo para la cuenta personal autorizada. Dile al empleado que lo consulte con el encargado.",
    });
  }

  const today = todayInMadrid();
  const monthStart = `${today.slice(0, 7)}-01`;
  const locationId = getDefaultLocationId();

  let mes;
  try {
    mes = await readDailySales({ startDate: monthStart, endDate: today, locationId });
  } catch {
    return JSON.stringify({ available: false, message: "No se pudieron leer las ventas." });
  }

  const hoy = mes.find((r) => r.date === today) ?? null;
  const ventasMesNet = mes.reduce((s, r) => s + (r.netSales ?? 0), 0);

  if (!hoy) {
    return JSON.stringify({
      available: true,
      fecha: today,
      hoy: null,
      message:
        "No hay datos de ventas para hoy todavía. Se cargan al importar el CSV del TPV en el Centro de Datos.",
      acumulado_mes_neto: Math.round(ventasMesNet * 100) / 100,
      dias_con_datos_mes: mes.length,
    });
  }

  return JSON.stringify({
    available: true,
    fecha: today,
    hoy: {
      ventas_netas: hoy.netSales,
      ventas_brutas: hoy.grossSales,
      clientes: hoy.customers,
      pedidos: hoy.orders,
      ticket_medio: hoy.averageTicket,
      ventas_bebida: hoy.drinkSales,
      ventas_delivery: hoy.deliverySales,
      efectivo: hoy.cashSales,
      tarjeta: hoy.cardSales,
      fuente: hoy.source,
    },
    acumulado_mes_neto: Math.round(ventasMesNet * 100) / 100,
    dias_con_datos_mes: mes.length,
  });
}

/**
 * 4) Quién trabaja hoy: turnos de todos los empleados activos para el día actual.
 * Usa getEmployeeWeek (tabla turnos con fallback a la plantilla semanal).
 * Solo nombres, departamento y horas de turno: ninguna cifra ni dato personal.
 */
export async function runGetTeamToday(): Promise<string> {
  const today = todayInMadrid();
  const dia = diaFromIso(today);

  const semanas = await Promise.all(
    KIOSK_EMPLOYEES.map(async (emp) => {
      const week = await getEmployeeWeek(emp.id);
      return { emp, day: week.days[dia], source: week.source };
    }),
  );

  const trabajando = semanas
    .filter((s) => s.day && !s.day.descanso && s.day.turnos.length > 0)
    .map((s) => ({
      nombre: s.emp.name,
      departamento: s.emp.department,
      turnos: s.day!.turnos.map((t) => ({ servicio: t.servicio, inicio: t.inicio, fin: t.fin })),
    }));

  const libres = semanas
    .filter((s) => !s.day || s.day.descanso || s.day.turnos.length === 0)
    .map((s) => s.emp.name);

  const algunoSupabase = semanas.some((s) => s.source === "supabase");

  return JSON.stringify({
    available: true,
    fecha: today,
    dia_semana: WEEKDAY_LABELS[dia],
    total_trabajando: trabajando.length,
    trabajando,
    libres,
    nota: algunoSupabase
      ? "Turnos del sistema; confirma cambios de última hora con el encargado."
      : "Turnos según la plantilla semanal habitual; confirma cambios de última hora con el encargado.",
  });
}

/**
 * 5) Inventario / productos recibidos de proveedores (últimas entradas).
 * Sin precios (regla del asistente). Degrada si la tabla no existe todavía.
 */
export async function runGetInventory(args: unknown): Promise<string> {
  const input = (args ?? {}) as { query?: unknown };
  const search = typeof input.query === "string" ? input.query.trim() : "";

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return JSON.stringify({ available: false, message: "Base de datos no disponible." });
  }

  const base = supabase
    .from("supplier_products")
    .select("product_name, quantity, unit, invoice_date, suppliers(name)");
  const filtered = search ? base.ilike("product_name", `%${search}%`) : base;

  const { data, error } = await filtered
    .order("invoice_date", { ascending: false, nullsFirst: false })
    .limit(30);

  if (error) {
    // Tabla ausente en este proyecto o sin permisos: degradar con claridad.
    return JSON.stringify({
      available: false,
      message:
        "El inventario de proveedores no está disponible todavía. Dile al empleado que lo consulte con el encargado.",
    });
  }

  const rows = (data ?? []) as unknown as {
    product_name: string;
    quantity: number | null;
    unit: string | null;
    invoice_date: string | null;
    suppliers: { name?: string | null } | null;
  }[];

  if (rows.length === 0) {
    return JSON.stringify({
      available: true,
      productos: [],
      message: search
        ? `Sin productos que coincidan con "${search}".`
        : "No hay productos de proveedores registrados todavía.",
    });
  }

  return JSON.stringify({
    available: true,
    filtro: search || null,
    total: rows.length,
    productos: rows.map((r) => ({
      producto: r.product_name,
      cantidad: r.quantity,
      unidad: r.unit,
      proveedor: r.suppliers?.name ?? null,
      fecha_factura: r.invoice_date,
    })),
  });
}
