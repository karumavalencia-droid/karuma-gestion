import type { NivelRiesgo, TipoAlertaIA } from "@/lib/data/ai-gerente";
import {
  alertasInteligentes,
  recomendacionesIA,
  resumenDiaIA,
} from "@/lib/data/ai-gerente";
import { OBJETIVO_VENTAS } from "@/lib/profit/helpers";
import { estimarImpactoVentas, fmtNum } from "@/lib/reviews/helpers";
import type { GerenteContext } from "./context";

export const OBJETIVO_100K = OBJETIVO_VENTAS;

export interface GerenteKpis {
  ventasHoy: number;
  clientesHoy: number;
  beneficioEstimado: number;
  margenPct: number;
  ventasMes: number;
  progreso100kPct: number;
  falta100k: number;
  googleRating: number | null;
  totalResenas: number | null;
  clientesNecesarios: number;
  ticketMedio: number;
  recomendacionIA: string;
  recomendacionImpacto: "alto" | "medio";
}

export interface ResumenGerenteLive {
  ventas: number;
  clientes: number;
  ticketMedio: number;
  beneficio: number;
  margenPct: number;
  rating: number | null;
  totalResenas: number | null;
  progresoResenasPct: number | null;
  nivelRiesgo: NivelRiesgo;
  resumenTexto: string;
  fuentes: string[];
  esLive: boolean;
}

export interface AlertaGerenteLive {
  id: string;
  tipo: TipoAlertaIA | "reputacion" | "beneficio";
  titulo: string;
  mensaje: string;
  prioridad: "alta" | "media";
}

export interface RecomendacionGerenteLive {
  id: string;
  texto: string;
  impacto: "alto" | "medio";
  fuente: string;
}

function ventasPrincipal(ctx: GerenteContext): number {
  return ctx.profit?.ventas ?? ctx.restosuite?.ventasMes ?? 0;
}

function clientesPrincipal(ctx: GerenteContext): number {
  if (ctx.restosuite && ctx.restosuite.clientesMes > 0) return ctx.restosuite.clientesMes;
  const ventas = ventasPrincipal(ctx);
  const ticket = ctx.restosuite?.ticketMedio ?? 23;
  return ventas > 0 ? Math.round(ventas / ticket) : 0;
}

function ventasMesActual(ctx: GerenteContext): number {
  return ctx.restosuite?.ventasMes ?? ctx.profit?.ventas ?? 0;
}

function ticketMedioActual(ctx: GerenteContext): number {
  if (ctx.restosuite && ctx.restosuite.ticketMedio > 0) return ctx.restosuite.ticketMedio;
  const ventas = ventasMesActual(ctx);
  const clientes = clientesPrincipal(ctx);
  return clientes > 0 ? fmtNum(ventas / clientes) : 23.5;
}

function ventasHoyActual(ctx: GerenteContext): { ventas: number; clientes: number } {
  if (ctx.restosuite && ctx.restosuite.ventasHoy > 0) {
    return { ventas: ctx.restosuite.ventasHoy, clientes: ctx.restosuite.clientesHoy };
  }

  const ventasMes = ventasMesActual(ctx);
  const day = Math.max(1, new Date().getDate());

  if (ventasMes > 0) {
    const estimado = fmtNum(ventasMes / day);
    const ticket = ticketMedioActual(ctx);
    return {
      ventas: estimado,
      clientes: ticket > 0 ? Math.round(estimado / ticket) : 0,
    };
  }

  if (!ctx.hasLiveData) {
    return {
      ventas: resumenDiaIA.ventasEstimadas,
      clientes: resumenDiaIA.clientesEstimados,
    };
  }

  return { ventas: 0, clientes: 0 };
}

function beneficioEstimadoActual(ctx: GerenteContext): { beneficio: number; margenPct: number } {
  if (ctx.profit) {
    return { beneficio: ctx.profit.beneficio, margenPct: ctx.profit.margenPct };
  }

  const ventas = ventasMesActual(ctx);
  if (ventas <= 0) return { beneficio: 0, margenPct: 0 };

  const margen = 15;
  return { beneficio: fmtNum(ventas * (margen / 100)), margenPct: margen };
}

