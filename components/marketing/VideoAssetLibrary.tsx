"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  ASSET_STATUSES,
  CONTENT_TYPES,
  INITIAL_VIDEO_ASSETS,
  PUBLISH_PLATFORMS,
  countPublishedThisWeek,
  createEmptyAsset,
  totalViews,
  type AssetStatus,
  type VideoAsset,
} from "@/lib/marketing/assets";

function assetStatusVariant(status: AssetStatus) {
  switch (status) {
    case "Buen resultado":
      return "success" as const;
    case "Publicado":
      return "info" as const;
    case "Editado":
      return "purple" as const;
    case "Grabado":
      return "neutral" as const;
    case "Mal resultado":
      return "danger" as const;
    default:
      return "warning" as const;
  }
}

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20";

function AssetFormFields({
  value,
  onChange,
}: {
  value: Omit<VideoAsset, "id">;
  onChange: (next: Omit<VideoAsset, "id">) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="sm:col-span-2">
        <span className="mb-1 block text-xs font-medium text-gray-600">Título del vídeo</span>
        <input
          className={inputClass}
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          placeholder="Ej.: 24.50€ sushi ilimitado"
        />
      </label>
      <label>
        <span className="mb-1 block text-xs font-medium text-gray-600">Fecha de grabación</span>
        <input
          type="date"
          className={inputClass}
          value={value.shootDate}
          onChange={(e) => onChange({ ...value, shootDate: e.target.value })}
        />
      </label>
      <label>
        <span className="mb-1 block text-xs font-medium text-gray-600">Responsable</span>
        <input
          className={inputClass}
          value={value.assignee}
          onChange={(e) => onChange({ ...value, assignee: e.target.value })}
          placeholder="Celeste"
        />
      </label>
      <label>
        <span className="mb-1 block text-xs font-medium text-gray-600">Tipo de contenido</span>
        <select
          className={inputClass}
          value={value.contentType}
          onChange={(e) =>
            onChange({ ...value, contentType: e.target.value as VideoAsset["contentType"] })
          }
        >
          {CONTENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="mb-1 block text-xs font-medium text-gray-600">Estado</span>
        <select
          className={inputClass}
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value as AssetStatus })}
        >
          {ASSET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="mb-1 block text-xs font-medium text-gray-600">Plataforma</span>
        <select
          className={inputClass}
          value={value.platform}
          onChange={(e) =>
            onChange({ ...value, platform: e.target.value as VideoAsset["platform"] })
          }
        >
          {PUBLISH_PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      <label className="sm:col-span-2">
        <span className="mb-1 block text-xs font-medium text-gray-600">Enlace del material</span>
        <input
          className={inputClass}
          value={value.materialLink}
          onChange={(e) => onChange({ ...value, materialLink: e.target.value })}
          placeholder="drive://karuma/raw/..."
        />
      </label>
      <label className="sm:col-span-2">
        <span className="mb-1 block text-xs font-medium text-gray-600">Enlace TikTok</span>
        <input
          className={inputClass}
          value={value.tiktokLink}
          onChange={(e) => onChange({ ...value, tiktokLink: e.target.value })}
          placeholder="https://tiktok.com/..."
        />
      </label>
      <label className="sm:col-span-2">
        <span className="mb-1 block text-xs font-medium text-gray-600">Enlace Instagram</span>
        <input
          className={inputClass}
          value={value.instagramLink}
          onChange={(e) => onChange({ ...value, instagramLink: e.target.value })}
          placeholder="https://instagram.com/reel/..."
        />
      </label>
      <label>
        <span className="mb-1 block text-xs font-medium text-gray-600">Visualizaciones</span>
        <input
          type="number"
          min={0}
          className={inputClass}
          value={value.views}
          onChange={(e) => onChange({ ...value, views: Number(e.target.value) || 0 })}
        />
      </label>
      <label className="sm:col-span-2">
        <span className="mb-1 block text-xs font-medium text-gray-600">Notas</span>
        <textarea
          className={`${inputClass} min-h-[72px] resize-y`}
          value={value.notes}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          placeholder="Notas de grabación, edición..."
        />
      </label>
    </div>
  );
}

function LinkCell({ href, label }: { href: string; label: string }) {
  if (!href) return <span className="text-gray-400">—</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="max-w-[140px] truncate text-karuma-600 hover:underline"
      title={href}
    >
      {label}
    </a>
  );
}

