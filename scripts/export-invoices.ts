#!/usr/bin/env node
/**
 * 导出所有发票并生成发送给律师楼的列表
 * 用法:
 *   npx ts-node scripts/export-invoices.ts
 *   npx ts-node scripts/export-invoices.ts --download  (下载所有发票)
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BUCKET_NAME = "facturas";

async function listInvoices() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("ERROR: Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  console.log("📋 Listando facturas en Supabase Storage...\n");

  const { data, error } = await supabase.storage.from(BUCKET_NAME).list("", {
    limit: 1000,
    offset: 0,
  });

  if (error) {
    console.error("ERROR:", error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log("No se encontraron facturas.");
    return;
  }

  console.log(`✅ Se encontraron ${data.length} facturas:\n`);

  // Generar lista formateada
  const invoiceList: Array<{ name: string; size: number; created: string }> =
    data.map((file) => ({
      name: file.name,
      size: file.metadata?.size || 0,
      created: file.created_at || "desconocido",
    }));

  // Ordenar por fecha
  invoiceList.sort(
    (a, b) =>
      new Date(b.created).getTime() - new Date(a.created).getTime()
  );

  let totalSize = 0;
  invoiceList.forEach((inv) => {
    const sizeKB = (inv.size / 1024).toFixed(1);
    const date = new Date(inv.created).toLocaleDateString("es-ES");
    console.log(`  • ${inv.name.padEnd(60)} ${sizeKB.padStart(8)} KB  (${date})`);
    totalSize += inv.size;
  });

  console.log(`\n📊 Total: ${invoiceList.length} facturas, ${(totalSize / 1024 / 1024).toFixed(2)} MB\n`);

  // Generar email template
  console.log("📧 Template para enviar a las abogacías:\n");
  console.log("=" + "=".repeat(70));
  console.log(
    `Para Kosushi (agi2grupoasesor@gmail.com) y Spicy (ociedades.yaou@gmail.com):\n`
  );
  console.log("Asunto: Relación de facturas - Karuma Gestión\n");
  console.log("Cuerpo:");
  console.log("-".repeat(70));
  console.log("Estimados,\n");
  console.log("Adjunto encontrará la relación completa de facturas disponibles:\n");
  invoiceList.forEach((inv, i) => {
    const date = new Date(inv.created).toLocaleDateString("es-ES");
    console.log(`${(i + 1).toString().padStart(3)}. ${inv.name.padEnd(55)} (${date})`);
  });
  console.log("\nQuedamos a disposición para cualquier aclaración.\n");
  console.log("Saludos cordiales,");
  console.log("Karuma Gestión");
  console.log("=" + "=".repeat(70));

  // Guardar lista en JSON
  const outputPath = path.join(
    path.dirname(__filename),
    "..",
    "facturas-export.json"
  );
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        exportDate: new Date().toISOString(),
        totalInvoices: invoiceList.length,
        totalSizeBytes: totalSize,
        invoices: invoiceList,
      },
      null,
      2
    )
  );

  console.log(`\n✅ Listado guardado en: ${outputPath}`);
  console.log(
    "\n💡 Siguiente paso: Comparte este archivo con las abogacías o descarga todos los PDFs.\n"
  );
}

// Ejecutar
listInvoices().catch(console.error);
