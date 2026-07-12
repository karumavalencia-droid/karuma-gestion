import { attendanceBusinessDate } from "@/lib/attendance/time";
import type { SessionUser } from "@/lib/auth/session";
import { findKioskEmployee } from "@/lib/kiosk/employees";
import { getEmployeeWeek } from "@/lib/schedule/portal";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { searchKnowledge } from "./knowledge";
import {
  INCIDENT_CATEGORIES,
  INCIDENT_PRIORITIES,
  type DbCoachIncidentReport,
  type IncidentCategory,
  type IncidentPriority,
} from "./types";

/**
 * Definiciones de herramientas para la Responses API de OpenAI.
 * get_my_schedule NO acepta employeeId: la identidad sale solo de la sesión.
 */
export const COACH_TOOLS = [
  {
    type: "function" as const,
    name: "get_my_schedule",
    description:
      "Devuelve el horario semanal del empleado que ha iniciado sesión (semana actual, con hoy y mañana marcados). No admite parámetros: solo puede consultar el horario del propio empleado.",
    strict: true,
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
      required: [],
    },
  },
  {
    type: "function" as const,
    name: "search_knowledge",
    description:
      "Busca en la base de conocimiento interna de Karuma: recetas, uso del horno Rational, plancha/pira, protocolo de servicio, higiene, apertura, cierre, quejas y equipos. Devuelve como máximo 5 resultados. Si no hay resultados, dilo claramente y no inventes.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Palabras clave de búsqueda, en español.",
        },
        category: {
          type: ["string", "null"],
          enum: [
            "recipe",
            "rational",
            "pira",
            "service",
            "hygiene",
            "opening",
            "closing",
            "complaints",
            "equipment",
            null,
          ],
          description: "Categoría opcional para acotar la búsqueda.",
        },
      },
      additionalProperties: false,
      required: ["query", "category"],
    },
  },
  {
    type: "function" as const,
    name: "create_incident_report",
    description:
      "Crea un reporte de incidencia para que lo revise el encargado (avería, falta de stock, higiene, queja de cliente, seguridad). El empleado y la conversación se añaden automáticamente en el servidor. En emergencias graves, avisa primero al empleado de que pare y notifique al encargado en persona.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: [
            "equipment",
            "inventory",
            "hygiene",
            "customer_complaint",
            "safety",
            "other",
          ],
          description: "Tipo de incidencia.",
        },
        location: {
          type: ["string", "null"],
          description: "Zona del restaurante (cocina, sala, barra, almacén…).",
        },
        description: {
          type: "string",
          description: "Descripción clara y breve de lo ocurrido.",
        },
        priority: {
          type: ["string", "null"],
          enum: ["low", "medium", "high", "urgent", null],
          description: "Prioridad; por defecto medium.",
        },
      },
      additionalProperties: false,
      required: ["category", "location", "description", "priority"],
    },
  },
];

const WEEKDAY_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

function isoDateToUtcNoon(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function utcNoonToIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Horario del propio empleado. La identidad sale EXCLUSIVAMENTE de la sesión
 * verificada en el servidor; los argumentos del modelo se ignoran.
 */
export async function runGetMySchedule(user: SessionUser): Promise<string> {
  if (!user.employeeId) {
    return JSON.stringify({
      error: "not_linked",
      message: "Esta cuenta no está vinculada a un empleado.",
    });
  }
  const employee = findKioskEmployee(user.employeeId);
  if (!employee) {
    return JSON.stringify({
      error: "not_linked",
      message: "Esta cuenta no está vinculada a un empleado activo.",
    });
  }

  const week = await getEmployeeWeek(employee.id);
  const today = attendanceBusinessDate();
  const todayDate = isoDateToUtcNoon(today);
  const jsDay = todayDate.getUTCDay();
  const monday = new Date(todayDate);
  monday.setUTCDate(monday.getUTCDate() + (jsDay === 0 ? -6 : 1 - jsDay));

  const tomorrow = new Date(todayDate);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowIso = utcNoonToIsoDate(tomorrow);

  const days = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(monday);
    date.setUTCDate(date.getUTCDate() + offset);
    const isoDate = utcNoonToIsoDate(date);
    const dia = date.getUTCDay();
    const dayData = week.days[dia];
    return {
      date: isoDate,
      weekday: WEEKDAY_LABELS[dia],
      isToday: isoDate === today,
      isTomorrow: isoDate === tomorrowIso,
      descanso: dayData?.descanso ?? true,
      turnos: dayData?.turnos ?? [],
    };
  });

  return JSON.stringify({
    employee: { name: employee.name, department: employee.department },
    source: week.source,
    note:
      week.source === "plantilla"
        ? "Horario según la plantilla semanal habitual; confirma cambios de última hora con el encargado."
        : "Horario cargado del sistema.",
    days,
  });
}