export function VideoAssetLibrary() {
  const [assets, setAssets] = useState<VideoAsset[]>(INITIAL_VIDEO_ASSETS);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(createEmptyAsset);

  const weekPublished = useMemo(() => countPublishedThisWeek(assets), [assets]);
  const viewsTotal = useMemo(() => totalViews(assets), [assets]);

  const updateAsset = (id: string, patch: Partial<VideoAsset>) => {
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const openAdd = () => {
    setForm(createEmptyAsset());
    setModalOpen(true);
  };

  const submitAdd = () => {
    if (!form.title.trim()) return;
    const id = `va-${Date.now()}`;
    setAssets((prev) => [{ ...form, id, title: form.title.trim() }, ...prev]);
    setModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-4">
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs text-gray-500">Publicados esta semana</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-karuma-600">{weekPublished}</p>
            <p className="text-xs text-gray-400">piezas publicadas o evaluadas</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs text-gray-500">Visualizaciones totales</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
              {viewsTotal.toLocaleString("es-ES")}
            </p>
            <p className="text-xs text-gray-400">suma de todos los materiales</p>
          </div>
        </div>
        <Button type="button" onClick={openAdd} className="w-full sm:w-auto">
          Añadir material de vídeo
        </Button>
      </div>

      {/* Móvil: tarjetas */}
      <div className="space-y-3 lg:hidden">
        {assets.map((asset) => (
          <article
            key={asset.id}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900">{asset.title}</h3>
              <StatusBadge variant={assetStatusVariant(asset.status)}>{asset.status}</StatusBadge>
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Fecha de grabación</dt>
                <dd className="font-medium">{asset.shootDate}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Responsable</dt>
                <dd>{asset.assignee || "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Tipo de contenido</dt>
                <dd>{asset.contentType}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Plataforma</dt>
                <dd>{asset.platform}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Visualizaciones</dt>
                <dd className="font-mono font-semibold">{asset.views.toLocaleString("es-ES")}</dd>
              </div>
              {asset.materialLink ? (
                <div>
                  <dt className="text-gray-500">Material</dt>
                  <dd className="mt-0.5 truncate text-karuma-600">{asset.materialLink}</dd>
                </div>
              ) : null}
              {asset.notes ? (
                <div>
                  <dt className="text-gray-500">Notas</dt>
                  <dd className="mt-0.5 text-gray-600">{asset.notes}</dd>
                </div>
              ) : null}
            </dl>
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-gray-500">Editar estado</label>
              <select
                className={inputClass}
                value={asset.status}
                onChange={(e) =>
                  updateAsset(asset.id, { status: e.target.value as AssetStatus })
                }
              >
                {ASSET_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="success"
                onClick={() => updateAsset(asset.id, { status: "Buen resultado" })}
              >
                Buen resultado
              </Button>
              <Button
                type="button"
                size="sm"
                variant="warning"
                onClick={() => updateAsset(asset.id, { status: "Mal resultado" })}
              >
                Mal resultado
              </Button>
            </div>
          </article>
        ))}
      </div>

      {/* Escritorio: tabla */}
      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm lg:block">
        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-3">Título</th>
              <th className="px-3 py-3">Grabación</th>
              <th className="px-3 py-3">Responsable</th>
              <th className="px-3 py-3">Tipo</th>
              <th className="px-3 py-3">Material</th>
              <th className="px-3 py-3">Estado</th>
              <th className="px-3 py-3">Plataforma</th>
              <th className="px-3 py-3">TikTok</th>
              <th className="px-3 py-3">Instagram</th>
              <th className="px-3 py-3">Views</th>
              <th className="px-3 py-3">Notas</th>
              <th className="px-3 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {assets.map((asset) => (
              <tr key={asset.id} className="hover:bg-gray-50/80">
                <td className="max-w-[180px] px-3 py-3 font-medium text-gray-900">
                  {asset.title}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-gray-700">{asset.shootDate}</td>
                <td className="px-3 py-3 text-gray-700">{asset.assignee || "—"}</td>
                <td className="whitespace-nowrap px-3 py-3 text-gray-700">{asset.contentType}</td>
                <td className="max-w-[120px] px-3 py-3">
                  <LinkCell href={asset.materialLink} label="Material" />
                </td>
                <td className="px-3 py-3">
                  <select
                    className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs"
                    value={asset.status}
                    onChange={(e) =>
                      updateAsset(asset.id, { status: e.target.value as AssetStatus })
                    }
                  >
                    {ASSET_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-gray-700">{asset.platform}</td>
                <td className="px-3 py-3">
                  <LinkCell href={asset.tiktokLink} label="Abrir" />
                </td>
                <td className="px-3 py-3">
                  <LinkCell href={asset.instagramLink} label="Abrir" />
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-mono text-gray-900">
                  {asset.views.toLocaleString("es-ES")}
                </td>
                <td className="max-w-[140px] truncate px-3 py-3 text-gray-600" title={asset.notes}>
                  {asset.notes || "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => updateAsset(asset.id, { status: "Buen resultado" })}
                      className="rounded px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                    >
                      Bueno
                    </button>
                    <button
                      type="button"
                      onClick={() => updateAsset(asset.id, { status: "Mal resultado" })}
                      className="rounded px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                    >
                      Malo
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/60 p-0 sm:items-center sm:p-4">
          <div className="max-h-[90dvh] w-full overflow-y-auto rounded-t-xl border border-gray-200 bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-xl">
            <h3 className="text-lg font-bold text-gray-900">Añadir material de vídeo</h3>
            <p className="mt-1 text-sm text-gray-500">Solo registra enlaces y metadatos; no sube archivos de vídeo.</p>
            <div className="mt-4">
              <AssetFormFields value={form} onChange={setForm} />
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={submitAdd} disabled={!form.title.trim()}>
                Guardar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
