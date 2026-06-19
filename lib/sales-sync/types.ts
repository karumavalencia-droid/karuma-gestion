export interface DailySalesRecord {
  date: string;
  grossSales: number;
  netSales: number;
  customers: number;
  orders: number;
  averageTicket: number;
  drinkSales: number;
  deliverySales: number;
  cashSales: number;
  cardSales: number;
  source: string;
  locationId: string;
  externalId: string | null;
  notes: string;
  syncedAt: string;
}

export interface DailySalesStore {
  version: 1;
  updatedAt: string | null;
  records: DailySalesRecord[];
}
export interface DailySalesSummary {
  configured: boolean;
  updatedAt: string | null;
  records: DailySalesRecord[];
}
