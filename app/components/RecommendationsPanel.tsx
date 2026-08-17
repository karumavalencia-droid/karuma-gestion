"use client";

import { useEffect, useState } from "react";

interface Recommendation {
  id: number;
  supplier_id: number;
  recommendation_type: string;
  title: string;
  description: string;
  potential_savings: number;
  confidence_score: number;
  priority: number;
  action_required: string;
  is_active: boolean;
  created_at: string;
  expires_at: string;
}

export function RecommendationsPanel({ supplierId }: { supplierId?: number }) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (supplierId) {
      fetchRecommendations();
    }
  }, [supplierId]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/suppliers/recommendations?supplier_id=${supplierId}`,
      );
      const data = await res.json();
      if (data.success) {
        setRecommendations(data.recommendations);
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = async () => {
    try {
      setGenerating(true);
      const res = await fetch(`/api/suppliers/recommendations/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplier_id: supplierId }),
      });

      if (res.ok) {
        await fetchRecommendations();
      }
    } catch (error) {
      console.error("Error generating recommendations:", error);
    } finally {
      setGenerating(false);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      bulk_buy: "📦",
      consolidate: "🤝",
      switch: "🔄",
      negotiate: "💬",
    };
    return icons[type] || "💡";
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return "border-red-500 bg-red-50";
    if (priority >= 6) return "border-orange-500 bg-orange-50";
    return "border-blue-500 bg-blue-50";
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">💡 Recomendaciones Inteligentes</h3>
        <button
          onClick={generateRecommendations}
          disabled={generating}
          className={`px-4 py-2 rounded text-sm font-semibold ${
            generating
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {generating ? "Generando..." : "Generar"}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">
          Cargando recomendaciones...
        </div>
      ) : recommendations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No hay recomendaciones disponibles. Haz clic en &quot;Generar&quot; para crearlas.
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations
            .filter((r) => r.is_active)
            .sort((a, b) => b.priority - a.priority)
            .map((rec) => (
              <div
                key={rec.id}
                className={`border-l-4 p-4 rounded ${getPriorityColor(rec.priority)}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-bold">
                      {getTypeIcon(rec.recommendation_type)} {rec.title}
                    </h4>
                    <p className="text-sm mt-1">{rec.description}</p>
                    <div className="flex gap-4 mt-2 text-xs">
                      <div>
                        <strong>Acción:</strong> {rec.action_required}
                      </div>
                      {rec.potential_savings > 0 && (
                        <div className="text-green-600">
                          <strong>Ahorro potencial:</strong> €
                          {rec.potential_savings.toFixed(0)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-xs mb-2">
                      <strong>Confianza:</strong>{" "}
                      {(rec.confidence_score * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs px-2 py-1 bg-white/70 rounded">
                      Prioridad: {rec.priority}/10
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
