"use client";

import { Pencil } from "lucide-react";
import { PageContent } from "@/components/layout/PageContent";
import { PageHeader } from "@/components/ui/PageHeader";
import { foodCostDishes, marginPct } from "@/lib/erp-v1/data";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { formatCurrency } from "@/lib/utils";

export function FoodCostErpPanel() {
  const { t } = useLanguage();

  return (
    <PageContent>
      <PageHeader description={t("pages.foodCost.description")} hideTitle />

      <div className="grid gap-4 lg:grid-cols-2">
        {foodCostDishes.map((dish) => {
          const margin = marginPct(dish.precio, dish.coste);
          return (
            <article
              key={dish.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{dish.nombre}</h3>
                  <p className="text-sm text-gray-500">{dish.categoria}</p>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  aria-label={t("common.edit")}
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-500">{t("pages.foodCost.price")}</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(dish.precio)}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-500">{t("pages.foodCost.ingredientCost")}</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(dish.coste)}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-500">{t("pages.foodCost.margin")}</p>
                  <p
                    className={`text-sm font-semibold ${
                      margin >= 65
                        ? "text-emerald-600"
                        : margin >= 55
                          ? "text-amber-600"
                          : "text-red-600"
                    }`}
                  >
                    {margin}%
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                  {t("pages.foodCost.recipeIngredients")} ({dish.receta.length})
                </p>
                <ul className="space-y-1.5">
                  {dish.receta.map((line, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-karuma-50/60 px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-gray-800">
                        {line.nombre}
                      </span>
                      <span className="text-gray-600">{line.cantidad}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}
      </div>
    </PageContent>
  );
}
