import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendNotification } from "@/lib/notifications/send-notification";

function isHttpUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return isHttpUrl(url) && key ? createClient(url, key) : null;
}

type GeneratedAlert = {
  supplier_product_id: number;
  supplier_id: number;
  alert_type: "low_stock" | "price_change" | "no_purchase_recent";
  threshold_value: number;
  current_value: number;
  alert_message: string;
  is_active: boolean;
};

export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: "Supabase no está configurado" }, { status: 503 });
    const body = await request.json();
    const { supplier_id, check_type } = body;

    if (!supplier_id) {
      return NextResponse.json(
        { error: "supplier_id requerido" },
        { status: 400 },
      );
    }

    const alerts: GeneratedAlert[] = [];

    // Obtener productos
    const { data: products, error: productsError } = await supabase
      .from("supplier_products")
      .select("*")
      .eq("supplier_id", supplier_id);

    if (productsError) throw productsError;

    // Verificar stock bajo (umbral: 50 unidades o 20 kg)
    if (!check_type || check_type === "low_stock") {
      products?.forEach((product) => {
        const threshold = product.unit === "KG" ? 20 : 50;
        if (product.quantity < threshold) {
          alerts.push({
            supplier_product_id: product.id,
            supplier_id,
            alert_type: "low_stock",
            threshold_value: threshold,
            current_value: product.quantity,
            alert_message: `Stock bajo: ${product.product_name} (${product.quantity} ${product.unit} < ${threshold})`,
            is_active: true,
          });
        }
      });
    }

    // Verificar cambios de precio
    if (!check_type || check_type === "price_change") {
      for (const product of products || []) {
        const { data: prices } = await supabase
          .from("supplier_product_prices")
          .select("*")
          .eq("supplier_product_id", product.id)
          .order("effective_date", { ascending: false })
          .limit(2);

        if (prices && prices.length === 2) {
          const priceChange = Math.abs(prices[0].unit_price - prices[1].unit_price);
          const percentChange = (priceChange / prices[1].unit_price) * 100;

          if (percentChange > 5) {
            // Alerta si cambio > 5%
            alerts.push({
              supplier_product_id: product.id,
              supplier_id,
              alert_type: "price_change",
              threshold_value: prices[1].unit_price,
              current_value: prices[0].unit_price,
              alert_message: `Cambio de precio: ${product.product_name} (€${prices[1].unit_price.toFixed(2)} → €${prices[0].unit_price.toFixed(2)}, ${percentChange.toFixed(1)}%)`,
              is_active: true,
            });
          }
        }
      }
    }

    // Verificar sin compras recientes (> 45 días)
    if (!check_type || check_type === "no_purchase_recent") {
      const { data: invoices } = await supabase
        .from("supplier_invoice_items")
        .select("supplier_product_id, invoice_date")
        .eq("supplier_id", supplier_id)
        .order("invoice_date", { ascending: false });

      const now = new Date();
      products?.forEach((product) => {
        const lastPurchase = invoices?.find(
          (inv) => inv.supplier_product_id === product.id,
        );
        if (!lastPurchase) return;

        const daysSincePurchase = Math.floor(
          (now.getTime() - new Date(lastPurchase.invoice_date).getTime()) /
            (1000 * 60 * 60 * 24),
        );

        if (daysSincePurchase > 45) {
          alerts.push({
            supplier_product_id: product.id,
            supplier_id,
            alert_type: "no_purchase_recent",
            threshold_value: 45,
            current_value: daysSincePurchase,
            alert_message: `Sin compras recientes: ${product.product_name} (${daysSincePurchase} días)`,
            is_active: true,
          });
        }
      });
    }

    // Insertar alertas y enviar notificaciones
    if (alerts.length > 0) {
      await supabase.from("supplier_product_alerts").insert(alerts);

      // Enviar notificación para cada alerta
      for (const alert of alerts) {
        const priorityMap = {
          low_stock: "high",
          price_change: "normal",
          no_purchase_recent: "normal",
        } as const;

        await sendNotification({
          user_id: "admin",
          supplier_id,
          notification_type: "alert",
          title: `⚠️ ${alert.alert_type.replace(/_/g, " ").toUpperCase()}`,
          message: alert.alert_message,
          priority: priorityMap[alert.alert_type as keyof typeof priorityMap] || "normal",
          data: {
            alert_type: alert.alert_type,
            current_value: alert.current_value,
            threshold: alert.threshold_value,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      alerts_created: alerts.length,
      alerts,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 },
    );
  }
}
