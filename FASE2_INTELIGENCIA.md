# 🚀 Fase 2: Inteligencia & Automatización

**Commit:** `e9586e4` (Integración de facturas, alertas automáticas, pronóstico)

---

## 🎯 Funcionalidades Añadidas

### 1. Integración con Facturas

**Endpoint:** `POST /api/suppliers/invoices/sync`

Sincronizar facturas con el sistema automáticamente:

```bash
curl -X POST http://localhost:3000/api/suppliers/invoices/sync \
  -H "Content-Type: application/json" \
  -d '{
    "supplier_id": 7331,
    "invoices": [
      {
        "id": "INV-001",
        "date": "2026-07-01",
        "items": [
          {
            "product_name": "GYOZAS DE CERDO",
            "quantity": 100,
            "unit_price": 2.50,
            "total_price": 250
          }
        ]
      }
    ]
  }'
```

**Automaticamente:**
- ✅ Inserta items de factura
- ✅ Actualiza resumen de gastos mensuales
- ✅ Calcula costo total por período

**Obtener facturas sincronizadas:**
```bash
GET /api/suppliers/invoices/sync?supplier_id=7331
```

---

### 2. Alertas Automáticas Inteligentes

**Endpoint:** `POST /api/suppliers/alerts/check`

Sistema que verifica automáticamente tres tipos de alertas:

#### 2.1 Stock Bajo
```
⚠️ Umbral: 
  - 20 kg para productos por peso
  - 50 unidades para productos por unidad
```

**Ejemplo:**
```
Alerta: Stock bajo - GYOZAS (15 UD < 50) 
Acción: Hacer pedido urgente
```

#### 2.2 Cambio de Precio
```
⚠️ Umbral: cambio > 5% respecto al mes anterior
```

**Ejemplo:**
```
Alerta: Cambio de precio - COSTILLA (€20.00 → €21.05, 5.3%)
Acción: Revisar contrato de precio
```

#### 2.3 Sin Compras Recientes
```
⚠️ Umbral: > 45 días sin compra
```

**Ejemplo:**
```
Alerta: Sin compras - ALMEJA (52 días)
Acción: Verificar si aún se necesita
```

**Generar alertas:**
```bash
curl -X POST http://localhost:3000/api/suppliers/alerts/check \
  -H "Content-Type: application/json" \
  -d '{
    "supplier_id": 7331,
    "check_type": "low_stock"  # o "price_change" o "no_purchase_recent"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "alerts_created": 3,
  "alerts": [
    {
      "product_id": 123,
      "alert_type": "low_stock",
      "message": "Stock bajo: GYOZAS (15 < 50)",
      "severity": "high"
    }
  ]
}
```

---

### 3. Pronóstico Inteligente de Gastos

**Endpoint:** `GET /api/suppliers/forecast?supplier_id=7331&months=3`

Predicción automática usando:
- ✅ Promedio móvil de últimos 3 meses
- ✅ Análisis de tendencias
- ✅ Proyección a 3-12 meses
- ✅ Confianza calculada (75% con datos limitados)

**Ejemplo de respuesta:**

```json
{
  "success": true,
  "historical_months": 6,
  "metrics": {
    "avg_monthly_quantity": 150.5,
    "avg_monthly_cost": 2850.00,
    "quantity_trend": 1.05,    // 5% al alza
    "cost_trend": 1.08         // 8% al alza
  },
  "forecast": [
    {
      "year_month": "2026-08",
      "forecast_quantity": 158,
      "forecast_cost": 3078,
      "cost_per_unit": 19.48,
      "confidence": 0.75
    },
    {
      "year_month": "2026-09",
      "forecast_quantity": 159,
      "forecast_cost": 3125,
      "cost_per_unit": 19.65,
      "confidence": 0.75
    }
  ]
}
```

**Interpretación:**
```
📈 Tendencia: Costos en alza (+8% mes a mes)
📊 Proyección: €3,078 esperados en agosto
⚠️ Confianza: 75% (necesita 6-12 meses histórico para > 90%)
```

---

### 4. Benchmarking de Proveedores

**Componente:** `SupplierBenchmark`

Comparación automática entre proveedores:

```
┌────────────────────────────────────┐
│ Promedio: €2,850/mes               │
│ Más económico: €2,100              │
│ Más caro: €4,500                   │
└────────────────────────────────────┘

Jet Extramar:  €2,850  ▓▓▓▓▓░░░ 100%
  30 productos | 150 kg/mes
  Vs promedio: +0% (AL PROMEDIO)

Komei Distributor: €2,100  ▓▓▓░░░░░ 74%
  15 productos | 100 kg/mes
  Vs promedio: -26% (MÁS ECONÓMICO ✓)

Spicy Foods: €4,500  ▓▓▓▓▓▓▓░ 158%
  25 productos | 200 kg/mes
  Vs promedio: +58% (MÁS CARO ⚠️)
```

**Insight automático:**
```
💡 El proveedor más económico es Komei Distributor (€2,100/mes).
   Ahorro potencial: €750/mes vs promedio actual.
```

---

## 📊 Dashboard Mejorado

**URL:** `/admin/suppliers/analytics`

