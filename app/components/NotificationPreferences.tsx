"use client";

import { useEffect, useState } from "react";

interface Preferences {
  id?: number;
  user_id: string;
  email_alerts: boolean;
  email_forecast: boolean;
  email_daily_digest: boolean;
  slack_enabled: boolean;
  slack_webhook?: string;
  phone_alerts: boolean;
  phone_number?: string;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

export function NotificationPreferences({ userId = "admin" }: { userId?: string }) {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, [userId]);

  const fetchPreferences = async () => {
    try {
      const res = await fetch(
        `/api/suppliers/notifications/preferences?user_id=${userId}`,
      );
      const data = await res.json();
      if (data.success) {
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    if (preferences) {
      setPreferences({
        ...preferences,
        [field]: value,
      });
      setEditing(true);
      setSaved(false);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/suppliers/notifications/preferences`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      if (res.ok) {
        setSaved(true);
        setEditing(false);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
    }
  };

  if (loading) return <div>Cargando preferencias...</div>;
  if (!preferences) return <div>No se pudieron cargar las preferencias</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Preferencias de Notificaciones</h2>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Email Alerts */}
        <div className="border-b pb-6">
          <h3 className="font-semibold mb-3 flex items-center">
            <input
              type="checkbox"
              checked={preferences.email_alerts}
              onChange={(e) => handleChange("email_alerts", e.target.checked)}
              className="mr-3"
            />
            Alertas por Email
          </h3>
          <p className="text-sm text-gray-600 ml-6">
            Recibe notificaciones urgentes por email
          </p>
        </div>

        {/* Email Forecast */}
        <div className="border-b pb-6">
          <h3 className="font-semibold mb-3 flex items-center">
            <input
              type="checkbox"
              checked={preferences.email_forecast}
              onChange={(e) => handleChange("email_forecast", e.target.checked)}
              className="mr-3"
            />
            Pronóstico Semanal
          </h3>
          <p className="text-sm text-gray-600 ml-6">
            Recibe pronóstico de gastos cada lunes
          </p>
        </div>

        {/* Email Daily Digest */}
        <div className="border-b pb-6">
          <h3 className="font-semibold mb-3 flex items-center">
            <input
              type="checkbox"
              checked={preferences.email_daily_digest}
              onChange={(e) =>
                handleChange("email_daily_digest", e.target.checked)
              }
              className="mr-3"
            />
            Resumen Diario
          </h3>
          <p className="text-sm text-gray-600 ml-6">
            Resumen de actividad al final del día
          </p>
        </div>

        {/* Slack */}
        <div className="border-b pb-6">
          <h3 className="font-semibold mb-3 flex items-center">
            <input
              type="checkbox"
              checked={preferences.slack_enabled}
              onChange={(e) => handleChange("slack_enabled", e.target.checked)}
              className="mr-3"
            />
            Notificaciones Slack
          </h3>
          {preferences.slack_enabled && (
            <div className="ml-6 space-y-3">
              <input
                type="text"
                placeholder="Webhook URL de Slack"
                value={preferences.slack_webhook || ""}
                onChange={(e) => handleChange("slack_webhook", e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
              <p className="text-xs text-gray-500">
                Obtén tu webhook en: https://api.slack.com/messaging/webhooks
              </p>
            </div>
          )}
        </div>

        {/* Phone Alerts */}
        <div className="border-b pb-6">
          <h3 className="font-semibold mb-3 flex items-center">
            <input
              type="checkbox"
              checked={preferences.phone_alerts}
              onChange={(e) => handleChange("phone_alerts", e.target.checked)}
              className="mr-3"
            />
            Alertas SMS
          </h3>
          {preferences.phone_alerts && (
            <input
              type="tel"
              placeholder="+34 600 000 000"
              value={preferences.phone_number || ""}
              onChange={(e) => handleChange("phone_number", e.target.value)}
              className="ml-6 px-3 py-2 border rounded w-full"
            />
          )}
        </div>

        {/* Quiet Hours */}
        <div className="pb-6">
          <h3 className="font-semibold mb-3">Horario de Silencio</h3>
          <div className="ml-6 flex gap-4">
            <div>
              <label className="text-sm text-gray-600">Desde</label>
              <input
                type="time"
                value={preferences.quiet_hours_start || "22:00"}
                onChange={(e) =>
                  handleChange("quiet_hours_start", e.target.value)
                }
                className="px-3 py-2 border rounded w-32"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Hasta</label>
              <input
                type="time"
                value={preferences.quiet_hours_end || "08:00"}
                onChange={(e) => handleChange("quiet_hours_end", e.target.value)}
                className="px-3 py-2 border rounded w-32"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 ml-6 mt-2">
            No se enviarán notificaciones durante este período
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={!editing}
            className={`px-6 py-2 rounded font-semibold ${
              editing
                ? "bg-blue-600 text-white cursor-pointer hover:bg-blue-700"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            {saved ? "✓ Guardado" : "Guardar"}
          </button>
          {editing && (
            <button
              onClick={() => {
                fetchPreferences();
                setEditing(false);
              }}
              className="px-6 py-2 rounded font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
