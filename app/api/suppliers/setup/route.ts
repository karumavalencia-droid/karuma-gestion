import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

export async function POST() {
  try {
    // Intentar crear las tablas
    console.log("Creando tablas...");

    // Create suppliers table
    const { error: err1 } = await supabase.rpc("query", {
      query: `
        CREATE TABLE IF NOT EXISTS suppliers (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          contact_email TEXT,
          phone TEXT,
          website TEXT,
          notes TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `,
    });

    // Create supplier_products table
    const { error: err2 } = await supabase.rpc("query", {
      query: `
        CREATE TABLE IF NOT EXISTS supplier_products (
          id BIGSERIAL PRIMARY KEY,
          supplier_id INTEGER NOT NULL REFERENCES suppliers (id) ON DELETE CASCADE,
          product_name TEXT NOT NULL,
          quantity NUMERIC(12, 2) NOT NULL,
          unit TEXT NOT NULL,
          rango INTEGER,
          invoice_date DATE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `,
    });

    // Crear índices
    const { error: err3 } = await supabase.rpc("query", {
      query: `
        CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier_id
        ON supplier_products (supplier_id)
      `,
    });

    return NextResponse.json({
      success: true,
      message: "Tablas creadas exitosamente",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error desconocido",
        hint: "Si el error persiste, ejecuta manualmente en Supabase SQL Editor:",
        files: [
          "supabase/migrations/016_proveedores_productos.sql",
          "supabase/migrations/017_jet_extramar_q2_2026.sql",
        ],
      },
      { status: 500 },
    );
  }
}