export function buildKpisLive(ctx: GerenteContext): GerenteKpis {
  const { ventas: ventasHoy, clientes: clientesHoy } = ventasHoyActual(ctx);
  const ventasMes = ventasMesActual(ctx);
  const ticketMedio = ticketMedioActual(ctx);
  const { beneficio, margenPct } = beneficioEstimadoActual(ctx);
  const falta100k = fmtNum(Math.max(0, OBJETIVO_100K - ventasMes), 0);
  const progreso100kPct = fmtNum(
    Math.min(100, ventasMes > 0 ? (ventasMes / OBJETIVO_100K) * 100 : 0),
    1,
  );
  const clientesNecesarios =
    falta100k > 0 && ticketMedio > 0 ? Math.ceil(falta100k / ticketMedio) : 0;

  const recs = buildRecomendacionesLive(ctx);
  const principal = recs[0] ?? {
    texto: "Conecta Reviews, Restosuite y Profit para recomendaciones personalizadas.",
    impacto: "medio" as const,
  };

  return {
    ventasHoy,
    clientesHoy,
    beneficioEstimado: beneficio,
    margenPct,
    ventasMes,
    progreso100kPct,
    falta100k,
    googleRating: ctx.reviews?.rating ?? null,
    totalResenas: ctx.reviews?.totalResenas ?? null,
    clientesNecesarios,
    ticketMedio,
    recomendacionIA: principal.texto,
    recomendacionImpacto: principal.impacto,
  };
}

function calcularRiesgo(ctx: GerenteContext): NivelRiesgo {
  let score = 0;
  if (ctx.profit && ctx.profit.beneficio < 0) score += 2;
  if (ctx.profit && ctx.profit.margenPct < 10) score += 1;
  if (ctx.reviews && ctx.reviews.pendientes >= 3) score += 1;
  if (ctx.reviews && ctx.reviews.rating < 4.5) score += 2;
  if (ctx.reviews && ctx.reviews.negativas >= 3) score += 1;
  if (score >= 3) return "alto";
  if (score >= 1) return "medio";
  return "bajo";
}

export function buildResumenLive(ctx: GerenteContext): ResumenGerenteLive {
  if (!ctx.hasLiveData) {
    return {
      ventas: resumenDiaIA.ventasEstimadas,
      clientes: resumenDiaIA.clientesEstimados,
      ticketMedio: resumenDiaIA.ticketMedio,
      beneficio: 0,
      margenPct: 0,
      rating: null,
      totalResenas: null,
      progresoResenasPct: null,
      nivelRiesgo: resumenDiaIA.nivelRiesgo,
      resumenTexto: resumenDiaIA.resumenTexto,
      fuentes: [],
      esLive: false,
    };
  }

  const ventas = ventasPrincipal(ctx);
  const clientes = clientesPrincipal(ctx);
  const ticketMedio =
    ctx.restosuite?.ticketMedio ?? (clientes > 0 ? ventas / clientes : 0);
  const beneficio = ctx.profit?.beneficio ?? 0;
  const margenPct = ctx.profit?.margenPct ?? 0;
  const nivelRiesgo = calcularRiesgo(ctx);

  const partes: string[] = [];

  if (ctx.restosuite) {
    if (ctx.restosuite.ventasHoy > 0) {
      partes.push(
        `Hoy Restosuite registra ${ctx.restosuite.ventasHoy.toLocaleString("es-ES")} € y ${ctx.restosuite.clientesHoy} clientes.`,
      );
    } else {
      partes.push(
        `Restosuite: ${ctx.restosuite.ventasMes.toLocaleString("es-ES")} € este mes con ${ctx.restosuite.clientesMes} clientes.`,
      );
    }
  }

  if (ctx.profit) {
    partes.push(
      `Beneficio neto estimado ${ctx.profit.beneficio.toLocaleString("es-ES")} € (margen ${ctx.profit.margenPct}%).`,
    );
  }

  if (ctx.reviews) {
    partes.push(
      `Google Reviews: ${ctx.reviews.rating}★ con ${ctx.reviews.totalResenas} reseñas (${ctx.reviews.progresoPct}% del objetivo 1.000).`,
    );
    if (ctx.reviews.pendientes > 0) {
      partes.push(`${ctx.reviews.pendientes} reseña(s) pendiente(s) de respuesta.`);
    }
  }

  return {
    ventas,
    clientes,
    ticketMedio,
    beneficio,
    margenPct,
    rating: ctx.reviews?.rating ?? null,
    totalResenas: ctx.reviews?.totalResenas ?? null,
    progresoResenasPct: ctx.reviews?.progresoPct ?? null,
    nivelRiesgo,
    resumenTexto: partes.join(" "),
    fuentes: ctx.fuentes,
    esLive: true,
  };
}