Tres secciones integradas:

### Sección 1: Resumen de Gastos
- Histórico de 12 últimos meses
- Total cantidad y costo
- Costo promedio por unidad
- Análisis por período

### Sección 2: Pronóstico
- Proyección a 3-12 meses
- Métricas: promedio, tendencia
- Tabla interactiva con confianza
- Gráfico de tendencias

### Sección 3: Benchmarking
- Comparación entre todos los proveedores
- Ranking por costo promedio
- Desviación vs promedio
- Insights automáticos

---

## 🔄 Flujo de Integración Automática

```
Factura PDF recibida
        ↓
OCR / Manual entry
        ↓
POST /api/suppliers/invoices/sync
        ↓
    Inserta items ✓
    Actualiza resumen de gastos ✓
        ↓
POST /api/suppliers/alerts/check
        ↓
    Verifica stock bajo ✓
    Verifica cambio de precio ✓
    Verifica sin compras ✓
        ↓
    Alertas creadas
        ↓
GET /api/suppliers/forecast
        ↓
    Pronóstico generado ✓
        ↓
Dashboard actualizado ✓
```

---

## 💼 Casos de Uso

### Caso 1: Planificación de Compras
```
1. Ir a /admin/suppliers/analytics
2. Ver pronóstico de 3 meses
3. Notar alza de 8% en costos
4. Hacer pedido preventivo antes del aumento
5. Ahorrar 5-10% negociando a mayor volumen
```

### Caso 2: Negociación de Precios
```
1. Ver benchmarking: Kosushi paga 26% más que Komei
2. Usar datos para negociar con Jet Extramar
3. Target: -10% ($285/mes de ahorro)
4. Documento de apoyo: comparativa de mercado
```

### Caso 3: Gestión de Stock
```
1. Sistema detecta: GYOZAS stock bajo (15 < 50)
2. Alerta automática creada
3. Notificación a gerente
4. Gerente hace compra urgente
5. Stock se repone en 24h
```

### Caso 4: Análisis de Tendencias
```
1. Notar que COSTILLA subió 5.3% en precio
2. Investigar por qué (temporada, inflación, etc)
3. Cambiar a proveedor alternativo o negociar
4. Documentar decisión en sistema
```

---

## 🎓 Modelos Matemáticos

### Pronóstico (Promedio Móvil + Tendencia)

```
avg_recent = (mes-1 + mes-2 + mes-3) / 3
avg_historical = sum(últimos 12 meses) / 12
trend = avg_recent / avg_historical

forecast_next_month = avg_recent * trend
```

**Confianza:**
```
- 3 meses histórico: 60%
- 6 meses histórico: 75%
- 12 meses histórico: 90%
```

### Benchmarking

```
desviación_proveedore = (costo_proveedor - promedio) / promedio * 100

si desviación < 0: "Más económico"
si desviación ≈ 0: "Al promedio"
si desviación > 0: "Más caro"
```

---

## 📈 Métricas Disponibles

| Métrica | Fórmula | Uso |
|---------|---------|-----|
| Costo/Unidad | Total Cost / Total Qty | Eficiencia de compra |
| Tendencia | Actual / Histórico | Predicción |
| Desviación | (Actual - Promedio) / Promedio | Benchmarking |
| Confianza | Basado en meses histórico | Precisión de pronóstico |

---

## 🔌 Ejemplos de API

### Sincronizar factura completa
```bash
POST /api/suppliers/invoices/sync
{
  "supplier_id": 7331,
  "invoices": [
    {
      "id": "INV-JET-2026-07-001",
      "date": "2026-07-05",
      "items": [
        {"product_name": "GYOZAS", "quantity": 100, "unit_price": 2.50, "total_price": 250},
        {"product_name": "COSTILLA", "quantity": 150, "unit_price": 20.00, "total_price": 3000}
      ]
    }
  ]
}
```

### Generar alertas automáticas
```bash
POST /api/suppliers/alerts/check
{
  "supplier_id": 7331
}
# Verifica todos los tipos de alertas
```

### Obtener pronóstico a 6 meses
```bash
GET /api/suppliers/forecast?supplier_id=7331&months=6
```

---

## 🎯 Próximos Pasos (Fase 3)

- [ ] Alertas por email/Slack automáticas
- [ ] Dashboard exportable a PDF
- [ ] Comparación histórica (mes a mes)
- [ ] Scoring de eficiencia de proveedor
- [ ] Integración con sistema de órdenes de compra
- [ ] API para terceros (ERP, contabilidad)

---

## 📊 Impacto Esperado

| Métrica | Antes | Después | Beneficio |
|---------|-------|---------|-----------|
| Tiempo análisis | 4h/mes | 5min | -99% ⏱️ |
| Stock outs | 2-3/mes | ~0 | 100% disponibilidad |
| Negociaciones | Basadas en memoria | Data-driven | +15-20% |
| Pronóstico accuracy | N/A | 75-90% | Mejor planificación |

---

**🎉 Fase 2 Completada: Sistema inteligente y automático**

Commit: `e9586e4`
Líneas de código: 900+
Endpoints nuevos: 4
Componentes nuevos: 2
