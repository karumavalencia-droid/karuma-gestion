#!/usr/bin/env node
/**
 * 测试脚本：添加今天的打卡数据
 * 用法: npx tsx scripts/test-attendance-data.ts
 */

import { attendanceBusinessDate } from "@/lib/attendance/time";
import { KIOSK_EMPLOYEES } from "@/lib/kiosk/employees";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

async function main() {
  if (!isSupabaseConfigured()) {
    console.error("❌ Supabase no está configurado. Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = getSupabaseAdmin();
  const businessDate = attendanceBusinessDate();

  console.log(`📅 Añadiendo datos de prueba para: ${businessDate}`);
  console.log(`👥 Empleados disponibles: ${KIOSK_EMPLOYEES.length}`);

  // Crear eventos de prueba para los primeros 3 empleados de cada departamento
  const salaEmployees = KIOSK_EMPLOYEES.filter(e => e.department === "Sala").slice(0, 2);
  const cocinaEmployees = KIOSK_EMPLOYEES.filter(e => e.department === "Cocina").slice(0, 2);

  const events = [];
  const now = new Date();

  // Sala: entrada a las 11:00
  for (const emp of salaEmployees) {
    events.push({
      request_id: `test-${emp.id}-in-${Date.now()}`,
      employee_key: emp.id,
      employee_name: emp.name,
      event_type: "in",
      occurred_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // hace 2 horas
      business_date: businessDate,
      source: "test-script",
      offline: false,
    });
  }

  // Cocina: entrada a las 10:00
  for (const emp of cocinaEmployees) {
    events.push({
      request_id: `test-${emp.id}-in-${Date.now()}`,
      employee_key: emp.id,
      employee_name: emp.name,
      event_type: "in",
      occurred_at: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(), // hace 3 horas
      business_date: businessDate,
      source: "test-script",
      offline: false,
    });
  }

  // Sala: alguien salida a comer
  if (salaEmployees.length > 0) {
    events.push({
      request_id: `test-${salaEmployees[0].id}-out-${Date.now()}`,
      employee_key: salaEmployees[0].id,
      employee_name: salaEmployees[0].name,
      event_type: "out",
      occurred_at: new Date(now.getTime() - 60 * 60 * 1000).toISOString(), // hace 1 hora
      business_date: businessDate,
      source: "test-script",
      offline: false,
    });
  }

  try {
    const { error } = await supabase
      .from("attendance_events")
      .insert(events);

    if (error) {
      console.error("❌ Error al insertar eventos:", error);
      process.exit(1);
    }

    console.log(`✅ Añadidos ${events.length} eventos de prueba`);
    console.log("\n📊 Resumen:");
    console.log(`   Sala: ${salaEmployees.map(e => e.name).join(", ")}`);
    console.log(`   Cocina: ${cocinaEmployees.map(e => e.name).join(", ")}`);
    console.log("\nAhora inicia sesión con PIN 1001 (Carlos - Sala) para ver los compañeros");
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

main();