export function buildAlertasLive(ctx: GerenteContext): AlertaGerenteLive[] {
  if (!ctx.hasLiveData) {
    return alertasInteligentes.map((a) => ({ ...a, tipo: a.tipo }));
  }

  const alertas: AlertaGerenteLive[] = [];

  if (ctx.reviews) {
    if (ctx.reviews.pendientes > 0) {
      alertas.push({
        id: "reviews-pendientes",
        tipo: "reputacion",
        titulo: "Reseñas sin responder",
        mensaje: `${ctx.reviews.pendientes} reseña(s) en Google/TheFork/TripAdvisor esperan respuesta. Responder en 48 h mejora conversión un ~30%.`,
        prioridad: ctx.reviews.pendientes >= 3 ? "alta" : "media",
      });
    }
    if (ctx.reviews.negativas > 0) {
      alertas.push({
        id: "reviews-negativas",
        tipo: "reputacion",
        titulo: "Reseñas negativas",
        mensaje: `${ctx.reviews.negativas} reseña(s) negativa(s) este mes. Rating global: ${ctx.reviews.rating}★.`,
        prioridad: ctx.reviews.rating < 4.5 ? "alta" : "media",
      });
    }
    if (ctx.reviews.progresoPct < 50) {
      alertas.push({
        id: "reviews-objetivo",
        tipo: "reputacion",
        titulo: "Objetivo 1.000 reseñas",
        mensaje: `Progreso ${ctx.reviews.progresoPct}% (${ctx.reviews.totalResenas}/1.000). Más reseñas mejoran visibilidad en Google Maps y delivery.`,
        prioridad: "media",
      });
    }
  }

  if (ctx.profit) {
    if (ctx.profit.beneficio < 0) {
      alertas.push({
        id: "profit-negativo",
        tipo: "beneficio",
        titulo: "Beneficio negativo",
        mensaje: `Pérdida estimada de ${Math.abs(ctx.profit.beneficio).toLocaleString("es-ES")} € este mes. Revisa costes en el módulo Beneficio.`,
        prioridad: "alta",
      });
    } else if (ctx.profit.margenPct < 15) {
      alertas.push({
        id: "profit-margen-bajo",
        tipo: "beneficio",
        titulo: "Margen bajo",
        mensaje: `Margen neto del ${ctx.profit.margenPct}% — por debajo del objetivo hostelería (~20%). Personal: ${ctx.profit.personal.toLocaleString("es-ES")} €, compras: ${ctx.profit.compras.toLocaleString("es-ES")} €.`,
        prioridad: "media",
      });
    }
  }

  if (ctx.restosuite && ctx.profit) {
    const diff = Math.abs(ctx.restosuite.ventasMes - ctx.profit.ventas);
    if (diff > ctx.profit.ventas * 0.05) {
      alertas.push({
        id: "datos-desalineados",
        tipo: "gasto_alto",
        titulo: "Restosuite vs Profit",
        mensaje: `Ventas Restosuite (${ctx.restosuite.ventasMes.toLocaleString("es-ES")} €) y Profit (${ctx.profit.ventas.toLocaleString("es-ES")} €) difieren. Sincroniza datos en Centro de Datos.`,
        prioridad: "media",
      });
    }
  }

  if (alertas.length === 0) {
    alertas.push({
      id: "todo-ok",
      tipo: "reputacion",
      titulo: "Operación estable",
      mensaje: `Rating ${ctx.reviews?.rating ?? "—"}★, beneficio positivo y ventas alineadas. Mantén el ritmo de respuestas a reseñas.`,
      prioridad: "media",
    });
  }

  return alertas;
}

