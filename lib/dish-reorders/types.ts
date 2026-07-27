export type DishReorderDailyRecord = {
  date: string;
  locationId: string;
  itemId: string;
  itemName: string;
  category: string;
  ordersWithItem: number;
  reorderedOrders: number;
  reorderEvents: number;
  totalQty: number;
  reorderQty: number;
  gapMinutesSum: number;
  gapSamples: number;
  coveredOrders: number;
  kdsRows: number;
  source: string;
  syncedAt: string;
};

export type DishReorderInsight = {
  itemId: string;
  itemName: string;
  category: string;
  ordersWithItem: number;
  reorderedOrders: number;
  reorderEvents: number;
  totalQty: number;
  reorderQty: number;
  reorderRate: number;
  averageGapMinutes: number | null;
};

export type DishReorderSummary = {
  configured: boolean;
  startDate: string;
  endDate: string;
  updatedAt: string | null;
  daysWithData: number;
  coveredOrders: number;
  records: DishReorderInsight[];
};
