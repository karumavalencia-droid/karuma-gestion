import {
  PlataformaReview,
  RegistroMensualReviews,
  ResenaReview,
  ReviewsStore,
} from "@/lib/types";

export const STORAGE_KEY = "karuma_reviews_v1";
export const OBJETIVO_RESENAS = 1_000;

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function fmtNum(value: number, decimals = 2): number {
  return parseFloat(value.toFixed(decimals));
}

function seedResenas(): ResenaReview[] {
  return [
    {
      id: "rev-1",
      fecha: "2026-06-05",
      autor: "María G.",
      rating: 5,
      texto: "El mejor sushi de Valencia. Servicio impecable y ambiente muy agradable.",
      plataforma: "Google",
      respondida: true,
      respuesta: "¡Muchas gracias María! Nos encanta tenerte en Karuma.",
    },
    {
      id: "rev-2",
      fecha: "2026-06-04",
      autor: "Carlos R.",
      rating: 5,
      texto: "Pedimos delivery y llegó caliente y perfecto. Repetiremos seguro.",
      plataforma: "Google",
      respondida: true,
      respuesta: "Gracias Carlos, ¡te esperamos pronto!",
    },
    {
      id: "rev-3",
      fecha: "2026-06-03",
      autor: "Laura M.",
      rating: 4,
      texto: "Muy buena comida. Un poco de espera en hora punta pero merece la pena.",
      plataforma: "TheFork",
      respondida: false,
    },
    {
      id: "rev-4",
      fecha: "2026-06-02",
      autor: "Pedro S.",
      rating: 5,
      texto: "Experiencia top. El teppanyaki en vivo es espectacular.",
      plataforma: "TripAdvisor",
      respondida: true,
      respuesta: "¡Gracias Pedro! El show en vivo es nuestra joya.",
    },
    {
      id: "rev-5",
      fecha: "2026-06-01",
      autor: "Ana V.",
      rating: 2,
      texto: "Pedido tardó más de lo indicado en Glovo. Comida bien pero servicio mejorable.",
      plataforma: "Google",
      respondida: false,
    },
    {
      id: "rev-6",
      fecha: "2026-05-28",
      autor: "Jorge L.",
      rating: 5,
      texto: "Increíble relación calidad-precio para un restaurante de este nivel.",
      plataforma: "Google",
      respondida: true,
      respuesta: "¡Gracias Jorge! Trabajamos cada día para mantener esa calidad.",
    },
    {
      id: "rev-7",
      fecha: "2026-05-25",
      autor: "Elena P.",
      rating: 3,
      texto: "Buen sushi pero el local estaba muy lleno y ruidoso.",
      plataforma: "TripAdvisor",
      respondida: false,
    },
    {
      id: "rev-8",
      fecha: "2026-05-20",
      autor: "David F.",
      rating: 5,
      texto: "Celebramos un cumpleaños y el equipo fue súper atento. 10/10.",
      plataforma: "Google",
      respondida: true,
      respuesta: "¡Felicidades de nuevo! Gracias por confiar en Karuma.",
    },
  ];
}

function seedRegistrosMensuales(): RegistroMensualReviews[] {
  return [
    {
      id: "rev-mes-2026-01",
      mes: "2026-01",
      totalResenas: 310,
      rating: 4.84,
      nuevasResenas: 28,
      positivas: 26,
      negativas: 2,
      pendientesRespuesta: 1,
    },
    {
      id: "rev-mes-2026-02",
      mes: "2026-02",
      totalResenas: 335,
      rating: 4.86,
      nuevasResenas: 25,
      positivas: 24,
      negativas: 1,
      pendientesRespuesta: 1,
    },
    {
      id: "rev-mes-2026-03",
      mes: "2026-03",
      totalResenas: 360,
      rating: 4.87,
      nuevasResenas: 25,
      positivas: 23,
      negativas: 2,
      pendientesRespuesta: 2,
    },
    {
      id: "rev-mes-2026-04",
      mes: "2026-04",
      totalResenas: 385,
      rating: 4.88,
      nuevasResenas: 25,
      positivas: 24,
      negativas: 1,
      pendientesRespuesta: 1,
    },
    {
      id: "rev-mes-2026-05",
      mes: "2026-05",
      totalResenas: 410,
      rating: 4.89,
      nuevasResenas: 25,
      positivas: 24,
      negativas: 1,
      pendientesRespuesta: 3,
    },
    {
      id: "rev-mes-2026-06",
      mes: "2026-06",
      totalResenas: 431,
      rating: 4.9,
      nuevasResenas: 21,
      positivas: 19,
      negativas: 2,
      pendientesRespuesta: 4,
    },
  ];
}

