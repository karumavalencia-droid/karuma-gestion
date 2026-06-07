export const CONFIG_KEY = "karuma_datos_config_v1";

export const MODULE_KEYS = {
  personal: "karuma_personal_v1",
  compras: "karuma_compras_v1",
  profit: "karuma_profit_v1",
  restosuite: "karuma_restosuite_kpi_v1",
  reviews: "karuma_reviews_v1",
  objetivo: "karuma_objetivo_100k_v1",
  inventario: ["karuma_inventario_v2", "karuma_inventario_v1"],
} as const;

export type ModuleId = keyof typeof MODULE_KEYS;

export interface ModuleDef {
  id: ModuleId;
  nombre: string;
  descripcion: string;
  keys: string[];
}

export const MODULES: ModuleDef[] = [
  {
    id: "restosuite",
    nombre: "Restosuite KPI",
    descripcion: "Ventas, clientes y ticket diario",
    keys: [MODULE_KEYS.restosuite],
  },
  {
    id: "reviews",
    nombre: "Google Reviews",
    descripcion: "Rating, reseñas y reputación online",
    keys: [MODULE_KEYS.reviews],
  },
  {
    id: "profit",
    nombre: "Centro de Beneficio",
    descripcion: "Costes, margen y beneficio neto",
    keys: [MODULE_KEYS.profit],
  },
  {
    id: "compras",
    nombre: "Compras",
    descripcion: "Proveedores y pedidos de compra",
    keys: [MODULE_KEYS.compras],
  },
  {
    id: "personal",
    nombre: "Personal",
    descripcion: "Empleados, horarios y nómina",
    keys: [MODULE_KEYS.personal],
  },
  {
    id: "inventario",
    nombre: "Inventario",
    descripcion: "Stock y movimientos",
    keys: [...MODULE_KEYS.inventario],
  },
  {
    id: "objetivo",
    nombre: "Objetivo 100K (legacy)",
    descripcion: "Datos migrados a Restosuite KPI",
    keys: [MODULE_KEYS.objetivo],
  },
];

export type ModuleStatus = "conectado" | "sin_datos";

export interface ModuleInfo {
  id: ModuleId;
  nombre: string;
  descripcion: string;
  estado: ModuleStatus;
  storageKey: string | null;
  registros: number;
  ultimaActualizacion: string | null;
}

export interface DatosResumen {
  ventas: number;
  clientes: number;
  ticketMedio: number;
  compras: number;
  costePersonal: number;
  beneficioEstimado: number;
  margenPct: number;
  ratingGoogle: number;
  totalResenas: number;
  progresoResenasPct: number;
  pendientesResenas: number;
  fuentes: string[];
}

export interface DatosConfig {
  apiKey: string;
  apiUrl: string;
  lastSync: number | null;
}

export interface SugerenciaDatos {
  id: string;
  tipo: "success" | "warning" | "info" | "danger";
  titulo: string;
  mensaje: string;
}

function fmtNum(value: number, decimals = 2): number {
  return parseFloat(value.toFixed(decimals));
}

function readRaw(key: string): unknown | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function findRaw(keys: string[]): { data: unknown; key: string } | null {
  for (const key of keys) {
    const data = readRaw(key);
    if (data !== null) return { data, key };
  }
  return null;
}

