# 📦 Sistema de Proveedores y Productos

Gestión de proveedores y sus productos comprados. Inicio: Jet Extramar Q2 2026.

---

## 🚀 Inicio Rápido

### Opción 1: Script Automático (Recomendado)

```bash
node scripts/upload-jet-extramar.js
```

✓ Crea tabla de proveedores y productos (si no existe)
✓ Inserta proveedor Jet Extramar
✓ Inserta 30 productos ordenados por cantidad

### Opción 2: Migración SQL Manual

1. Accede a Supabase → SQL Editor
2. Ejecuta estas migraciones en orden:
   - `supabase/migrations/016_proveedores_productos.sql`
   - `supabase/migrations/017_jet_extramar_q2_2026.sql`

### Opción 3: API REST

```bash
curl -X POST http://localhost:3000/api/suppliers/products \
  -H "Content-Type: application/json" \
  -d '{
    "supplier_id": 7331,
    "products": [
      {
        "product_name": "GYOZAS DE CERDO 5X600GRS X30UDS",
        "quantity": 360.0,
        "unit": "UD",
        "rango": 1
      }
    ]
  }'
```

---

## 📊 Datos: Jet Extramar Q2 2026

**Total:** 30 productos, 1,576 kg/unidades

| Rango | Producto | Cantidad | Unidad |
|-------|----------|----------|--------|
| 1 | GYOZAS DE CERDO 5X600GRS X30UDS | 360.00 | UD |
| 2 | PICANTONES 300/450 1X10 UDS | 40.00 | UD |
| 3 | COSTILLAS DE MAIZ (RIBS) 4BOX2.5KG | 40.00 | KG |
| 4 | COSTILLA CARNUDA DE CERDO P.V | 131.24 | KG |
| 5 | COLA LANGOSTINO CRUDA S/P SIVENA | 65.00 | KG |
| 6 | SECRETO DE CERDO IBERICO P.V | 63.78 | KG |
| 7 | ALMEJA VIETNAM 60/80 6X1 | 63.00 | KG |
| 8 | CHURRASCO DE TERNERA 1X4 | 52.00 | KG |
| 9 | LOMO BAJO DE VACA MADURADO 6/7 | 60.03 | KG |
| 10 | VIEIRA MEDIA CONCHA 20/30 10X1 | 44.00 | KG |

*Ver lista completa en `/api/suppliers/products?supplier_id=7331`*

---

## 🔌 API Endpoints

### GET `/api/suppliers/products`

Obtiene todos los productos de un proveedor.

**Parámetros:**
- `supplier_id` (requerido): ID del proveedor

**Respuesta:**
```json
{
  "success": true,
  "supplier_id": "7331",
  "count": 30,
  "products": [
    {
      "id": 1,
      "supplier_id": 7331,
      "product_name": "GYOZAS DE CERDO...",
      "quantity": 360.00,
      "unit": "UD",
      "rango": 1,
      "invoice_date": "2026-06-29",
      "created_at": "2026-07-08T20:30:00Z"
    }
  ]
}
```

### POST `/api/suppliers/products`

Inserta nuevos productos.

**Body:**
```json
{
  "supplier_id": 7331,
  "products": [
    {
      "product_name": "NUEVO PRODUCTO",
      "quantity": 10.5,
      "unit": "KG",
      "rango": 31,
      "invoice_date": "2026-07-01"
    }
  ]
}
```

---

## 🎨 Componente React

Visualizar productos en tu admin panel:

```tsx
import { SupplierProducts } from "@/app/components/SupplierProducts";

export default function AdminPage() {
  return (
    <div className="p-6">
      <h1>Productos Jet Extramar</h1>
      <SupplierProducts supplierId={7331} />
    </div>
  );
}
```

---

## 📁 Archivos Exportados

Disponibles en `/scratchpad/`:

- **productos_jet.csv** — Para Excel / Google Sheets
- **productos_jet.json** — Para APIs
- **productos_jet.sql** — Para inserción directa en BD

---

## 🗄️ Estructura BD

### Tabla: `suppliers`
```sql
CREATE TABLE suppliers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  contact_email TEXT,
  phone TEXT,
  website TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Tabla: `supplier_products`
```sql
CREATE TABLE supplier_products (
  id BIGSERIAL PRIMARY KEY,
  supplier_id INTEGER REFERENCES suppliers(id),
  product_name TEXT NOT NULL,
  quantity NUMERIC(12, 2),
  unit TEXT,
  rango INTEGER,
  invoice_date DATE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

## 🔒 Seguridad (RLS)

Ambas tablas tienen políticas RLS habilitadas:
- **SELECT:** Usuarios autenticados pueden ver todos los productos
- **INSERT/UPDATE/DELETE:** Solo super admin (implementar luego si es necesario)

---

## 🎯 Funcionalidades Implementadas

✅ Edición inline de cantidades
✅ Búsqueda y filtrado de productos
✅ Exportar a CSV
✅ Agregar nuevos productos
✅ Gestión de proveedores (CRUD)
✅ Dashboard de proveedores
✅ Página de detalle con todos los productos

## 📋 Página Admin

Accede desde tu app:

```tsx
// /app/admin/suppliers
<SuppliersOverview />

// /app/admin/suppliers/[id]
<SupplierProductsManager supplierId={id} />
```

**URLs:**
- `/admin/suppliers` — Lista de proveedores
- `/admin/suppliers/7331` — Productos Jet Extramar

## 📝 Próximos Pasos

- [ ] Agregar más proveedores (Komei, Spicy, etc.)
- [ ] Reportes de gastos por proveedor
- [ ] Historial de cambios (auditoría)
- [ ] Alertas de disponibilidad baja
- [ ] Integración con facturación

---

## ❓ Ayuda

**P: ¿Cómo importar desde otra fuente?**
A: Usa el formato CSV o JSON y llama a `/api/suppliers/products` con el body correspondiente.

**P: ¿Puedo modificar cantidades?**
A: Sí, por ahora es manual. Puedes editar en Supabase dashboard o crear UI de edición.

**P: ¿Dónde están todos los 30 productos?**
A: En Supabase → `supplier_products` tabla, o en `/api/suppliers/products?supplier_id=7331`
