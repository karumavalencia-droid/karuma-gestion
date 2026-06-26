"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageContent } from "@/components/layout/PageContent";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  EMPTY_INGREDIENT_FORM,
  displayCategory,
  displayName,
  formatUpdatedAt,
  genId,
  ingredientToForm,
  loadIngredients,
  parseIngredientForm,
  saveIngredients,
  seedIngredients,
  type Ingredient,
  type IngredientForm,
  type IngredientsStore,
} from "@/lib/ingredients/helpers";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { formatCurrency } from "@/lib/utils";

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20";

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function IngredientsErpPanel() {
  const { t } = useLanguage();
  const [store, setStore] = useState<IngredientsStore>(seedIngredients);
  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState<"form" | "confirm" | null>(null);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ingredient | null>(null);
  const [form, setForm] = useState<IngredientForm>(EMPTY_INGREDIENT_FORM);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      setStore(loadIngredients());
    } catch {
      setStore(seedIngredients());
    }
  }, []);

  const persist = useCallback((next: IngredientsStore) => {
    saveIngredients(next);
    setStore(next);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const lista = useMemo(() => {
    const items = [...(store?.ingredientes ?? [])].sort((a, b) =>
      displayName(a, "es").localeCompare(displayName(b, "es")),
    );
    if (!busqueda.trim()) return items;
    const q = busqueda.trim().toLowerCase();
    return items.filter(
      (i) =>
        i.nombre.toLowerCase().includes(q) ||
        (i.nombreZh?.toLowerCase().includes(q) ?? false) ||
        i.proveedor.toLowerCase().includes(q),
    );
  }, [store?.ingredientes, busqueda]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_INGREDIENT_FORM);
    setFormError("");
    setModal("form");
  };

  const openEdit = (ing: Ingredient) => {
    setEditing(ing);
    setForm(ingredientToForm(ing));
    setFormError("");
    setModal("form");
  };

  const handleSave = () => {
    if (!store) return;
    const parsed = parseIngredientForm(form);
    if (!parsed) {
      setFormError(t("pages.ingredients.formError"));
      return;
    }

    const now = new Date().toISOString();
    if (editing) {
      persist({
        ingredientes: store.ingredientes.map((i) =>
          i.id === editing.id ? { ...i, ...parsed, updatedAt: now } : i,
        ),
      });
      showToast(t("pages.ingredients.updated"));
    } else {
      persist({
        ingredientes: [{ id: genId(), ...parsed, updatedAt: now }, ...store.ingredientes],
      });
      showToast(t("pages.ingredients.added"));
    }
    setModal(null);
    setEditing(null);
  };

  const handleDelete = () => {
    if (!store || !deleteTarget) return;
    persist({
      ingredientes: store.ingredientes.filter((i) => i.id !== deleteTarget.id),
    });
    showToast(t("pages.ingredients.deleted"));
    setModal(null);
    setDeleteTarget(null);
  };

  return (
    <PageContent>
      <PageHeader description={t("pages.ingredients.description")} hideTitle>
        <Button onClick={openNew} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          {t("pages.ingredients.newIngredient")}
        </Button>
      </PageHeader>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder={t("pages.ingredients.search")}
          className={`${inputClass} pl-9`}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">{t("pages.ingredients.name")}</th>
                <th className="px-4 py-3">{t("pages.ingredients.category")}</th>
                <th className="px-4 py-3">{t("pages.ingredients.unit")}</th>
                <th className="px-4 py-3 text-right">{t("pages.ingredients.unitPrice")}</th>
                <th className="px-4 py-3">{t("pages.ingredients.supplier")}</th>
                <th className="px-4 py-3">{t("pages.ingredients.updatedAt")}</th>
                <th className="px-4 py-3 text-center">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lista.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    {t("pages.ingredients.empty")}
                  </td>
                </tr>
              ) : (
                lista.map((ing) => (
                  <tr key={ing.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-gray-900">{displayName(ing, "es")}</p>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">
                      {displayCategory(ing, "es")}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{ing.unidad}</td>
                    <td className="px-4 py-3.5 text-right font-semibold text-gray-900">
                      {formatCurrency(ing.precio)}
                      <span className="text-xs font-normal text-gray-400">/{ing.unidad}</span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{ing.proveedor}</td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">
                      {formatUpdatedAt(ing.updatedAt, "es")}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(ing)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          aria-label={t("common.edit")}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteTarget(ing);
                            setModal("confirm");
                          }}
                          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          aria-label={t("common.cancel")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modal === "form"}
        title={
          editing ? t("pages.ingredients.editIngredient") : t("pages.ingredients.newIngredient")
        }
        onClose={() => setModal(null)}
      >
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">
              {t("pages.ingredients.name")} *
            </span>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className={inputClass}
              placeholder="Salmón"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-gray-700">
                {t("pages.ingredients.category")}
              </span>
              <input
                type="text"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                className={inputClass}
                placeholder="Marisco"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-gray-700">
                {t("pages.ingredients.unit")} *
              </span>
              <input
                type="text"
                value={form.unidad}
                onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                className={inputClass}
                placeholder="kg"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-gray-700">
                {t("pages.ingredients.unitPrice")} (€) *
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: e.target.value })}
                className={inputClass}
                placeholder="22.00"
              />
            </label>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">
              {t("pages.ingredients.supplier")}
            </span>
            <input
              type="text"
              value={form.proveedor}
              onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
              className={inputClass}
            />
          </label>

          {formError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setModal(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave}>{t("common.save")}</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={modal === "confirm" && deleteTarget !== null}
        title={t("pages.ingredients.deleteTitle")}
        onClose={() => {
          setModal(null);
          setDeleteTarget(null);
        }}
      >
        <p className="text-sm text-gray-600">
          {t("pages.ingredients.deleteConfirm")}{" "}
          <strong>{deleteTarget && displayName(deleteTarget, "es")}</strong>?
        </p>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={() => {
              setModal(null);
              setDeleteTarget(null);
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="outline"
            onClick={handleDelete}
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            {t("pages.ingredients.delete")}
          </Button>
        </div>
      </Modal>

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-sm text-white shadow-lg sm:bottom-6">
          {toast}
        </div>
      )}
    </PageContent>
  );
}