export async function runSearchKnowledge(args: unknown): Promise<string> {
  const input = (args ?? {}) as { query?: unknown; category?: unknown };
  const { results, error } = await searchKnowledge(
    typeof input.query === "string" ? input.query : "",
    input.category,
  );
  if (error) {
    return JSON.stringify({
      error,
      message:
        "La base de conocimiento no está disponible ahora mismo. Dile al empleado que pregunte al encargado.",
    });
  }
  if (results.length === 0) {
    return JSON.stringify({
      results: [],
      message:
        "Sin resultados. Di claramente que no tienes esa información y sugiere preguntar al encargado. No inventes.",
    });
  }
  return JSON.stringify({ results });
}

function isIncidentCategory(value: unknown): value is IncidentCategory {
  return (
    typeof value === "string" &&
    (INCIDENT_CATEGORIES as readonly string[]).includes(value)
  );
}

function isIncidentPriority(value: unknown): value is IncidentPriority {
  return (
    typeof value === "string" &&
    (INCIDENT_PRIORITIES as readonly string[]).includes(value)
  );
}

/**
 * Crea el reporte. employee_id/name salen de la sesión verificada y la
 * conversación del servidor; el modelo solo aporta categoría/lugar/descripción.
 */
export async function runCreateIncidentReport(
  args: unknown,
  user: SessionUser,
  conversationId: string,
): Promise<string> {
  const input = (args ?? {}) as {
    category?: unknown;
    location?: unknown;
    description?: unknown;
    priority?: unknown;
  };

  if (!isIncidentCategory(input.category)) {
    return JSON.stringify({ error: "invalid_category" });
  }
  const description =
    typeof input.description === "string" ? input.description.trim().slice(0, 2000) : "";
  if (description.length < 5) {
    return JSON.stringify({
      error: "invalid_description",
      message: "Pide al empleado una descripción breve de lo ocurrido.",
    });
  }
  const location =
    typeof input.location === "string" && input.location.trim()
      ? input.location.trim().slice(0, 120)
      : null;
  const priority = isIncidentPriority(input.priority) ? input.priority : "medium";

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return JSON.stringify({
      error: "reports_unavailable",
      message:
        "No se pudo guardar el reporte. Dile al empleado que avise al encargado directamente.",
    });
  }

  const { data, error } = await supabase
    .from("coach_incident_reports")
    .insert({
      employee_id: user.employeeId ?? user.email,
      employee_name: user.name,
      category: input.category,
      location,
      description,
      priority,
      source_conversation_id: conversationId,
    })
    .select("id, category, priority, status, created_at")
    .single<
      Pick<DbCoachIncidentReport, "id" | "category" | "priority" | "status" | "created_at">
    >();

  if (error || !data) {
    return JSON.stringify({
      error: "reports_unavailable",
      message:
        "No se pudo guardar el reporte. Dile al empleado que avise al encargado directamente.",
    });
  }

  return JSON.stringify({
    ok: true,
    report: data,
    message: "Reporte creado. El encargado lo revisará.",
  });
}
