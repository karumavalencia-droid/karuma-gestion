#!/usr/bin/env node

/**
 * Script para insertar productos Jet Extramar en Supabase
 * Uso: node scripts/upload-jet-extramar.js
 */

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "❌ Error: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY no configuradas"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const productos = [
  {
    rango: 1,
    product_name: "GYOZAS DE CERDO 5X600GRS X30UDS",
    quantity: 360.0,
    unit: "UD",
  },
  {
    rango: 2,
    product_name: "PICANTONES 300/450 1X10 UDS",
    quantity: 40.0,
    unit: "UD",
  },
  {
    rango: 3,
    product_name: "COSTILLAS DE MAIZ (RIBS) 4BOX2.5KG",
    quantity: 40.0,
    unit: "KG",
  },
  {
    rango: 4,
    product_name: "COSTILLA CARNUDA DE CERDO P.V",
    quantity: 131.24,
    unit: "KG",
  },
  {
    rango: 5,
    product_name: "COLA LANGOSTINO CRUDA S/P SIVENA 10/30 10X1",
    quantity: 65.0,
    unit: "KG",
  },
  {
    rango: 6,
    product_name: "SECRETO DE CERDO IBERICO P.V",
    quantity: 63.78,
    unit: "KG",
  },
  {
    rango: 7,
    product_name: "ALMEJA VIETNAM 60/80 6X1",
    quantity: 63.0,
    unit: "KG",
  },
  {
    rango: 8,
    product_name: "CHURRASCO DE TERNERA 1X4",
    quantity: 52.0,
    unit: "KG",
  },
  {
    rango: 9,
    product_name: "LOMO BAJO DE VACA MADURADO 6/7 ENTRECOT P.V",
    quantity: 60.03,
    unit: "KG",
  },
  {
    rango: 10,
    product_name: "VIEIRA MEDIA CONCHA 20/30 10X1",
    quantity: 44.0,
    unit: "KG",
  },
  {
    rango: 11,
    product_name: "PATATA 3/8 CATERFRITS 4BOX2.5KG",
    quantity: 70.0,
    unit: "KG",
  },
  {
    rango: 12,
    product_name: "PATATA JULIENNE EUROFRITS 4BOX2.5KG",
    quantity: 30.0,
    unit: "KG",
  },
  {
    rango: 13,
    product_name: "PATATA CASERA COUNTRY HOUSE 4BOX2.5KG",
    quantity: 30.0,
    unit: "KG",
  },
  {
    rango: 14,
    product_name: "CREMA QUESO SNEL 1 BOTEX2KG",
    quantity: 37.0,
    unit: "BT",
  },
  {
    rango: 15,
    product_name: "SEPIA LIMPIA INDIA 8/12 TOP 10% 1X6",
    quantity: 36.0,
    unit: "KG",
  },
  {
    rango: 16,
    product_name: "MCCAIN PATATA JULIENNE 5BOX2.5KG",
    quantity: 12.5,
    unit: "KG",
  },
  {
    rango: 17,
    product_name: "ALAS DE POLLO MITADES 1X5",
    quantity: 35.0,
    unit: "KG",
  },
  {
    rango: 18,
    product_name: "LONGANIZA CRIOLLA P.V",
    quantity: 20.0,
    unit: "KG",
  },
  {
    rango: 19,
    product_name: "MEZCLUM 4 VARIEDADES 1BX1KG",
    quantity: 22.0,
    unit: "KG",
  },
  {
    rango: 20,
    product_name: "PATATA 3/8 SUPER CRUNCH AVIKO 4BOX2.5KG",
    quantity: 10.0,
    unit: "KG",
  },
  {
    rango: 21,
    product_name: "TARTA PUMPKIN (CALABAZA) 18 RAC",
    quantity: 18.0,
    unit: "RA",
  },
  {
    rango: 22,
    product_name: "TARTA DE ZANAHORIA 18 RACIONES",
    quantity: 18.0,
    unit: "RA",
  },
  {
    rango: 23,
    product_name: "FONDANT DE CHOCOLATE TRAITEUR 20UX100GR",
    quantity: 20.0,
    unit: "UD",
  },
  {
    rango: 24,
    product_name: "MUERTE POR CHOCOLATE 16 RACIONES X 125 GRS",
    quantity: 16.0,
    unit: "RA",
  },
  {
    rango: 25,
    product_name: "CARRILLADA DE CERDO SIN HUESO 1X5",
    quantity: 10.0,
    unit: "KG",
  },
  {
    rango: 26,
    product_name: "CROQUETA DE TORREZNO 3BOX1KG",
    quantity: 9.0,
    unit: "KG",
  },
  {
    rango: 27,
    product_name: "RODAJA PIÑA EN SU JUGO 6X1750ESC",
    quantity: 8.0,
    unit: "BT",
  },
  {
    rango: 28,
    product_name: "MAYONESA PROFESIONAL CHOVI 4X3600ML",
    quantity: 4.0,
    unit: "BT",
  },
  {
    rango: 29,
    product_name: "CONTRA MUSLO POLLO S/P S/H 1X5",
    quantity: 10.0,
    unit: "KG",
  },
  {
    rango: 30,
    product_name: "CROQUETA DE GAMBAS AL AJILLO 3BOX1KG",
    quantity: 3.0,
    unit: "KG",
  },
];

async function upload() {
  console.log("🚀 Iniciando carga de productos Jet Extramar...\n");

  try {
    // Primero, asegurarse que el proveedor existe
    const { data: supplier, error: supplierError } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", 7331)
      .single();

    if (supplierError && supplierError.code !== "PGRST116") {
      throw new Error(`Error al verificar proveedor: ${supplierError.message}`);
    }

    if (!supplier) {
      console.log("  ℹ️  Creando proveedor Jet Extramar...");
      const { error: insertError } = await supabase
        .from("suppliers")
        .insert({
          id: 7331,
          name: "Jet Extramar",
          contact_email: "info@jetextramar.es",
          phone: "+34 96 166 74 06",
          website: "https://www.jetextramar.es",
          notes: "Proveedor de productos frescos",
        });

      if (insertError) {
        throw new Error(
          `Error al crear proveedor: ${insertError.message}`
        );
      }
      console.log("  ✓ Proveedor creado\n");
    } else {
      console.log("  ✓ Proveedor ya existe\n");
    }

    // Insertar productos
    console.log(`  📦 Insertando ${productos.length} productos...`);

    const { data, error } = await supabase
      .from("supplier_products")
      .insert(
        productos.map((p) => ({
          supplier_id: 7331,
          product_name: p.product_name,
          quantity: p.quantity,
          unit: p.unit,
          rango: p.rango,
          invoice_date: "2026-06-29",
        }))
      );

    if (error) {
      throw new Error(`Error al insertar productos: ${error.message}`);
    }

    console.log(`  ✓ Se insertaron ${productos.length} productos\n`);

    // Mostrar resumen
    const { data: allProducts } = await supabase
      .from("supplier_products")
      .select("*")
      .eq("supplier_id", 7331);

    if (allProducts) {
      const totalQuantity = allProducts.reduce(
        (sum, p) => sum + parseFloat(p.quantity),
        0
      );
      console.log("📊 Resumen:");
      console.log(`  Total de productos: ${allProducts.length}`);
      console.log(`  Total de cantidad: ${totalQuantity.toFixed(2)} unidades`);
    }

    console.log("\n✅ ¡Carga completada exitosamente!");
  } catch (error) {
    console.error(
      "\n❌ Error:",
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

upload();
