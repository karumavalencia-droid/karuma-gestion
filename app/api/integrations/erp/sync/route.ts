import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

/**
 * POST /api/integrations/erp/sync
 * @description Sincronizar datos con sistema ERP (SAP, NetSuite, etc)
 * @body { erp_type, supplier_data, product_data }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { erp_type, supplier_data, product_data } = body;

    if (!erp_type) {
      return NextResponse.json(
        { error: "erp_type requerido (sap|netsuite|oracle)" },
        { status: 400 },
      );
    }

    const syncLog: any = {
      erp_type,
      suppliers_synced: 0,
      products_synced: 0,
      errors: [],
      timestamp: new Date().toISOString(),
    };

    // Sincronizar proveedores
    if (supplier_data && Array.isArray(supplier_data)) {
      for (const supplier of supplier_data) {
        try {
          const { error } = await supabase
            .from("suppliers")
            .upsert({
              id: supplier.erp_id,
              supplier_name: supplier.name,
              contact_email: supplier.email,
              contact_phone: supplier.phone,
              updated_at: new Date().toISOString(),
            });

          if (error) throw error;
          syncLog.suppliers_synced++;
        } catch (err) {
          syncLog.errors.push(`Supplier ${supplier.name}: ${String(err)}`);
        }
      }
    }

    // Sincronizar productos
    if (product_data && Array.isArray(product_data)) {
      for (const product of product_data) {
        try {
          const { error } = await supabase
            .from("supplier_products")
            .upsert({
              id: product.erp_id,
              supplier_id: product.supplier_erp_id,
              product_name: product.name,
              unit_price: product.price,
              quantity: product.quantity,
              unit: product.unit || "UNIDAD",
              updated_at: new Date().toISOString(),
            });

          if (error) throw error;
          syncLog.products_synced++;
        } catch (err) {
          syncLog.errors.push(`Product ${product.name}: ${String(err)}`);
        }
      }
    }

    // Guardar log de sincronización
    await supabase.from("integration_logs").insert({
      integration_type: erp_type,
      sync_log: syncLog,
    });

    return NextResponse.json({
      success: syncLog.errors.length === 0,
      syncLog,
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 },
    );
  }
}

/**
 * GET /api/integrations/erp/status
 * @description Obtener estado de sincronizaciones ERP
 */
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from("integration_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      recent_syncs: data,
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 },
    );
  }
}
