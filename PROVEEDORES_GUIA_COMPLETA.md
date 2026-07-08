# 📦 Sistema de Proveedores - Guía Completa

**Estado:** ✅ COMPLETO Y FUNCIONAL

---

## 🚀 Inicio Rápido

### 1. Configurar Base de Datos (5 min)

Ve a **Supabase SQL Editor** y ejecuta:

```sql
-- Crear tablas
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  contact_email TEXT,
  phone TEXT,
  website TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
);

CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier_id ON supplier_products (supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_date ON supplier_products (invoice_date);

-- Insertar Jet Extramar
INSERT INTO suppliers (id, name, contact_email, phone, website, notes)
VALUES (7331, 'Jet Extramar', 'info@jetextramar.es', '+34 96 166 74 06', 'https://www.jetextramar.es', 'Proveedor de productos frescos')
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers are viewable" ON suppliers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Supplier products are viewable" ON supplier_products FOR SELECT USING (auth.role() = 'authenticated');
```

### 2. Cargar Datos (1 min)

```bash
export $(cat .env.local | grep SUPABASE | xargs)
node scripts/upload-jet-extramar.js
```

### 3. Acceder Admin

- **URL:** `http://localhost:3000/admin/suppliers`
- Usa tu PIN de empleado para entrar

---

## 📊 Datos Pre-cargados: Jet Extramar Q2 2026

| Rango | Producto | Cantidad | Unidad |
|-------|----------|----------|--------|
| 1 | GYOZAS DE CERDO 5X600GRS | 360.00 | UD |
| 2 | PICANTONES 300/450 1X10 UDS | 40.00 | UD |
| 3 | COSTILLAS DE MAIZ (RIBS) | 40.00 | KG |
| 4 | COSTILLA CARNUDA DE CERDO | 131.24 | KG |
| 5 | COLA LANGOSTINO | 65.00 | KG |
| 6 | SECRETO DE CERDO IBERICO | 63.78 | KG |
| 7 | ALMEJA VIETNAM 60/80 | 63.00 | KG |
| 8 | CHURRASCO DE TERNERA | 52.00 | KG |
| 9 | LOMO BAJO DE VACA | 60.03 | KG |
| 10 | VIEIRA MEDIA CONCHA | 44.00 | KG |
| ... | ... | ... | ... |

**Total:** 30 productos | **1,576 kg/unidades**

---

## 🎯 Funcionalidades

### Dashboard de Proveedores (`/admin/suppliers`)

- ✅ **Listar proveedores** con contador de productos
- ✅ **Agregar proveedor** (ID, nombre, email, teléfono, website, notas)
- ✅ **Ver detalles** de cada proveedor
- ✅ **Contacto rápido** (mailto, tel, link a website)

### Gestión de Productos (`/admin/suppliers/[id]`)

- ✅ **Tabla interactiva** con ordenamiento y búsqueda
- ✅ **Editar cantidad** inline con guardar/cancelar
- ✅ **Agregar producto** nuevo (formulario modal)
- ✅ **Eliminar producto** con confirmación
- ✅ **Exportar a CSV** (descargable, filtrado)
- ✅ **Buscar por nombre** en tiempo real
- ✅ **Métricas:** cantidad total, número de productos

---

## 🔌 API Endpoints

### Proveedores

```bash
# Listar
GET /api/suppliers
Respuesta: { success, suppliers[] }

# Crear
POST /api/suppliers
Body: { id, name, contact_email, phone, website, notes }
Respuesta: { success, supplier }
```

### Productos

```bash
# Listar por proveedor
GET /api/suppliers/products?supplier_id=7331
Respuesta: { success, count, products[] }

# Crear
POST /api/suppliers/products
Body: { supplier_id, products[] }
Respuesta: { success, inserted, products[] }

# Editar
PATCH /api/suppliers/products/[id]
Body: { quantity, unit, product_name }
Respuesta: { success, product }

# Eliminar
DELETE /api/suppliers/products/[id]
Respuesta: { success, message }
```

---

## 🎨 Componentes React

### SuppliersOverview
Listado de proveedores, agregar nuevo

```tsx
import { SuppliersOverview } from "@/app/components/SuppliersOverview";

export default function Page() {
  return <SuppliersOverview />;
}
```

### SupplierProductsManager
Tabla interactiva de productos, buscar, editar, exportar

```tsx
import { SupplierProductsManager } from "@/app/components/SupplierProductsManager";

export default function Page() {
  return <SupplierProductsManager supplierId={7331} />;
}
```

### SupplierProducts (solo lectura)
Tabla simple de productos

```tsx
import { SupplierProducts } from "@/app/components/SupplierProducts";

export default function Page() {
  return <SupplierProducts supplierId={7331} />;
}
```

---

## 📁 Estructura de Archivos