function mesActual(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function parseFechaMax(fechas: string[]): string | null {
  const valid = fechas.filter(Boolean).sort();
  return valid.length > 0 ? valid[valid.length - 1] : null;
}

function fmtFecha(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function loadConfig(): DatosConfig {
  if (typeof window === "undefined") {
    return { apiKey: "", apiUrl: "", lastSync: null };
  }
  const raw = readRaw(CONFIG_KEY);
  if (!raw || typeof raw !== "object") {
    return { apiKey: "", apiUrl: "", lastSync: null };
  }
  const r = raw as Record<string, unknown>;
  return {
    apiKey: String(r.apiKey ?? ""),
    apiUrl: String(r.apiUrl ?? ""),
    lastSync: typeof r.lastSync === "number" ? r.lastSync : null,
  };
}

export function saveConfig(config: DatosConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

function analyzePersonal(data: unknown): {
  count: number;
  costeEstimado: number;
  ultima: string | null;
} {
  const arr = Array.isArray(data) ? data : [];
  let coste = 0;
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const estado = r.estado === "activo" ? "activo" : r.estado;
    const salario = parseFloat(String(r.salarioBase ?? r.sueldoEstimado ?? 0)) || 0;
    if (estado === "activo") coste += salario;
  }
  return { count: arr.length, costeEstimado: fmtNum(coste), ultima: null };
}

function analyzeCompras(data: unknown): {
  count: number;
  comprasMes: number;
  ultima: string | null;
} {
  if (!data || typeof data !== "object") return { count: 0, comprasMes: 0, ultima: null };
  const r = data as Record<string, unknown>;
  const pedidos = Array.isArray(r.pedidos) ? r.pedidos : [];
  const mes = mesActual();
  let comprasMes = 0;
  const fechas: string[] = [];

  for (const p of pedidos) {
    if (!p || typeof p !== "object") continue;
    const ped = p as Record<string, unknown>;
    const fecha = String(ped.fecha ?? "").slice(0, 10);
    if (fecha) fechas.push(fecha);
    const estado = String(ped.estado ?? "");
    if (fecha.startsWith(mes) && (estado === "recibido" || estado === "pendiente" || estado === "enviado")) {
      comprasMes += parseFloat(String(ped.coste ?? ped.importe ?? 0)) || 0;
    }
  }

  return {
    count: pedidos.length,
    comprasMes: fmtNum(comprasMes),
    ultima: parseFechaMax(fechas),
  };
}

function analyzeProfit(data: unknown): {
  count: number;
  registroMes: Record<string, number> | null;
  ultima: string | null;
} {
  if (!data || typeof data !== "object") return { count: 0, registroMes: null, ultima: null };
  const r = data as Record<string, unknown>;
  const registros = Array.isArray(r.registros) ? r.registros : [];
  const mes = mesActual();
  let registroMes: Record<string, number> | null = null;
  let ultima: string | null = null;

  for (const item of registros) {
    if (!item || typeof item !== "object") continue;
    const reg = item as Record<string, unknown>;
    const m = String(reg.mes ?? "").slice(0, 7);
    if (m) ultima = m;
    if (m === mes) {
      const ventas = parseFloat(String(reg.ventas ?? 0)) || 0;
      const compras = parseFloat(String(reg.compras ?? 0)) || 0;
      const personal = parseFloat(String(reg.personal ?? 0)) || 0;
      const alquiler = parseFloat(String(reg.alquiler ?? 0)) || 0;
      const suministros = parseFloat(String(reg.suministros ?? 0)) || 0;
      const gestoria = parseFloat(String(reg.gestoria ?? 0)) || 0;
      const otros = parseFloat(String(reg.otros ?? 0)) || 0;
      const totalCostes = compras + personal + alquiler + suministros + gestoria + otros;
      const beneficio = ventas - totalCostes;
      registroMes = {
        ventas,
        compras,
        personal,
        beneficio: fmtNum(beneficio),
        margen: ventas > 0 ? fmtNum((beneficio / ventas) * 100, 1) : 0,
      };
    }
  }

  return { count: registros.length, registroMes, ultima };
}

function analyzeRestosuite(data: unknown): {
  count: number;
  ventasMes: number;
  clientesMes: number;
  ultima: string | null;
} {
  if (!data || typeof data !== "object") return { count: 0, ventasMes: 0, clientesMes: 0, ultima: null };
  const r = data as Record<string, unknown>;
  const registros = Array.isArray(r.registros) ? r.registros : [];
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  let ventasMes = 0;
  let clientesMes = 0;
  const fechas: string[] = [];

  for (const item of registros) {
    if (!item || typeof item !== "object") continue;
    const reg = item as Record<string, unknown>;
    const fecha = String(reg.fecha ?? "").slice(0, 10);
    if (fecha) fechas.push(fecha);
    const d = new Date(fecha + "T12:00:00");
    if (d.getFullYear() === year && d.getMonth() === month) {
      ventasMes += parseFloat(String(reg.ventas ?? reg.facturacion ?? 0)) || 0;
      clientesMes += parseInt(String(reg.clientes ?? 0), 10) || 0;
    }
  }

  return {
    count: registros.length,
    ventasMes: fmtNum(ventasMes),
    clientesMes,
    ultima: parseFechaMax(fechas),
  };
}

function analyzeReviews(data: unknown): {
  count: number;
  rating: number;
  totalResenas: number;
  pendientes: number;
  ultima: string | null;
} {
  if (!data || typeof data !== "object") {
    return { count: 0, rating: 0, totalResenas: 0, pendientes: 0, ultima: null };
  }
  const r = data as Record<string, unknown>;
  const resenas = Array.isArray(r.resenas) ? r.resenas : [];
  const registrosMensuales = Array.isArray(r.registrosMensuales) ? r.registrosMensuales : [];
  const totalResenas = Math.round(parseFloat(String(r.totalResenas ?? 0)) || 0);
  const rating = fmtNum(parseFloat(String(r.ratingActual ?? 0)) || 0, 2);

  let pendientes = 0;
  for (const item of resenas) {
    if (!item || typeof item !== "object") continue;
    if (!(item as Record<string, unknown>).respondida) pendientes++;
  }

  const meses = registrosMensuales
    .map((item) =>
      item && typeof item === "object" ? String((item as Record<string, unknown>).mes ?? "") : "",
    )
    .filter(Boolean)
    .sort();

  return {
    count: resenas.length || registrosMensuales.length,
    rating,
    totalResenas: totalResenas || resenas.length,
    pendientes,
    ultima: meses.length > 0 ? meses[meses.length - 1] : null,
  };
}

function analyzeInventario(data: unknown): { count: number; ultima: string | null } {
  const arr = Array.isArray(data) ? data : [];
  let maxTs = 0;
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const ts = typeof r.createdAt === "number" ? r.createdAt : 0;
    if (ts > maxTs) maxTs = ts;
  }
  return {
    count: arr.length,
    ultima: maxTs > 0 ? new Date(maxTs).toISOString() : null,
  };
}

export function scanModules(): ModuleInfo[] {
  return MODULES.map((mod) => {
    const found = findRaw(mod.keys);
    if (!found) {
      return {
        id: mod.id,
        nombre: mod.nombre,
        descripcion: mod.descripcion,
        estado: "sin_datos" as const,
        storageKey: null,
        registros: 0,
        ultimaActualizacion: null,
      };
    }

    let count = 0;
    let ultima: string | null = null;

    if (mod.id === "personal") {
      const a = analyzePersonal(found.data);
      count = a.count;
      ultima = a.ultima;
    } else if (mod.id === "compras") {
      const a = analyzeCompras(found.data);
      count = a.count;
      ultima = a.ultima;
    } else if (mod.id === "profit") {
      const a = analyzeProfit(found.data);
      count = a.count;
      ultima = a.ultima;
    } else if (mod.id === "restosuite" || mod.id === "objetivo") {
      const a = analyzeRestosuite(found.data);
      count = a.count;
      ultima = a.ultima;
    } else if (mod.id === "reviews") {
      const a = analyzeReviews(found.data);
      count = a.count;
      ultima = a.ultima;
    } else if (mod.id === "inventario") {
      const a = analyzeInventario(found.data);
      count = a.count;
      ultima = a.ultima;
    }

    const hasData = count > 0;
    return {
      id: mod.id,
      nombre: mod.nombre,
      descripcion: mod.descripcion,
      estado: hasData ? "conectado" : "sin_datos",
      storageKey: found.key,
      registros: count,
      ultimaActualizacion: ultima
        ? ultima.includes("T")
          ? fmtFecha(ultima)
          : ultima.length === 7
            ? ultima
            : fmtFecha(ultima + "T12:00:00")
        : null,
    };
  });
}

export function computeResumen(): DatosResumen {
  const fuentes: string[] = [];

  const profitRaw = findRaw([MODULE_KEYS.profit]);
  const restoRaw = findRaw([MODULE_KEYS.restosuite, MODULE_KEYS.objetivo]);
  const reviewsRaw = findRaw([MODULE_KEYS.reviews]);
  const comprasRaw = findRaw([MODULE_KEYS.compras]);
  const personalRaw = findRaw([MODULE_KEYS.personal]);

  const profit = profitRaw ? analyzeProfit(profitRaw.data) : null;
  const resto = restoRaw ? analyzeRestosuite(restoRaw.data) : null;
  const reviews = reviewsRaw ? analyzeReviews(reviewsRaw.data) : null;
  const compras = comprasRaw ? analyzeCompras(comprasRaw.data) : null;
  const personal = personalRaw ? analyzePersonal(personalRaw.data) : null;

  let ventas = 0;
  let clientes = 0;
  let comprasVal = 0;
  let costePersonal = 0;
  let beneficioEstimado = 0;
  let margenPct = 0;
  let ratingGoogle = 0;
  let totalResenas = 0;
  let progresoResenasPct = 0;
  let pendientesResenas = 0;

  if (profit?.registroMes) {
    ventas = profit.registroMes.ventas;
    comprasVal = profit.registroMes.compras;
    costePersonal = profit.registroMes.personal;
    beneficioEstimado = profit.registroMes.beneficio;
    margenPct = profit.registroMes.margen;
    fuentes.push("Beneficio");
  }

  if (resto && resto.ventasMes > 0) {
    if (ventas === 0) {
      ventas = resto.ventasMes;
      fuentes.push("Restosuite KPI");
    }
    clientes = resto.clientesMes;
    if (!fuentes.includes("Restosuite KPI")) fuentes.push("Restosuite KPI");
  }

  if (comprasVal === 0 && compras && compras.comprasMes > 0) {
    comprasVal = compras.comprasMes;
    fuentes.push("Compras");
  }

  if (costePersonal === 0 && personal && personal.costeEstimado > 0) {
    costePersonal = personal.costeEstimado;
    fuentes.push("Personal");
  }

  if (beneficioEstimado === 0 && ventas > 0) {
    beneficioEstimado = fmtNum(ventas - comprasVal - costePersonal);
    margenPct = fmtNum((beneficioEstimado / ventas) * 100, 1);
  }

  if (reviews && reviews.totalResenas > 0) {
    ratingGoogle = reviews.rating;
    totalResenas = reviews.totalResenas;
    pendientesResenas = reviews.pendientes;
    progresoResenasPct = fmtNum(Math.min(100, (reviews.totalResenas / 1000) * 100), 1);
    fuentes.push("Google Reviews");
  }

  const ticketMedio = clientes > 0 ? fmtNum(ventas / clientes) : 0;

  return {
    ventas,
    clientes,
    ticketMedio,
    compras: comprasVal,
    costePersonal,
    beneficioEstimado,
    margenPct,
    ratingGoogle,
    totalResenas,
    progresoResenasPct,
    pendientesResenas,
    fuentes: [...new Set(fuentes)],
  };
}

export function generarAISummary(
  modules: ModuleInfo[],
  resumen: DatosResumen,
): SugerenciaDatos[] {
  const sugerencias: SugerenciaDatos[] = [];
  const conectados = modules.filter((m) => m.estado === "conectado");
  const sinDatos = modules.filter((m) => m.estado === "sin_datos");

  sugerencias.push({
    id: "conectados",
    tipo: conectados.length >= 3 ? "success" : "info",
    titulo: "Datos conectados",
    mensaje:
      conectados.length > 0
        ? `Módulos activos: ${conectados.map((m) => m.nombre).join(", ")}. ${conectados.length} fuente(s) con datos en localStorage.`
        : "Ningún módulo tiene datos todavía. Usa Personal, Compras, Beneficio o Restosuite KPI para empezar.",
  });

  if (sinDatos.length > 0) {
    sugerencias.push({
      id: "faltantes",
      tipo: "warning",
      titulo: "Pendiente de conectar",
      mensaje: `Sin datos en: ${sinDatos.map((m) => m.nombre).join(", ")}. Completa estos módulos para un cuadro de mando más preciso.`,
    });
  }

  const personalPct =
    resumen.ventas > 0 ? fmtNum((resumen.costePersonal / resumen.ventas) * 100, 1) : 0;
  const comprasPct =
    resumen.ventas > 0 ? fmtNum((resumen.compras / resumen.ventas) * 100, 1) : 0;

  if (resumen.costePersonal > 0 && personalPct >= comprasPct) {
    sugerencias.push({
      id: "impacto-personal",
      tipo: personalPct > 35 ? "danger" : "warning",
      titulo: "Personal impacta más al beneficio",
      mensaje: `El coste de personal (${personalPct}% de ventas) supera al de compras (${comprasPct}%). Optimizar horarios y productividad tiene mayor efecto en margen que negociar proveedores.`,
    });
  } else if (resumen.compras > 0) {
    sugerencias.push({
      id: "impacto-compras",
      tipo: "info",
      titulo: "Compras impacta más al beneficio",
      mensaje: `Las compras representan ${comprasPct}% vs ${personalPct}% de personal. Revisa pedidos en Compras e inventario para reducir mermas.`,
    });
  }

  if (resumen.ventas > 0) {
    sugerencias.push({
      id: "resumen-financiero",
      tipo: resumen.beneficioEstimado > 0 ? "success" : "danger",
      titulo: "Resumen financiero unificado",
      mensaje: `Ventas ${resumen.ventas.toLocaleString("es-ES")} € · Beneficio estimado ${resumen.beneficioEstimado.toLocaleString("es-ES")} € (${resumen.margenPct}% margen). Fuentes: ${resumen.fuentes.join(", ") || "estimación parcial"}.`,
    });
  }

  const restosuiteOk = modules.find((m) => m.id === "restosuite")?.estado === "conectado";
  if (!restosuiteOk) {
    sugerencias.push({
      id: "restosuite-api",
      tipo: "info",
      titulo: "Preparado para Restosuite API",
      mensaje:
        "Configura la API Key y URL cuando tengas acceso. Los datos diarios de ventas se sincronizarán automáticamente con Objetivo 100K y este centro de datos.",
    });
  }

  const reviewsOk = modules.find((m) => m.id === "reviews")?.estado === "conectado";
  const profitOk = modules.find((m) => m.id === "profit")?.estado === "conectado";

  if (reviewsOk && resumen.ratingGoogle > 0) {
    sugerencias.push({
      id: "reviews-ventas",
      tipo: resumen.ratingGoogle >= 4.8 ? "success" : "warning",
      titulo: "Google Reviews + ventas",
      mensaje: `Rating ${resumen.ratingGoogle}★ con ${resumen.totalResenas} reseñas (${resumen.progresoResenasPct}% de 1.000).${resumen.pendientesResenas > 0 ? ` ${resumen.pendientesResenas} pendiente(s) de respuesta.` : ""} Un rating alto correlaciona con +8-15% conversión en reservas y delivery.`,
    });
  }

  if (reviewsOk && profitOk && resumen.ventas > 0) {
    sugerencias.push({
      id: "cruce-profit-reviews",
      tipo: "info",
      titulo: "AI Gerente — cruce Profit + Reviews",
      mensaje: `Con ventas de ${resumen.ventas.toLocaleString("es-ES")} € y ${resumen.ratingGoogle}★, el AI Gerente estima el impacto de reputación en facturación. Abre AI Gerente para el análisis completo.`,
    });
  }

  return sugerencias;
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function exportResumenCsv(
  resumen: DatosResumen,
  modules: ModuleInfo[],
): void {
  const metricRows = [
    ["Ventas", resumen.ventas.toFixed(2)],
    ["Clientes", String(resumen.clientes)],
    ["Ticket medio", resumen.ticketMedio.toFixed(2)],
    ["Compras", resumen.compras.toFixed(2)],
    ["Coste personal", resumen.costePersonal.toFixed(2)],
    ["Beneficio estimado", resumen.beneficioEstimado.toFixed(2)],
    ["Margen %", String(resumen.margenPct)],
    ["Rating Google", resumen.ratingGoogle > 0 ? String(resumen.ratingGoogle) : ""],
    ["Total reseñas", resumen.totalResenas > 0 ? String(resumen.totalResenas) : ""],
    ["Progreso reseñas %", resumen.progresoResenasPct > 0 ? String(resumen.progresoResenasPct) : ""],
    ["Reseñas pendientes", resumen.pendientesResenas > 0 ? String(resumen.pendientesResenas) : ""],
    ["Fuentes", `"${resumen.fuentes.join("; ")}"`],
  ];

  const moduleHeader = ["Módulo", "Estado", "Registros", "Storage Key", "Última actualización"];
  const moduleRows = modules.map((m) => [
    `"${m.nombre.replace(/"/g, '""')}"`,
    m.estado,
    String(m.registros),
    `"${(m.storageKey ?? "").replace(/"/g, '""')}"`,
    `"${(m.ultimaActualizacion ?? "").replace(/"/g, '""')}"`,
  ]);

  const lines = [
    "Métrica,Valor",
    ...metricRows.map((r) => r.join(",")),
    "",
    moduleHeader.join(","),
    ...moduleRows.map((r) => r.join(",")),
  ];

  downloadCsv(lines.join("\n"), "karuma_datos_resumen.csv");
}

export function sincronizarDatos(): DatosConfig {
  const config = loadConfig();
  const updated = { ...config, lastSync: Date.now() };
  saveConfig(updated);
  return updated;
}
