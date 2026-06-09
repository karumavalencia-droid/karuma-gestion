"use client";

import { Pencil, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { recipeSamples } from "@/lib/erp-v1/data";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function RecipesErpPanel() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pages.recipes.title")}
        description={t("pages.recipes.description")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {recipeSamples.map((recipe) => (
          <article
            key={recipe.id}
            className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-karuma-50 text-karuma-600">
                  <ChefHat className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{recipe.nombre}</h3>
                  <StatusBadge variant="info">{recipe.categoria}</StatusBadge>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4" />
                <span className="hidden sm:inline">{t("pages.recipes.edit")}</span>
              </Button>
            </div>

            <dl className="space-y-2.5 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  {t("pages.recipes.rationalSteps")}
                </dt>
                <dd className="mt-0.5 text-gray-700">{recipe.pasosRational}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  {t("pages.recipes.frySteps")}
                </dt>
                <dd className="mt-0.5 text-gray-700">{recipe.pasosFritura}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  {t("pages.recipes.notes")}
                </dt>
                <dd className="mt-0.5 text-gray-600">{recipe.notas}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