export function seedReviews(): ReviewsStore {
  return {
    objetivoResenas: OBJETIVO_RESENAS,
    ratingActual: 4.9,
    totalResenas: 431,
    registrosMensuales: seedRegistrosMensuales(),
    resenas: seedResenas(),
  };
}

function normalizeResena(raw: unknown): ResenaReview | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const fecha = String(r.fecha ?? "").slice(0, 10);
  if (!fecha) return null;

  const rating = Math.min(5, Math.max(1, Math.round(parseFloat(String(r.rating ?? 5)) || 5)));
  const plataforma = String(r.plataforma ?? "Google");
  const plataformas = ["Google", "TripAdvisor", "TheFork"] as const;

  return {
    id: String(r.id ?? genId()),
    fecha,
    autor: String(r.autor ?? "Anónimo").trim() || "Anónimo",
    rating,
    texto: String(r.texto ?? "").trim(),
    plataforma: plataformas.includes(plataforma as (typeof plataformas)[number])
      ? (plataforma as (typeof plataformas)[number])
      : "Google",
    respondida: Boolean(r.respondida),
    respuesta: r.respuesta ? String(r.respuesta) : undefined,
  };
}

function normalizeRegistroMensual(raw: unknown): RegistroMensualReviews | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const mes = String(r.mes ?? "").slice(0, 7);
  if (!mes || mes.length < 7) return null;

  return {
    id: String(r.id ?? genId()),
    mes,
    totalResenas: Math.max(0, Math.round(parseFloat(String(r.totalResenas ?? 0)) || 0)),
    rating: fmtNum(Math.min(5, Math.max(1, parseFloat(String(r.rating ?? 5)) || 5)), 2),
    nuevasResenas: Math.max(0, Math.round(parseFloat(String(r.nuevasResenas ?? 0)) || 0)),
    positivas: Math.max(0, Math.round(parseFloat(String(r.positivas ?? 0)) || 0)),
    negativas: Math.max(0, Math.round(parseFloat(String(r.negativas ?? 0)) || 0)),
    pendientesRespuesta: Math.max(
      0,
      Math.round(parseFloat(String(r.pendientesRespuesta ?? 0)) || 0),
    ),
  };
}