export function buildRecomendacionesLive(ctx: GerenteContext): RecomendacionGerenteLive[] {
  if (!ctx.hasLiveData) {
    return recomendacionesIA.map((r) => ({ ...r, fuente: "simulado" }));
  }

  const recs: RecomendacionGerenteLive[] = [];

  if (ctx.reviews && ctx.reviews.pendientes > 0) {
    recs.push({
      id: "rec-responder",
      texto: `Responder las ${ctx.reviews.pendientes} reseñas pendientes antes del fin de semana — impacto directo en reservas y delivery.`,
      impacto: "alto",
      fuente: "Google Reviews",
    });
  }

  if (ctx.reviews && ctx.reviews.rating >= 4.8) {
    const impacto = estimarImpactoVentas(ctx.reviews.rating, ventasPrincipal(ctx));
    recs.push({
      id: "rec-reputacion-ventas",
      texto: `Tu ${ctx.reviews.rating}★ impulsa ventas estimadas a ~${impacto.toLocaleString("es-ES")} €/mes. Pide reseñas en sala y en tickets delivery para llegar a 1.000.`,
      impacto: "alto",
      fuente: "Google Reviews + Profit",
    });
  }

  if (ctx.profit) {
    const personalPct =
      ctx.profit.ventas > 0
        ? parseFloat(((ctx.profit.personal / ctx.profit.ventas) * 100).toFixed(1))
        : 0;
    if (personalPct > 35) {
      recs.push({
        id: "rec-personal",
        texto: `Personal al ${personalPct}% de ventas. Optimizar turnos puede liberar ${Math.round(ctx.profit.personal * 0.05).toLocaleString("es-ES")} €/mes de margen.`,
        impacto: "alto",
        fuente: "Profit",
      });
    }
  }

  if (ctx.restosuite && ctx.restosuite.ventasMes < 100_000) {
    const falta = 100_000 - ctx.restosuite.ventasMes;
    recs.push({
      id: "rec-objetivo-100k",
      texto: `Faltan ${falta.toLocaleString("es-ES")} € para el objetivo 100K. Combina promos delivery con campaña de reseñas Google para captar clientes nuevos.`,
      impacto: "alto",
      fuente: "Restosuite + Reviews",
    });
  }

  if (ctx.profit && ctx.profit.beneficio > 0) {
    recs.push({
      id: "rec-margen",
      texto: `Beneficio neto ${ctx.profit.beneficio.toLocaleString("es-ES")} € (${ctx.profit.margenPct}%). Reinvierte en marketing local si el rating se mantiene por encima de 4,8★.`,
      impacto: "medio",
      fuente: "Profit",
    });
  }

  if (recs.length === 0) {
    recs.push({
      id: "rec-default",
      texto: "Conecta Reviews, Restosuite y Profit en Centro de Datos para recomendaciones más precisas.",
      impacto: "medio",
      fuente: "AI Gerente",
    });
  }

  return recs.slice(0, 5);
}

export const preguntasRapidasLive = [
  "¿Cómo va el mes?",
  "¿Cómo afectan las reseñas a las ventas?",
  "¿Dónde estoy perdiendo dinero?",
  "¿Qué debo priorizar hoy?",
] as const;