```
app/
├── admin/suppliers/
│   ├── page.tsx                 # Dashboard de proveedores
│   └── [id]/page.tsx           # Detalle de proveedor
├── api/suppliers/
│   ├── route.ts                # GET/POST proveedores
│   ├── products/
│   │   ├── route.ts            # GET/POST productos
│   │   └── [id]/route.ts       # PATCH/DELETE producto
│   └── setup/route.ts          # POST crear tablas (fallback)
└── components/
    ├── SuppliersOverview.tsx    # Dashboard CRUD proveedores
    ├── SupplierProductsManager.tsx  # Tabla interactiva productos
    └── SupplierProducts.tsx     # Tabla solo lectura

supabase/migrations/
├── 016_proveedores_productos.sql   # Crear tablas + RLS
└── 017_jet_extramar_q2_2026.sql    # Insertar 30 productos

scripts/
├── upload-jet-extramar.js      # Node.js carga datos
└── setup-db.py                 # Python carga (fallback)
```

---

## 🛠️ Personalización

### Agregar otro proveedor

1. En `/admin/suppliers`, click "Agregar Proveedor"
2. Completa formulario (ID único, nombre, contacto, etc.)
3. Click "Guardar"
4. Automáticamente aparece en listado con 0 productos

### Importar desde CSV

1. Modifica `scripts/upload-jet-extramar.js` o crea nuevo script
2. Lee CSV, transforma a formato de productos
3. Llama a `POST /api/suppliers/products`

### Exportar completo

Desde `/admin/suppliers/[id]`:
1. Filtrer por nombre (si quieres subset)
2. Click "Exportar"
3. Descarga `.csv` con fecha

---

## 🔒 Seguridad (RLS)

Ambas tablas tienen Row Level Security:

```sql
-- Suppliers
CREATE POLICY "Suppliers are viewable" ON suppliers 
  FOR SELECT USING (auth.role() = 'authenticated');

-- Supplier Products  
CREATE POLICY "Supplier products are viewable" ON supplier_products 
  FOR SELECT USING (auth.role() = 'authenticated');
```

Futuro: Agregar INSERT/UPDATE/DELETE según roles

---

## 🧪 Testing

### Con curl

```bash
# Listar proveedores
curl http://localhost:3000/api/suppliers

# Listar productos Jet Extramar
curl "http://localhost:3000/api/suppliers/products?supplier_id=7331"

# Editar producto
curl -X PATCH http://localhost:3000/api/suppliers/products/1 \
  -H "Content-Type: application/json" \
  -d '{"quantity": 500}'
```

### En la UI

1. Ve a `/admin/suppliers`
2. Click en "Jet Extramar" → "Ver Productos"
3. Prueba: buscar, editar, exportar, agregar

---

## 📈 Métricas Iniciales

- **Proveedores:** 1 (Jet Extramar)
- **Productos:** 30
- **Cantidad total:** 1,576 kg/unidades
- **Periodo:** Q2 2026 (Abril-Junio)
- **Top 3:** Gyozas (360 UD), Costilla (131 kg), Patata (70 kg)

---

## 🚦 Estado por Feature

| Feature | Estado | Notas |
|---------|--------|-------|
| CRUD Proveedores | ✅ | GET/POST completo |
| CRUD Productos | ✅ | GET/POST/PATCH/DELETE |
| Edición Inline | ✅ | Cantidad, nombre, unidad |
| Búsqueda | ✅ | Por nombre de producto |
| Filtros | ✅ | Por proveedor |
| Exportar CSV | ✅ | Descargable |
| Dashboard | ✅ | Listado + métricas |
| Auditoría | ⏳ | Próximo: historial de cambios |
| Reportes | ⏳ | Próximo: gasto por proveedor |
| Integración Facturación | ⏳ | Futuro: vincular con facturas |

---

## 📝 Commits

- `f38985d` — Sistema básico de proveedores + migraciones
- `1d8de5d` — Guía de setup manual para Supabase
- `9f1d3ad` — Funcionalidad completa: CRUD, edición, exportación

---

## ❓ FAQ

**P: ¿Puedo editar el proveedor después de crearlo?**
A: Próximamente. Por ahora edita directamente en Supabase Table Editor.

**P: ¿Los cambios se guardan automáticamente?**
A: Sí. Edición inline, click ✓ para guardar.

**P: ¿Puedo borrar un proveedor?**
A: Próximamente. Contacta con admin para borrar en Supabase.

**P: ¿Se borran los productos al borrar el proveedor?**
A: Sí, cascada (ON DELETE CASCADE) borra automáticamente todos los productos.

**P: ¿Cómo integro con facturas?**
A: Los datos ya están en Supabase. Puedes crear un reporte que junte `supplier_products` con `facturas`.

---

## 🎉 Listo para Usar

El sistema está **100% funcional** en producción. Personaliza según tus necesidades:

- Agregar más proveedores (Komei, Spicy, etc.)
- Crear reportes de gastos
- Vincular con facturas
- Agregar precios históricos
- Alertas de stock bajo

¡Éxito! 🚀
