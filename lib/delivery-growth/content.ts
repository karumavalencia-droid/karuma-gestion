import type { Locale } from "@/lib/i18n";

const shared = {
  platforms: [
    {
      name: "Uber Eats",
      sales: "150€",
      orders: "6",
      average: "25€",
      rating: "4.7",
      cancelled: "0",
    },
    {
      name: "Glovo",
      sales: "100€",
      orders: "4",
      average: "25€",
      rating: "4.6",
      cancelled: "1",
    },
  ],
  combos: [
    {
      name: "Combo Pareja",
      price: "29.90€ - 34.90€",
      items: ["24 piezas sushi", "2 entrantes", "2 bebidas"],
    },
    {
      name: "Combo Amigos",
      price: "49.90€ - 59.90€",
      items: ["48 piezas sushi", "4 entrantes", "gyoza / pollo / arroz"],
    },
    {
      name: "Salmón Lover",
      price: "24.90€ - 29.90€",
      items: ["Nigiri salmón", "Uramaki salmón", "Tartar salmón", "Salmón flameado"],
    },
  ],
  menuItems: [
    "Combo Pareja",
    "Combo Amigos",
    "Salmón Lover",
    "Uramaki Mix",
    "Entrantes Pack",
    "Bebidas",
  ],
} as const;

const es = {
  title: "Plan de crecimiento delivery",
  description: "Plan para aumentar las ventas de Uber Eats y Glovo",
  currentDelivery: "Delivery actual",
  target: "Objetivo",
  deliveryShare: "Peso delivery",
  todayActions: "Acciones prioritarias de hoy",
  todayActionItems: [
    "Actualizar la portada en ambas plataformas",
    "Publicar Combo Pareja",
    "Colocar los tres combos al principio del menú",
  ],
  diagnosisTitle: "Diagnóstico delivery actual",
  yesterdayRevenue: "Facturación total de ayer",
  dineIn: "Sala",
  delivery: "Delivery",
  conclusion: "La sala funciona bien, pero el peso del delivery todavía es bajo.",
  opportunity:
    "El delivery no ocupa mesas y es una oportunidad importante para aumentar la facturación.",
  goalsTitle: "Objetivos delivery a 30 días",
  current: "Actual",
  phaseOne: "Objetivo fase 1",
  phaseTwo: "Objetivo fase 2",
  perDay: "/día",
  shareGoal: "Objetivo de peso delivery",
  platformsTitle: "Plataformas prioritarias",
  todaySales: "Ventas hoy",
  orders: "Pedidos",
  averageOrder: "Ticket medio",
  rating: "Valoración",
  cancelled: "Pedidos cancelados",
  mainProblem: "Problema principal",
  platformProblems: [
    "Mejorar conversión de portada y combos",
    "Revisar cancelaciones y tiempo de entrega",
  ],
  combosTitle: "Combos recomendados",
  comboDescriptions: ["Para 2 personas", "Para 3-4 personas", "Para amantes del salmón"],
  suggestedPrice: "Precio recomendado",
  pending: "Pendiente",
  checklistTitle: "Checklist de optimización delivery",
  checklist: [
    "Actualizar la imagen principal",
    "Cada combo debe tener una foto clara",
    "Usar nombres de combos sencillos",
    "Reducir la dificultad de elección",
    "Crear un combo para 2 personas",
    "Crear un combo para 3-4 personas",
    "Crear un combo viral de salmón",
    "Los primeros 5 productos deben ser combos de alta conversión",
    "Configurar al menos 1 combo principal en cada plataforma",
    "Revisar el tiempo de entrega",
    "Revisar las causas de malas reseñas",
    "Actualizar la portada una vez por semana",
  ],
  menuTitle: "Estrategia del menú delivery",
  menuHeadline: "No obligues al cliente a crear su propio pedido",
  menuDescription:
    "El usuario de delivery decide rápido. Si elegir es demasiado complicado, abandona. Los combos reducen la dificultad de elección.",
  menuStructure: "Estructura recomendada",
  dailyTitle: "Seguimiento diario delivery",
  date: "Fecha",
  yesterday: "Ayer",
  uberSales: "Ventas Uber Eats",
  glovoSales: "Ventas Glovo",
  totalDelivery: "Delivery total",
  notes: "Notas",
  dailyNote: "La sala funciona bien; toca hacer crecer delivery",
  weeklyTitle: "Revisión semanal",
  weeklyFields: [
    "Total delivery semanal",
    "Total Uber Eats",
    "Total Glovo",
    "Combo más vendido",
    "Combo menos vendido",
    "Ticket medio",
    "Número de malas reseñas",
    "Mejora para la próxima semana",
  ],
  waitingReview: "Pendiente de revisión semanal",
  ...shared,
} as const;

export type DeliveryGrowthCopy = typeof es;

export function getDeliveryGrowthCopy(_locale: Locale): DeliveryGrowthCopy {
  void _locale;
  return es;
}
