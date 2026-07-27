import { NextRequest, NextResponse } from "next/server";
import { getLegacySupabaseAdmin } from "@/lib/supabase/legacy-client";
import { generateRecommendation } from "@/lib/notifications/send-notification";

export async function POST(request: NextRequest) {
  try {
    const supabase = getLegacySupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: "Supabase no está configurado" }, { status: 503 });
    const body = await request.json();
    const { supplier_id } = body;

    if (!supplier_id) {
      return NextResponse.json(
        { success: false, error: "supplier_id requerido" },
        { status: 400 },
      );
    }

    // Obtener datos del proveedor
    const { data: supplier } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", supplier_id)
      .single();

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: "Proveedor no encontrado" },
        { status: 404 },
      );
    }

    // Obtener gastos del último año
    const { data: spending } = await supabase
      .from("supplier_spending_summary")
      .select("*")
      .eq("supplier_id", supplier_id)
      .order("year_month", { ascending: false })
      .limit(12);

    // Obtener todos los proveedores para benchmarking
    const { data: allSuppliers } = await supabase
      .from("suppliers")
      .select("id, supplier_name");

    const { data: allSpending } = await supabase
      .from("supplier_spending_summary")
      .select("*")
      .in(
        "supplier_id",
        allSuppliers?.map((s) => s.id) || [],
      )
      .order("year_month", { ascending: false })
      .limit(120);

    const recommendations = [];

    // 1. Recomendación: Volumen de compra
    if (spending && spending.length >= 6) {
      const avgSpending =
        spending.slice(0, 6).reduce((sum, s) => sum + s.total_cost, 0) / 6;
      const avgQuantity =
        spending.slice(0, 6).reduce((sum, s) => sum + s.total_quantity, 0) / 6;

      if (avgSpending > 5000) {
        // Si gasto > €5000/mes
        const savingsPotential = avgSpending * 0.1; // 10% de ahorro potencial

        await generateRecommendation(supplier_id, "bulk_buy", {
          title: "Negociar descuento por volumen",
          description: `Con un gasto promedio de €${avgSpending.toFixed(0)}/mes (${avgQuantity.toFixed(0)} unidades), podrías negociar un descuento del 5-10% por volumen.`,
          current_cost: avgSpending,
          savings_percent: 10,
          data_points: 6,
          action_required: "Contactar al proveedor",
          priority: 8,
        });

        recommendations.push({
          type: "bulk_buy",
          title: "Negociar descuento por volumen",
          potential_savings: savingsPotential,
        });
      }
    }

    // 2. Recomendación: Consolidación de proveedores
    const supplierCount = allSuppliers?.length || 0;
    if (supplierCount > 3) {
      const totalCost = allSpending
        ?.reduce((sum, s) => sum + s.total_cost, 0) || 0;
      const supplierCost = spending?.reduce((sum, s) => sum + s.total_cost, 0) || 0;
      const marketShare = (supplierCost / totalCost) * 100;

      if (marketShare < 30 && supplierCount > 5) {
        await generateRecommendation(supplier_id, "consolidate", {
          title: "Consolidar con proveedores mayores",
          description: `Actualmente este proveedor representa solo ${marketShare.toFixed(0)}% del gasto. Considera consolidar con proveedores más grandes para mejor negociación.`,
          current_cost: supplierCost,
          savings_percent: 5,
          data_points: 12,
          action_required: "Revisar estrategia de abastecimiento",
          priority: 6,
        });

        recommendations.push({
          type: "consolidate",
          title: "Consolidar con proveedores mayores",
          potential_savings: supplierCost * 0.05,
        });
      }
    }

    // 3. Recomendación: Cambiar proveedor
    if (allSpending && allSuppliers) {
      const supplierAvgCost =
        spending?.reduce((sum, s) => sum + s.total_cost, 0) || 0 /
        (spending?.length || 1);

      const otherSuppliers = allSuppliers.filter((s) => s.id !== supplier_id);
      const cheapestSupplier = otherSuppliers?.[0];

      if (cheapestSupplier) {
        const cheapestAvgCost =
          allSpending
            ?.filter((s) => s.supplier_id === cheapestSupplier.id)
            .slice(0, 6)
            .reduce((sum, s) => sum + s.total_cost, 0) || 0 /
          Math.min(6, allSpending?.length || 1);

        const priceDiff = ((supplierAvgCost - cheapestAvgCost) / supplierAvgCost) * 100;

        if (priceDiff > 15) {
          // Si 15% más caro
          const savingsPotential =
            (supplierAvgCost - cheapestAvgCost) * 12; // Proyección anual

          await generateRecommendation(supplier_id, "switch", {
            title: `Considerar ${cheapestSupplier.supplier_name}`,
            description: `Este proveedor es ${priceDiff.toFixed(0)}% más caro que ${cheapestSupplier.supplier_name}. Podrías ahorrar €${savingsPotential.toFixed(0)}/año.`,
            current_cost: supplierAvgCost * 12,
            savings_percent: priceDiff,
            data_points: 6,
            action_required: "Solicitar cotización alternativa",
            priority: 9,
          });

          recommendations.push({
            type: "switch",
            title: `Considerar ${cheapestSupplier.supplier_name}`,
            potential_savings: savingsPotential,
          });
        }
      }
    }

    // 4. Recomendación: Negociar precio
    if (spending && spending.length >= 3) {
      const recentAvg =
        spending
          .slice(0, 3)
          .reduce((sum, s) => sum + s.avg_unit_cost, 0) / 3;
      const oldAvg =
        spending
          .slice(3, 6)
          .reduce((sum, s) => sum + s.avg_unit_cost, 0) / 3;

      const priceIncrease = ((recentAvg - oldAvg) / oldAvg) * 100;

      if (priceIncrease > 8) {
        // Si precio subió > 8%
        await generateRecommendation(supplier_id, "negotiate", {
          title: "Precios al alza - Renegociar contrato",
          description: `El precio ha subido ${priceIncrease.toFixed(1)}% en los últimos 3 meses. Es momento de renegociar el contrato con el proveedor.`,
          current_cost: recentAvg * 300, // Estimado mensual
          savings_percent: 5,
          data_points: 6,
          action_required: "Iniciar negociación de precios",
          priority: 7,
        });

        recommendations.push({
          type: "negotiate",
          title: "Precios al alza - Renegociar contrato",
          potential_savings: (recentAvg - oldAvg) * 300,
        });
      }
    }

    return NextResponse.json({
      success: true,
      supplier_id,
      recommendations_generated: recommendations.length,
      recommendations,
    });
  } catch (error) {
    console.error("Error generando recomendaciones:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
