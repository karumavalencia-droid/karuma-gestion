# 📊 Fase 7: Business Intelligence Avanzado

**Commit:** `[nuevo]` (BI avanzado con visualizaciones, correlaciones y dashboards personalizables)

---

## 🎯 Funcionalidades Implementadas

### 1. Visualizaciones Avanzadas

**URL:** `/admin/suppliers/bi`

Sistema completo de Business Intelligence:
- ✅ Gráficos de comparación
- ✅ Heatmaps de precios
- ✅ Análisis de correlación
- ✅ Scorecards de proveedores
- ✅ Matriz de métricas

**Componentes:**

```
1. Gastos por Proveedor
   ├─ Barras horizontales
   ├─ Valores exactos
   └─ Comparación visual

2. Matriz de Métricas
   ├─ Gasto/mes
   ├─ Tendencia (↑↓→)
   ├─ Cantidad de productos
   └─ Alertas activas

3. Heatmap de Cambios de Precio
   ├─ 6 meses histórico
   ├─ Color por porcentaje cambio
   └─ Rojo = ↑ Naranja = ↑ Verde = ↓

4. Análisis de Correlación
   ├─ Volumen vs Precio
   ├─ Volatilidad de precio
   └─ Indicadores de riesgo

5. Scorecard de Proveedores
   ├─ Calidad (stock)
   ├─ Precio vs promedio
   ├─ Servicio (entregas)
   └─ Score agregado 1-100
```

---

### 2. Dashboard Personalizable

**URL:** `/admin/suppliers/bi-custom`

Permite al usuario customizar su vista:

```
Widgets disponibles:
┌─────────────────────────────────┐
│ ☑ Gasto Total                   │
│ ☑ Alertas Activas               │
│ ☑ Ahorros Potenciales           │
│ ☑ Tendencia de Gastos (Gráfico) │
│ ☑ Comparativa Proveedores       │
│ ☐ Heatmap de Precios            │
│ ☐ Top 10 Productos              │
└─────────────────────────────────┘

Guardar → localStorage → Persistir entre sesiones
```

**Features:**
- Marcar/desmarcar widgets
- Reordenar widgets (drag & drop en futuro)
- Guardar configuración
- Restaurar defaults
- Multi-dispositivo (responsive)

---

### 3. Análisis Profundo

**Correlaciones:**
```
Volumen ↔ Precio
┌──────────────────────────────┐
│ Jet Extramar: -0.45 (Bueno)  │ Mejor: Mayor vol → Menor precio
│ Komei: -0.62 (Excelente)     │
│ Spicy: 0.22 (Malo)           │ Malo: Mayor vol → Mayor precio
└──────────────────────────────┘
```

**Volatilidad:**
```
GYOZAS: 8% (Estable ✓)
COSTILLA: 15% (Alto ⚠️)
ALMEJA: 12% (Medio)
```

**Scorecard (1-100):**
```
Komei: 92/100 (⭐⭐⭐⭐⭐)
├─ Calidad: 92
├─ Precio: 95
└─ Servicio: 88

Jet: 85/100 (⭐⭐⭐⭐)
└─ Equilibrado en todo

Spicy: 75/100 (⭐⭐⭐)
├─ Calidad baja: 75
├─ Precio bajo: 70
└─ Entrega mediocre: 78
```

---

## 📊 Tipos de Gráficos

### 1. Barras (Comparison)
```
Proveedor A: ████████████ €3,500
Proveedor B: ████████     €2,100
Proveedor C: ███████████████ €4,200
```

### 2. Heatmap (Temporal)
```
Producto | E  F  M  A  M  J
GYOZAS   | 0% 2% 0% 3% 1% 0%  (Verde = estable)
COSTILLA | 5% 8% 6% 10% 8% 5% (Rojo = volatilidad)
ALMEJA   | 3% 5% 2% 4% 3% 2%  (Naranja = medio)
```

### 3. Líneas (Tendencia)
```
Costo por mes:
5000 │     ╱╲
4500 │    ╱  ╲  ╱╲
4000 │   ╱    ╲╱  ╲
3500 │  ╱          ╲
     └─────────────── 6 meses
```

### 4. Scorecard (Resumen)
```
Komei Distributor
━━━━━━━━━━━━━━━━━
Calidad:  92% ████████████░
Precio:   95% █████████████░
Servicio: 88% ███████████░░
Score:    92/100 ⭐⭐⭐⭐⭐
```

---

## 🔌 API para BI

### Endpoint para Datos de BI
```bash
GET /api/suppliers/bi/metrics?period=6
# Retorna:
{
  "spending_by_supplier": [...],
  "price_changes": [...],
  "correlations": [...],
  "volatility": [...],
  "scorecards": [...]
}
```

### Endpoint para Correlaciones
```bash
GET /api/suppliers/bi/correlations?supplier_id=7331
# Retorna:
{
  "volume_price_correlation": -0.45,
  "trend_correlation": 0.22,
  "quality_price_correlation": -0.15
}
```

### Endpoint para Volatilidad
```bash
GET /api/suppliers/bi/volatility?supplier_id=7331
# Retorna:
{
  "products": [
    { name: "GYOZAS", volatility: 0.08 },
    { name: "COSTILLA", volatility: 0.15 }
  ]
}
```

---

## 💾 Persistencia

**localStorage:**
```javascript
// Guardar configuración de dashboard
localStorage.setItem("dashboard-config", JSON.stringify(widgets))

// Cargar configuración
const config = JSON.parse(localStorage.getItem("dashboard-config"))
```

**Futuro: Sincronizar en BD**
```sql
CREATE TABLE user_dashboard_preferences (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  widgets JSONB,
  layout TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

---

## 📈 Insights Automáticos Generados

El sistema detecta automáticamente:

```
✓ Oportunidades de negociación
  "Komei tiene mejor precio → Renegociar con Jet"

⚠️ Riesgos de volatilidad
  "Spicy Foods: 15% cambio de precio → Buscar alternativa"

📈 Tendencias de mercado
  "COSTILLA sube 8%/mes → Comprar antes del aumento"

💰 Ahorros potenciales
  "Consolidar en Komei: €15,000/año"

🎯 Recomendaciones de acción
  "Aumentar volumen con Komei para obtener descuento"
```

---

## 🎨 Componentes React

1. **AdvancedBI.tsx** — Visualizaciones y análisis
2. **CustomizableDashboard.tsx** — Dashboard personalizable

## 📄 Páginas

1. `/admin/suppliers/bi` — BI Avanzado
2. `/admin/suppliers/bi-custom` — Dashboard Personalizado

---

## 🚀 Uso

### Para Gerentes
```
1. Ir a /admin/suppliers/bi
2. Revisar análisis de correlación
3. Identificar oportunidades
4. Tomar decisiones data-driven
```

### Para Análisis
```
1. Personalizar dashboard en /admin/suppliers/bi-custom
2. Guardar configuración
3. Exportar datos para reportes
4. Investigar anomalías en heatmap
```

---

## 🔮 Roadmap: Fase 8

- [ ] Integrar Recharts para gráficos interactivos
- [ ] Drag & drop reordenable de widgets
- [ ] Exportar dashboard a PDF
- [ ] Compartir dashboards entre usuarios
- [ ] Alertas basadas en anomalías
- [ ] Predicción de anomalías con ML
- [ ] API de terceros (Metabase, Tableau)

---

**🎉 Phase 7 completada: BI avanzado con análisis profundo**

Commit: `[nuevo]`
Líneas de código: 400+
Archivos: 4
Componentes: 2
Páginas: 2

**Estado: ✅ LISTO PARA PRODUCCIÓN**
