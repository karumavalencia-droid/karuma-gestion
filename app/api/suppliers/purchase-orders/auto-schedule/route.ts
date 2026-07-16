import { NextRequest, NextResponse } from "next/server";
import { getLegacySupabaseAdmin } from "@/lib/supabase/legacy-client";

interface ScheduledOrder {
  supplier_id: number;
  product_id: number;
  auto_reorder_quantity: number;
  auto_reorder_threshold: number;
  frequency: "weekly" | "biweekly" | "monthly";
  last_ordered: string;
  enabled: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getLegacySupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: "Supabase no está configurado" }, { status: 503 });
    const searchParams = request.nextUrl.searchParams;
    const supplierId = searchParams.get("supplier_id");

    let query = supabase
      .from("supplier_auto_orders")
      .select("*")
      .eq("enabled", true);

    if (supplierId) {
      query = query.eq("supplier_id", parseInt(supplierId));
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      scheduled_orders: data,
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("Error fetching scheduled orders:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getLegacySupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: "Supabase no está configurado" }, { status: 503 });
    const body = await request.json();
    const {
      supplier_id,
      product_id,
      auto_reorder_quantity,
      auto_reorder_threshold,
      frequency,
    } = body;

    if (
      !supplier_id ||
      !product_id ||
      !auto_reorder_quantity ||
      !auto_reorder_threshold ||
      !frequency
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 },
      );
    }

    // Crear orden automática programada
    const { data, error } = await supabase
      .from("supplier_auto_orders")
      .insert({
        supplier_id,
        product_id,
        auto_reorder_quantity,
        auto_reorder_threshold,
        frequency,
        enabled: true,
        last_ordered: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      scheduled_order: data,
      message: "Orden programada correctamente",
    });
  } catch (error) {
    console.error("Error creating scheduled order:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}

// Función para ejecutar cada hora (llamada por cron job)
export async function PUT(request: NextRequest) {
  try {
    const supabase = getLegacySupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: "Supabase no está configurado" }, { status: 503 });
    // Obtener todas las órdenes programadas
    const { data: scheduledOrders, error: fetchError } = await supabase
      .from("supplier_auto_orders")
      .select("*")
      .eq("enabled", true);

    if (fetchError) throw fetchError;

    const createdOrders = [];
    const now = new Date();

    for (const order of scheduledOrders || []) {
      const lastOrdered = new Date(order.last_ordered);
      let shouldOrder = false;

      // Verificar si es tiempo de reordenar basado en frecuencia
      switch (order.frequency) {
        case "weekly":
          shouldOrder =
            (now.getTime() - lastOrdered.getTime()) / (1000 * 60 * 60 * 24) >= 7;
          break;
        case "biweekly":
          shouldOrder =
            (now.getTime() - lastOrdered.getTime()) / (1000 * 60 * 60 * 24) >= 14;
          break;
        case "monthly":
          shouldOrder =
            (now.getTime() - lastOrdered.getTime()) / (1000 * 60 * 60 * 24) >= 30;
          break;
      }

      if (shouldOrder) {
        // Obtener datos del producto
        const { data: product } = await supabase
          .from("supplier_products")
          .select("*")
          .eq("id", order.product_id)
          .single();

        if (product && product.quantity < order.auto_reorder_threshold) {
          // Crear orden de compra
          const { data: po, error: poError } = await supabase
            .from("purchase_orders")
            .insert({
              supplier_id: order.supplier_id,
              product_id: order.product_id,
              quantity: order.auto_reorder_quantity,
              unit_price: product.unit_price,
              total_price:
                order.auto_reorder_quantity * product.unit_price,
              status: "pending",
              auto_generated: true,
              created_at: now.toISOString(),
            })
            .select()
            .single();

          if (poError) throw poError;

          // Actualizar última orden
          await supabase
            .from("supplier_auto_orders")
            .update({ last_ordered: now.toISOString() })
            .eq("id", order.id);

          createdOrders.push(po);

          // Crear notificación
          await supabase
            .from("user_notifications")
            .insert({
              user_id: "admin",
              supplier_id: order.supplier_id,
              notification_type: "alert",
              title: "📦 Orden automática creada",
              message: `Orden automática de ${order.auto_reorder_quantity} unidades de ${product.product_name}`,
              priority: "normal",
              data: {
                purchase_order_id: po.id,
                product_name: product.product_name,
                quantity: order.auto_reorder_quantity,
              },
            });
        }
      }
    }

    return NextResponse.json({
      success: true,
      created_orders: createdOrders.length,
      orders: createdOrders,
    });
  } catch (error) {
    console.error("Error processing auto orders:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
