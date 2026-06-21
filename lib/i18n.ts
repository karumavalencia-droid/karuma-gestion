/** Karuma ERP — 统一中西双语字典（优先页面） */
import { marketingEs, marketingZh } from "@/lib/marketing/content";

export type Locale = "zh" | "es";

export const DEFAULT_LOCALE: Locale = "es";
// v2: al cambiar el idioma por defecto a español, ignoramos preferencias antiguas
// guardadas como "zh" para que toda la app arranque en español.
export const STORAGE_KEY = "karuma_language_v2";

export const i18n = {
  zh: {
    common: {
      loading: "加载中…",
      save: "保存",
      saving: "保存中…",
      cancel: "取消",
      edit: "编辑",
      delete: "删除",
      detail: "详情",
      actions: "操作",
      confirm: "确定",
      ok: "OK",
      empty: "暂无数据",
      progress: "进度",
      none: "—",
    },
    nav: {
      dashboard: "首页",
      staff: "员工管理",
      schedule: "排班管理",
      marketing: "增长计划",
      delivery: "外卖增长",
      reservas: "预约管理",
    },
    header: {
      openMenu: "打开菜单",
      notifications: "通知",
      appName: "Karuma ERP",
    },
    language: {
      es: "Español",
      zh: "中文",
      label: "语言",
    },
    dashboard: {
      title: "首页",
      overview: "经营概览 · 本地 mock 数据",
      todaySales: "今日营业额",
      yesterdaySales: "昨日营业额",
      monthSales: "本月营业额",
      todayFootfall: "今日客流",
      systemStatus: "系统状态",
      systemNote:
        "Dashboard 已恢复为静态页面，暂不依赖登录、权限与排班数据。",
    },
    staff: {
      title: "员工管理",
      subtitle: "员工管理 · 第一批真实数据（{count} 人）",
      add: "新增员工",
      loadError: "加载员工失败",
      saveError: "保存失败",
      deleteError: "删除失败",
      deleteConfirm: "确定删除员工「{name}」？",
      empty: "暂无员工数据",
      colName: "姓名",
      colDepartment: "部门",
      colPosition: "岗位",
      colContractHours: "合同工时",
      colRestDays: "固定休息日",
      colShift: "标准班次",
      colStatus: "状态",
      statusActive: "在职",
      statusInactive: "离职",
      formCreate: "新增员工",
      formEdit: "编辑员工",
      pendingHours: "待确认",
    },
    schedule: {
      title: "排班管理",
      description: "排班",
      today: "今天",
      thisWeek: "本周",
      rest: "休息",
      restLabel: "休息：",
      working: "上班",
      workingCount: "上班 {n}",
      restingCount: "休息 {n}",
      colEmployee: "员工",
      colWeekHours: "周工时",
      summaryTotal: "今日总人数",
      summarySala: "服务员人数",
      summaryCocina: "厨房人数",
      summaryRest: "休息人数",
      deptSala: "服务员",
      deptCocina: "厨房",
      weekDays: {
        mon: "周一",
        tue: "周二",
        wed: "周三",
        thu: "周四",
        fri: "周五",
        sat: "周六",
        sun: "周日",
      },
    },
    kiosk: {
      brand: "Karuma Sushi & Grill",
      title: "员工打卡",
      clockIn: "上班",
      clockOut: "下班",
      cancel: "取消",
      pinLabel: "PIN",
      pinPlaceholder: "输入 4 位 PIN",
      pinError: "PIN错误",
      punchSuccess: "打卡成功",
      successEmployee: "员工",
      successType: "类型",
      successTime: "时间",
      todayLog: "今日打卡记录",
      colEmployee: "员工",
      colType: "类型",
      colTime: "时间",
      typeIn: "上班",
      typeOut: "下班",
      noRecords: "今日暂无打卡记录",
      statusNone: "未打卡",
      statusIn: "已上班",
      statusOut: "已下班",
      admin: "管理员",
      adminTitle: "管理员",
      adminPinPlaceholder: "输入管理员 PIN",
      adminPresent: "今日出勤",
      adminAbsent: "今日缺勤",
      adminLate: "今日迟到",
      adminClose: "关闭",
      deptSala: "服务员",
      deptCocina: "厨房",
    },
    marketing: marketingZh,
    delivery: {
      title: "外卖增长计划",
    },
  },
  es: {
    common: {
      loading: "Cargando…",
      save: "Guardar",
      saving: "Guardando…",
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
      zh: "中文",
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
      restLabel: "Descanso:",
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
  },
} as const;

export type I18nTree = (typeof i18n)["zh"];
export type MarketingCopy = {
  [K in keyof (typeof i18n)["zh"]["marketing"]]: (typeof i18n)["zh"]["marketing"][K];
};

/** 保证 locale 始终为 zh | es，默认 zh */
export function resolveLocale(locale: unknown): Locale {
  return locale === "es" ? "es" : DEFAULT_LOCALE;
}

export function getMarketingCopy(locale: unknown): MarketingCopy {
  const loc = resolveLocale(locale);
  const zh = i18n.zh.marketing;
  const local = i18n[loc]?.marketing;
  if (!local) return { ...zh } as MarketingCopy;

  return {
    ...zh,
    ...local,
    strategyFocus: [...(local.strategyFocus ?? zh.strategyFocus)],
    tomorrowTasks: [...(local.tomorrowTasks ?? zh.tomorrowTasks)],
    scripts: [...(local.scripts ?? zh.scripts)],
    contentRules: [...(local.contentRules ?? zh.contentRules)],
    tiktokBioLines: [...(local.tiktokBioLines ?? zh.tiktokBioLines)],
    weeklyReview: [...(local.weeklyReview ?? zh.weeklyReview)],
    positioningLines: [...(local.positioningLines ?? zh.positioningLines)],
    positioningKeywords: [...(local.positioningKeywords ?? zh.positioningKeywords)],
    videoPublishItems: [...(local.videoPublishItems ?? zh.videoPublishItems)],
    domingoThemeLines: [...(local.domingoThemeLines ?? zh.domingoThemeLines)],
    domingoShots: [...(local.domingoShots ?? zh.domingoShots)],
    viralSeries: [...(local.viralSeries ?? zh.viralSeries)],
    bloggerExchange: [...(local.bloggerExchange ?? zh.bloggerExchange)],
    bloggerMustShow: [...(local.bloggerMustShow ?? zh.bloggerMustShow)],
    deliveryCombos: [...(local.deliveryCombos ?? zh.deliveryCombos)],
    deliveryPrinciples: [...(local.deliveryPrinciples ?? zh.deliveryPrinciples)],
    rhythmWeeks: [...(local.rhythmWeeks ?? zh.rhythmWeeks)],
    viralProductCopyLines: [
      ...(local.viralProductCopyLines ?? zh.viralProductCopyLines),
    ],
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
  const fallback = getNestedString(i18n.zh as unknown as Record<string, unknown>, key);
  if (fallback) return fallback;
  const esFallback = getNestedString(i18n.es as unknown as Record<string, unknown>, key);
  return esFallback ?? key;
}

export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

export function loadStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    return resolveLocale(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function saveLocale(locale: unknown): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, resolveLocale(locale));
}

/** 排班 mock 键 → 显示标签 */
export const WEEK_DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export const WEEK_DAY_MOCK = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"] as const;

export function weekDayLabel(locale: Locale, mockDay: (typeof WEEK_DAY_MOCK)[number]): string {
  const idx = WEEK_DAY_MOCK.indexOf(mockDay);
  const key = WEEK_DAY_KEYS[idx] ?? "mon";
  return translateKey(locale, `schedule.weekDays.${key}`);
}
