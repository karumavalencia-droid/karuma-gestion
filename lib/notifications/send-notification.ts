import { getLegacySupabaseAdmin } from "@/lib/supabase/legacy-client";
import { isSupabaseConfigured } from "@/lib/supabase/admin";

const supabase = getLegacySupabaseAdmin()!;

interface NotificationPayload {
  user_id: string;
  supplier_id?: number;
  notification_type: "alert" | "forecast" | "recommendation" | "system";
  title: string;
  message: string;
  priority?: "low" | "normal" | "high" | "urgent";
  data?: Record<string, any>;
}

export async function sendNotification(payload: NotificationPayload) {
  try {
    if (!isSupabaseConfigured()) throw new Error("Supabase no está configurado");
    // Guardar en BD
    const { data: notification, error: saveError } = await supabase
      .from("user_notifications")
      .insert({
        user_id: payload.user_id,
        supplier_id: payload.supplier_id,
        notification_type: payload.notification_type,
        title: payload.title,
        message: payload.message,
        priority: payload.priority || "normal",
        data: payload.data,
      })
      .select()
      .single();

    if (saveError) throw saveError;

    // Obtener preferencias del usuario
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", payload.user_id)
      .single();

    // Enviar por email si está habilitado
    if (prefs?.email_alerts) {
      await sendEmail(payload, prefs);
    }

    // Enviar por Slack si está configurado
    if (prefs?.slack_enabled && prefs?.slack_webhook) {
      await sendSlack(payload, prefs);
    }

    // Log de envío
    await supabase.from("notification_log").insert({
      notification_id: notification?.id,
      channel: "in_app",
      status: "sent",
    });

    return notification;
  } catch (error) {
    console.error("Error enviando notificación:", error);
    throw error;
  }
}

async function sendEmail(payload: NotificationPayload, prefs: any) {
  try {
    // Usar Resend, SendGrid, o similar
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "noreply@karuma.es",
        to: prefs.email,
        subject: `[${payload.priority?.toUpperCase() || "INFO"}] ${payload.title}`,
        html: `
          <h2>${payload.title}</h2>
          <p>${payload.message}</p>
          ${
            payload.data
              ? `<pre>${JSON.stringify(payload.data, null, 2)}</pre>`
              : ""
          }
          <hr>
          <small>Preferencias: <a href="#">Administrar</a></small>
        `,
      }),
    });

    if (!response.ok) {
      throw new Error(`Email failed: ${response.statusText}`);
    }

    // Log de email enviado
    await supabase.from("notification_log").insert({
      channel: "email",
      status: "sent",
    });
  } catch (error) {
    console.error("Error enviando email:", error);
    await supabase.from("notification_log").insert({
      channel: "email",
      status: "failed",
      error_message: String(error),
    });
  }
}

async function sendSlack(payload: NotificationPayload, prefs: any) {
  try {
    const color =
      payload.priority === "urgent"
        ? "ff0000"
        : payload.priority === "high"
          ? "ff9900"
          : "0099ff";

    const response = await fetch(prefs.slack_webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attachments: [
          {
            color,
            title: payload.title,
            text: payload.message,
            fields: payload.data
              ? Object.entries(payload.data).map(([key, value]) => ({
                  title: key,
                  value: String(value),
                  short: true,
                }))
              : [],
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Slack failed: ${response.statusText}`);
    }

    await supabase.from("notification_log").insert({
      channel: "slack",
      status: "sent",
    });
  } catch (error) {
    console.error("Error enviando Slack:", error);
    await supabase.from("notification_log").insert({
      channel: "slack",
      status: "failed",
      error_message: String(error),
    });
  }
}

// Generar recomendación inteligente
export async function generateRecommendation(
  supplier_id: number,
  recommendation_type: string,
  insights: Record<string, any>,
) {
  try {
    if (!isSupabaseConfigured()) throw new Error("Supabase no está configurado");
    // Calcular score de confianza basado en datos
    const confidence =
      insights.data_points && insights.data_points > 6 ? 0.9 : 0.75;

    // Calcular ahorro potencial
    const potential_savings =
      insights.current_cost * (insights.savings_percent / 100);

    const { data, error } = await supabase
      .from("supplier_recommendations")
      .insert({
        supplier_id,
        recommendation_type,
        title: insights.title,
        description: insights.description,
        potential_savings,
        confidence_score: confidence,
        priority: insights.priority || 5,
        action_required: insights.action_required,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
      })
      .select()
      .single();

    if (error) throw error;

    // Notificar al usuario sobre la recomendación
    await sendNotification({
      user_id: "admin", // O el user_id correspondiente
      supplier_id,
      notification_type: "recommendation",
      title: `Recomendación: ${insights.title}`,
      message: insights.description,
      priority: insights.priority > 7 ? "high" : "normal",
      data: {
        potential_savings: potential_savings.toFixed(2),
        confidence: (confidence * 100).toFixed(0) + "%",
      },
    });

    return data;
  } catch (error) {
    console.error("Error generando recomendación:", error);
    throw error;
  }
}
