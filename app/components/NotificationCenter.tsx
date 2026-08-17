"use client";

import { useEffect, useState } from "react";

interface Notification {
  id: number;
  title: string;
  message: string;
  priority: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  supplier_id?: number;
  data?: Record<string, unknown>;
}

export function NotificationCenter({ userId = "admin" }: { userId?: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Actualizar cada 30s
    return () => clearInterval(interval);
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      const isReadParam =
        filter === "unread" ? "?is_read=false" : "?is_read=false&is_read=true";
      const url =
        filter === "unread"
          ? `/api/suppliers/notifications?user_id=${userId}&is_read=false`
          : `/api/suppliers/notifications?user_id=${userId}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    const previous = notifications;
    setNotifications((current) =>
      current.map((n) => n.id === id ? { ...n, is_read: true } : n),
    );
    try {
      const res = await fetch(`/api/suppliers/notifications/${id}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read: true }),
      });

      if (!res.ok) throw new Error("No se pudo marcar como leída");
    } catch (error) {
      setNotifications(previous);
      console.error("Error marking notification as read:", error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "border-red-500 bg-red-50";
      case "high":
        return "border-orange-500 bg-orange-50";
      case "normal":
        return "border-blue-500 bg-blue-50";
      default:
        return "border-gray-500 bg-gray-50";
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Centro de Notificaciones</h2>
        <div className="flex gap-4">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 rounded ${
              filter === "unread"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Sin leer ({unreadCount})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Cargando notificaciones...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No hay notificaciones
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`border-l-4 p-4 rounded cursor-pointer transition ${getPriorityColor(notification.priority)} ${
                !notification.is_read ? "border-l-4 font-semibold" : "opacity-70"
              }`}
              onClick={() => markAsRead(notification.id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-bold">{notification.title}</h3>
                  <p className="text-sm mt-1">{notification.message}</p>
                  {notification.data && (
                    <div className="text-xs mt-2 bg-white/50 p-2 rounded">
                      {Object.entries(notification.data).map(([key, value]) => (
                        <div key={key}>
                          <strong>{key}:</strong> {String(value)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right ml-4">
                  <span className="text-xs px-2 py-1 bg-white/70 rounded">
                    {notification.priority.toUpperCase()}
                  </span>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