export function loadReviews(): ReviewsStore {
  if (typeof window === "undefined") return seedReviews();

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedReviews();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const registrosMensuales = Array.isArray(parsed.registrosMensuales)
      ? parsed.registrosMensuales
          .map(normalizeRegistroMensual)
          .filter((r): r is RegistroMensualReviews => r !== null)
      : [];
    const resenas = Array.isArray(parsed.resenas)
      ? parsed.resenas.map(normalizeResena).filter((r): r is ResenaReview => r !== null)
      : [];

    const store: ReviewsStore = {
      objetivoResenas: Math.max(
        1,
        Math.round(parseFloat(String(parsed.objetivoResenas ?? OBJETIVO_RESENAS)) || OBJETIVO_RESENAS),
      ),
      ratingActual: fmtNum(
        Math.min(5, Math.max(1, parseFloat(String(parsed.ratingActual ?? 4.9)) || 4.9)),
        2,
      ),
      totalResenas: Math.max(
        0,
        Math.round(parseFloat(String(parsed.totalResenas ?? 431)) || 431),
      ),
      registrosMensuales:
        registrosMensuales.length > 0 ? registrosMensuales : seedRegistrosMensuales(),
      resenas: resenas.length > 0 ? resenas : seedResenas(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return store;
  } catch {
    const seeded = seedReviews();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

export function saveReviews(store: ReviewsStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function mesLabel(mes: string): string {
  const [y, m] = mes.split("-");
  const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  return d.toLocaleDateString("es-ES", { month: "short", year: "numeric" });
}

export function isPositiva(rating: number): boolean {
  return rating >= 4;
}

export function countPositivas(resenas: ResenaReview[]): number {
  return resenas.filter((r) => isPositiva(r.rating)).length;
}

export function countNegativas(resenas: ResenaReview[]): number {
  return resenas.filter((r) => !isPositiva(r.rating)).length;
}

export function countPendientes(resenas: ResenaReview[]): number {
  return resenas.filter((r) => !r.respondida).length;
}

export interface ReviewsMetrics {
  ratingActual: number;
  totalResenas: number;
  objetivoResenas: number;
  progresoPct: number;
  faltanResenas: number;
  positivas: number;
  negativas: number;
  pendientesRespuesta: number;
  pctPositivas: number;
  pctNegativas: number;
  nuevasMesActual: number;
  variacionRating: number;
  evolucionMensual: {
    mes: string;
    label: string;
    totalResenas: number;
    rating: number;
    nuevasResenas: number;
  }[];
}

export function computeMetrics(store: ReviewsStore, now = new Date()): ReviewsMetrics {
  const year = now.getFullYear();
  const month = now.getMonth();
  const mesKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  const registrosOrdenados = [...store.registrosMensuales].sort((a, b) =>
    a.mes.localeCompare(b.mes),
  );

  const registroActual = registrosOrdenados.find((r) => r.mes === mesKey) ?? null;
  const registroAnterior =
    registrosOrdenados.length >= 2
      ? registrosOrdenados[registrosOrdenados.length - 2]
      : null;

  const positivas = countPositivas(store.resenas);
  const negativas = countNegativas(store.resenas);
  const pendientesRespuesta = countPendientes(store.resenas);
  const totalListadas = store.resenas.length;

  const progresoPct = fmtNum(
    Math.min(100, (store.totalResenas / store.objetivoResenas) * 100),
    1,
  );

  return {
    ratingActual: store.ratingActual,
    totalResenas: store.totalResenas,
    objetivoResenas: store.objetivoResenas,
    progresoPct,
    faltanResenas: Math.max(0, store.objetivoResenas - store.totalResenas),
    positivas: registroActual?.positivas ?? positivas,
    negativas: registroActual?.negativas ?? negativas,
    pendientesRespuesta: registroActual?.pendientesRespuesta ?? pendientesRespuesta,
    pctPositivas: totalListadas > 0 ? fmtNum((positivas / totalListadas) * 100, 1) : 0,
    pctNegativas: totalListadas > 0 ? fmtNum((negativas / totalListadas) * 100, 1) : 0,
    nuevasMesActual: registroActual?.nuevasResenas ?? 0,
    variacionRating: registroAnterior
      ? fmtNum(store.ratingActual - registroAnterior.rating, 2)
      : 0,
    evolucionMensual: registrosOrdenados.map((r) => ({
      mes: r.mes,
      label: mesLabel(r.mes),
      totalResenas: r.totalResenas,
      rating: r.rating,
      nuevasResenas: r.nuevasResenas,
    })),
  };
}

export interface SugerenciaAI {
  id: string;
  tipo: "success" | "warning" | "info" | "danger";
  titulo: string;
  mensaje: string;
}

/** Estimación: +5% ventas por cada 0,1★ sobre 4,5 (benchmark hostelería). */
export function estimarImpactoVentas(rating: number, ventasBase = 71_734): number {
  const base = 4.5;
  const incrementoPorDecima = 0.05;
  const diff = Math.max(0, rating - base);
  return fmtNum(ventasBase * (1 + diff * 10 * incrementoPorDecima), 0);
}

export function generarSugerenciasAI(m: ReviewsMetrics): SugerenciaAI[] {
  const sugerencias: SugerenciaAI[] = [];
  const ventasEstimadas = estimarImpactoVentas(m.ratingActual);
  const ventasSiObjetivo = estimarImpactoVentas(4.95);

  sugerencias.push({
    id: "impacto-ventas",
    tipo: m.ratingActual >= 4.8 ? "success" : "info",
    titulo: "Impacto en ventas",
    mensaje: `Con un rating de ${m.ratingActual}★, se estima un impacto positivo en facturación de ~${ventasEstimadas.toLocaleString("es-ES")} €/mes (base 71.734 €). Los restaurantes por encima de 4,8★ suelen captar un 12-18% más de reservas online que la media del barrio.`,
  });

  if (m.ratingActual >= 4.9) {
    sugerencias.push({
      id: "rating-excelente",
      tipo: "success",
      titulo: "Reputación excelente",
      mensaje: `El ${m.ratingActual}★ sitúa a Karuma en el top 5% de restaurantes en Google Valencia. Mantener esta nota con ${m.totalResenas} reseñas refuerza la confianza en delivery y reservas TheFork.`,
    });
  } else if (m.ratingActual < 4.5) {
    sugerencias.push({
      id: "rating-bajo",
      tipo: "danger",
      titulo: "Rating por debajo del umbral",
      mensaje: `Por debajo de 4,5★ el algoritmo de Google reduce visibilidad ~20%. Prioriza responder reseñas negativas y resolver incidencias de servicio.`,
    });
  }

  sugerencias.push({
    id: "objetivo-1000",
    tipo: m.progresoPct >= 50 ? "info" : "warning",
    titulo: "Objetivo 1.000 reseñas",
    mensaje: `Llevas ${m.totalResenas} de ${m.objetivoResenas} reseñas (${m.progresoPct}%). Faltan ${m.faltanResenas}. Alcanzar 1.000 reseñas con 4,9★ podría elevar ventas estimadas a ~${ventasSiObjetivo.toLocaleString("es-ES")} €/mes por mayor conversión en búsquedas locales.`,
  });

  if (m.pendientesRespuesta > 0) {
    sugerencias.push({
      id: "pendientes",
      tipo: "warning",
      titulo: "Respuestas pendientes",
      mensaje: `Hay ${m.pendientesRespuesta} reseña(s) sin responder. Responder en menos de 48 h mejora la percepción un 30% y reduce el impacto de valoraciones negativas en nuevos clientes.`,
    });
  } else {
    sugerencias.push({
      id: "sin-pendientes",
      tipo: "success",
      titulo: "Todas las reseñas respondidas",
      mensaje: "Buen trabajo: no hay respuestas pendientes. Google valora la interacción activa con clientes.",
    });
  }

  if (m.negativas > 0) {
    sugerencias.push({
      id: "negativas",
      tipo: "warning",
      titulo: "Reseñas negativas",
      mensaje: `${m.negativas} reseña(s) negativa(s) este mes (≤3★). Cada reseña de 1-2★ sin gestionar puede costar ~3-5 reservas/mes. Contacta a clientes insatisfechos y ofrece compensación cuando proceda.`,
    });
  }

  if (m.variacionRating > 0) {
    sugerencias.push({
      id: "tendencia-subida",
      tipo: "success",
      titulo: "Tendencia al alza",
      mensaje: `El rating subió +${m.variacionRating}★ respecto al mes anterior. Si mantienes ${m.nuevasMesActual} reseñas nuevas/mes, alcanzarás 1.000 reseñas en ~${Math.ceil(m.faltanResenas / Math.max(1, m.nuevasMesActual))} meses.`,
    });
  }

  sugerencias.push({
    id: "delivery-reputacion",
    tipo: "info",
    titulo: "Delivery y reputación",
    mensaje:
      "El 68% de usuarios consulta reseñas antes de pedir en Glovo/Uber Eats. Un 4,9★ en Google se correlaciona con +8% de repetición en canales delivery frente a competidores con 4,5★.",
  });

  return sugerencias;
}

export const EMPTY_RESENA_FORM: {
  fecha: string;
  autor: string;
  rating: string;
  texto: string;
  plataforma: PlataformaReview;
  respondida: boolean;
  respuesta: string;
} = {
  fecha: new Date().toISOString().slice(0, 10),
  autor: "",
  rating: "5",
  texto: "",
  plataforma: "Google",
  respondida: false,
  respuesta: "",
};

export type ResenaForm = typeof EMPTY_RESENA_FORM;

export function resenaToForm(r: ResenaReview): ResenaForm {
  return {
    fecha: r.fecha,
    autor: r.autor,
    rating: String(r.rating),
    texto: r.texto,
    plataforma: r.plataforma,
    respondida: r.respondida,
    respuesta: r.respuesta ?? "",
  };
}

export function parseResenaForm(form: ResenaForm): Omit<ResenaReview, "id"> | null {
  const fecha = form.fecha.slice(0, 10);
  if (!fecha) return null;

  const rating = Math.min(5, Math.max(1, Math.round(parseFloat(form.rating) || 5)));

  return {
    fecha,
    autor: form.autor.trim() || "Anónimo",
    rating,
    texto: form.texto.trim(),
    plataforma: form.plataforma,
    respondida: form.respondida || Boolean(form.respuesta.trim()),
    respuesta: form.respuesta.trim() || undefined,
  };
}

export const EMPTY_MES_FORM = {
  mes: new Date().toISOString().slice(0, 7),
  totalResenas: "",
  rating: "",
  nuevasResenas: "",
  positivas: "",
  negativas: "",
  pendientesRespuesta: "",
};

export type MesForm = typeof EMPTY_MES_FORM;

export function registroMesToForm(r: RegistroMensualReviews): MesForm {
  return {
    mes: r.mes,
    totalResenas: String(r.totalResenas),
    rating: String(r.rating),
    nuevasResenas: String(r.nuevasResenas),
    positivas: String(r.positivas),
    negativas: String(r.negativas),
    pendientesRespuesta: String(r.pendientesRespuesta),
  };
}

export function parseMesForm(form: MesForm): Omit<RegistroMensualReviews, "id"> | null {
  const mes = form.mes.slice(0, 7);
  if (!mes || mes.length < 7) return null;

  const totalResenas = Math.max(0, Math.round(parseFloat(form.totalResenas) || 0));
  if (totalResenas <= 0) return null;

  return {
    mes,
    totalResenas,
    rating: fmtNum(Math.min(5, Math.max(1, parseFloat(form.rating) || 5)), 2),
    nuevasResenas: Math.max(0, Math.round(parseFloat(form.nuevasResenas) || 0)),
    positivas: Math.max(0, Math.round(parseFloat(form.positivas) || 0)),
    negativas: Math.max(0, Math.round(parseFloat(form.negativas) || 0)),
    pendientesRespuesta: Math.max(0, Math.round(parseFloat(form.pendientesRespuesta) || 0)),
  };
}
