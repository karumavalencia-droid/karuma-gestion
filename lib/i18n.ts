/** Karuma ERP - diccionario de interfaz en español. */
import { marketingEs } from "@/lib/marketing/content";

export type Locale = "zh" | "es";

export const DEFAULT_LOCALE: Locale = "es";
export const STORAGE_KEY = "karuma_language_v2";

const spanishDict = {
  common: {
    loading: "Cargando...",
    save: "Guardar",
    saving: "Guardando...",
    cancel: "Cancelar",
    edit: "Editar",
    delete: "Eliminar",
    detail: "Detalle",
    actions: "Acciones",
    confirm: "Confirmar",
    ok: "OK",
    empty: "Sin datos",
    progress: "Progreso",
    none: "—",
  },
  nav: {
    dashboard: "Dashboard",
    staff: "Personal",
    schedule: "Horarios",
    marketing: "Marketing",
    delivery: "Delivery",
    reservas: "Reservas",
  },
  header: {
    openMenu: "Abrir menú",
    notifications: "Notificaciones",
    appName: "Karuma ERP",
  },
  language: {
    es: "Español",
    zh: "Español",
    label: "Idioma",
  },
  dashboard: {
    title: "Dashboard",
    overview: "Resumen operativo · datos mock locales",
    todaySales: "Ventas hoy",
    yesterdaySales: "Ventas ayer",
    monthSales: "Ventas del mes",
    todayFootfall: "Clientes hoy",
    systemStatus: "Estado del sistema",
    systemNote:
      "Dashboard estático; sin depender de login, permisos ni datos de horarios.",
  },
  staff: {
    title: "Personal",
    subtitle: "Personal · primer lote de datos reales ({count})",
    add: "Añadir empleado",
    loadError: "Error al cargar personal",
    saveError: "Error al guardar",
    deleteError: "Error al eliminar",
    deleteConfirm: "¿Eliminar a «{name}»?",
    empty: "Sin empleados",
    colName: "Nombre",
    colDepartment: "Departamento",
    colPosition: "Puesto",
    colContractHours: "Horas contrato",
    colRestDays: "Días libres fijos",
    colShift: "Turno estándar",
    colStatus: "Estado",
    statusActive: "Activo",
    statusInactive: "Inactivo",
    formCreate: "Nuevo empleado",
    formEdit: "Editar empleado",
    pendingHours: "Pendiente",
  },
  schedule: {
    title: "Horarios",
    description: "Horarios del personal",
    today: "Hoy",
    thisWeek: "Esta semana",
    rest: "Descanso",
    restLabel: "Descanso: ",
    working: "Trabajo",
    workingCount: "Trabajo {n}",
    restingCount: "Descanso {n}",
    colEmployee: "Empleado",
    colWeekHours: "Horas semana",
    summaryTotal: "Total hoy",
    summarySala: "Sala",
    summaryCocina: "Cocina",
    summaryRest: "En descanso",
    deptSala: "Sala",
    deptCocina: "Cocina",
    weekDays: {
      mon: "Lun",
      tue: "Mar",
      wed: "Mié",
      thu: "Jue",
      fri: "Vie",
      sat: "Sáb",
      sun: "Dom",
    },
  },
  kiosk: {
    brand: "Karuma Sushi & Grill",
    title: "Fichaje de empleados",
    clockIn: "Entrada",
    clockOut: "Salida",
    cancel: "Cancelar",
    pinLabel: "PIN",
    pinPlaceholder: "PIN de 4 dígitos",
    pinError: "PIN incorrecto",
    punchSuccess: "Fichaje realizado",
    successEmployee: "Empleado",
    successType: "Tipo",
    successTime: "Hora",
    todayLog: "Registros de hoy",
    colEmployee: "Empleado",
    colType: "Tipo",
    colTime: "Hora",
    typeIn: "Entrada",
    typeOut: "Salida",
    noRecords: "Sin registros hoy",
    statusNone: "Sin fichar",
    statusIn: "En turno",
    statusOut: "Salida",
    admin: "Admin",
    adminTitle: "Administrador",
    adminPinPlaceholder: "PIN de administrador",
    adminPresent: "Presentes hoy",
    adminAbsent: "Ausentes hoy",
    adminLate: "Tarde hoy",
    adminClose: "Cerrar",
    deptSala: "Sala",
    deptCocina: "Cocina",
  },
  marketing: marketingEs,
  delivery: {
    title: "Plan de crecimiento delivery",
  },
} as const;

export const i18n = {
  es: spanishDict,
  zh: spanishDict,
} as const;

export type I18nTree = (typeof i18n)["es"];
export type MarketingCopy = {
  [K in keyof (typeof i18n)["es"]["marketing"]]: (typeof i18n)["es"]["marketing"][K];
};

export function resolveLocale(locale: unknown): Locale {
  return locale === "es" ? "es" : DEFAULT_LOCALE;
}

export function getMarketingCopy(_locale: unknown): MarketingCopy {
  void _locale;
  const fallback = i18n.es.marketing;
  return {
    ...fallback,
    strategyFocus: [...fallback.strategyFocus],
    tomorrowTasks: [...fallback.tomorrowTasks],
    scripts: [...fallback.scripts],
    contentRules: [...fallback.contentRules],
    tiktokBioLines: [...fallback.tiktokBioLines],
    weeklyReview: [...fallback.weeklyReview],
    positioningLines: [...fallback.positioningLines],
    positioningKeywords: [...fallback.positioningKeywords],
    videoPublishItems: [...fallback.videoPublishItems],
    domingoThemeLines: [...fallback.domingoThemeLines],
    domingoShots: [...fallback.domingoShots],
    viralSeries: [...fallback.viralSeries],
    bloggerExchange: [...fallback.bloggerExchange],
    bloggerMustShow: [...fallback.bloggerMustShow],
    deliveryCombos: [...fallback.deliveryCombos],
    deliveryPrinciples: [...fallback.deliveryPrinciples],
    rhythmWeeks: [...fallback.rhythmWeeks],
    viralProductCopyLines: [...fallback.viralProductCopyLines],
  } as MarketingCopy;
}

export function getNestedString(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function translateKey(locale: unknown, key: string): string {
  const loc = resolveLocale(locale);
  const value = getNestedString(i18n[loc] as unknown as Record<string, unknown>, key);
  if (value) return value;
  const esFallback = getNestedString(i18n.es as unknown as Record<string, unknown>, key);
  return esFallback ?? key;
}

export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

const WEEK_DAY_MOCK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function weekDayLabel(_locale: Locale, mockDay: string): string {
  void _locale;
  const idx = [
    "\u5468\u4e00",
    "\u5468\u4e8c",
    "\u5468\u4e09",
    "\u5468\u56db",
    "\u5468\u4e94",
    "\u5468\u516d",
    "\u5468\u65e5",
  ].indexOf(mockDay);
  return WEEK_DAY_MOCK[idx >= 0 ? idx : 0];
}

export function loadStoredLocale(): Locale {
  return DEFAULT_LOCALE;
}

export function saveLocale(_locale: Locale): void {
  void _locale;
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, DEFAULT_LOCALE);
}
