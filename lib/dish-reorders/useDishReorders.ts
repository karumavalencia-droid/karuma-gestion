"use client";

import { useEffect, useState } from "react";
import type { DishReorderSummary } from "./types";

type DishReorderState = DishReorderSummary & {
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

const EMPTY_SUMMARY: DishReorderSummary = {
  configured: true,
  startDate: "",
  endDate: "",
  updatedAt: null,
  daysWithData: 0,
  coveredOrders: 0,
  records: [],
};

export function useDishReorders(
  startDate: string,
  endDate: string,
): DishReorderState {
  const [summary, setSummary] = useState<DishReorderSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ startDate, endDate });
        const response = await fetch(`/api/sales/reorders?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await response.json()) as DishReorderSummary & {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error || `Error ${response.status}`);
        }
        setSummary(data);
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar las repeticiones",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [endDate, requestVersion, startDate]);

  return {
    ...summary,
    loading,
    error,
    refetch: () => setRequestVersion((version) => version + 1),
  };
}