export function getRespuestaGerenteLive(ctx: GerenteContext, pregunta: string): string {
  const trimmed = pregunta.trim();
  if (!trimmed) {
    return "Pregunta sobre ventas (Restosuite), beneficio (Profit), reseñas Google o su impacto en facturación.";
  }

  const q = trimmed.toLowerCase();
  const resumen = buildResumenLive(ctx);

  if (!ctx.hasLiveData) {
    return `No hay datos en vivo todavía. Abre Reviews, Restosuite (Objetivo 100K) y Beneficio para alimentar el AI Gerente. Tu pregunta: «${trimmed}».`;
  }

  const rapidaMap: Record<string, string> = {
    "¿cómo va el mes?": resumen.resumenTexto,
    "¿cómo afectan las reseñas a las ventas?": ctx.reviews
      ? `Con ${ctx.reviews.rating}★ y ${ctx.reviews.totalResenas} reseñas, el impacto estimado en ventas es de ~${estimarImpactoVentas(ctx.reviews.rating, ventasPrincipal(ctx)).toLocaleString("es-ES")} €/mes. Cada 0,1★ por encima de 4,5 añade ~5% de conversión en búsquedas locales y delivery.`
      : "Sin datos de Reviews. Importa tu rating en el módulo Reviews.",
    "¿dónde estoy perdiendo dinero?": ctx.profit
      ? `Mayores costes: compras ${ctx.profit.compras.toLocaleString("es-ES")} €, personal ${ctx.profit.personal.toLocaleString("es-ES")} €, alquiler ${ctx.profit.alquiler.toLocaleString("es-ES")} €. Beneficio neto: ${ctx.profit.beneficio.toLocaleString("es-ES")} € (${ctx.profit.margenPct}%).${ctx.reviews && ctx.reviews.pendientes > 0 ? ` Además, ${ctx.reviews.pendientes} reseñas sin responder pueden costar reservas.` : ""}`
      : "Revisa el módulo Beneficio para el desglose de costes.",
    "¿qué debo priorizar hoy?": [
      ctx.reviews && ctx.reviews.pendientes > 0
        ? `1) Responder ${ctx.reviews.pendientes} reseña(s) pendiente(s).`
        : null,
      ctx.profit && ctx.profit.beneficio < 0
        ? "2) Revisar costes fijos en Beneficio."
        : "2) Mantener margen — revisar compras del día.",
      ctx.restosuite
        ? `3) Ventas mes: ${ctx.restosuite.ventasMes.toLocaleString("es-ES")} € — seguir Objetivo 100K.`
        : null,
    ]
      .filter(Boolean)
      .join(" "),
  };

  const rapida = rapidaMap[q];
  if (rapida) return rapida;

  if (q.includes("reseña") || q.includes("review") || q.includes("google") || q.includes("rating") || q.includes("estrella")) {
    if (!ctx.reviews) return "No hay datos de Google Reviews. Abre el módulo Reviews.";
    return `Rating ${ctx.reviews.rating}★ · ${ctx.reviews.totalResenas} reseñas (${ctx.reviews.progresoPct}% de 1.000). Positivas: ${ctx.reviews.positivas}, negativas: ${ctx.reviews.negativas}, pendientes: ${ctx.reviews.pendientes}. Impacto ventas estimado: ~${estimarImpactoVentas(ctx.reviews.rating, ventasPrincipal(ctx)).toLocaleString("es-ES")} €/mes.`;
  }

  if (q.includes("venta") || q.includes("factur") || q.includes("restosuite") || q.includes("objetivo")) {
    const ventas = ventasPrincipal(ctx);
    const resto = ctx.restosuite;
    return resto
      ? `Ventas mes Restosuite: ${resto.ventasMes.toLocaleString("es-ES")} € · ${resto.clientesMes} clientes · ticket ${resto.ticketMedio.toLocaleString("es-ES")} €.${resto.ventasHoy > 0 ? ` Hoy: ${resto.ventasHoy.toLocaleString("es-ES")} €.` : ""} ${ctx.profit ? `Profit registra ${ctx.profit.ventas.toLocaleString("es-ES")} €.` : ""}`
      : `Ventas del mes: ${ventas.toLocaleString("es-ES")} € según Profit.`;
  }

  if (q.includes("beneficio") || q.includes("margen") || q.includes("profit") || q.includes("coste") || q.includes("gasto") || q.includes("dinero")) {
    if (!ctx.profit) return "Abre el módulo Beneficio para ver costes y margen.";
    return `Ventas ${ctx.profit.ventas.toLocaleString("es-ES")} € · Beneficio neto ${ctx.profit.beneficio.toLocaleString("es-ES")} € (${ctx.profit.margenPct}%). Compras ${ctx.profit.compras.toLocaleString("es-ES")} € · Personal ${ctx.profit.personal.toLocaleString("es-ES")} €.`;
  }

  if (q.includes("cliente") || q.includes("ticket")) {
    return `Clientes mes: ${resumen.clientes} · Ticket medio: ${resumen.ticketMedio.toLocaleString("es-ES")} € · Ventas: ${resumen.ventas.toLocaleString("es-ES")} €.`;
  }

  return `Análisis cruzado (${ctx.fuentes.join(" + ")}): ${resumen.resumenTexto} ¿Quieres profundizar en reseñas, ventas o beneficio?`;
}
