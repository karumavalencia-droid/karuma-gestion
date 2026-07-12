"use client";

import { useCallback, useEffect, useState } from "react";
import type { RegistroRestosuite } from "@/lib/types";
import type { DailySalesRecord } from "./types";

/**
 * Convierte un DailySalesRecord (tabla sales_daily) al RegistroRestosuite que
 * usan los helpers existentes de Objetivo/Datos. Usa la fecha como id estable
 * (hay como máximo un registro por día y ubicación).
 */
export function dailyToRegistro(record: DailySalesRecord): RegistroRestosuite {
  return {
    id: record.date,
    fecha: record.date,
    ventas: record.netSales,
    clientes: record.customers,
    ticketMedio: record.averageTicket,
    facturas: record.orders,
    ventasBebida: record.drinkSales,
    observaciones: record.notes || "",
  };
}

export type DailySalesState = {
  records: DailySalesRecord[];
  registros: RegistroRestosuite[];
  updatedAt: string | null;
  configured: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

type ApiResponse = {
  configured?: boolean;
  updatedAt?: string | null;
  records?: DailySalesRecord[];
  error?: string;
};

/**
 * Hook cliente: fuente única de verdad de ventas diarias (GET /api/sales/daily).
 * Nunca lanza: expone loading / error para que la UI no se rompa si la API falla.
 */
export function useDailySales(query = ""): DailySalesState {
  const [records, setRecords] = useState<DailySalesRecord[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/sales/daily${query}`, {
          cache: "no-store",
          signal,
        });
        const data = (await response.json()) as ApiResponse;
        if (!response.ok) {
          throw new Error(data.error || `Error ${response.status}`);
        }
        setRecords(Array.isArray(data.records) ? data.records : []);
        setUpdatedAt(data.updatedAt ?? null);
        setConfigured(data.configured !== false);
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "No se pudieron cargar las ventas");
      } finally {
        setLoading(false);
      }
    },
    [query],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const refetch = useCallback(() => {
    void load();
  }, [load]);

  return {
    records,
    registros: records.map(dailyToRegistro),
    updatedAt,
    configured,
    loading,
    error,
    refetch,
  };
}
