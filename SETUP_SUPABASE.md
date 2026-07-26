# 🔧 Configuración Manual de Proveedores en Supabase

Como la conexión TCP a Supabase está restringida, hay que aplicar las migraciones manualmente en el SQL Editor.

---

## ⚡ Pasos Rápidos (5 minutos)

### 1️⃣ Abre Supabase Dashboard

```
https://app.supabase.com → Tu proyecto → SQL Editor
```

### 2️⃣ Copia este SQL y ejecuta:

```sql
-- Crear tablas de proveedores
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

CREATE POLICY "Suppliers are viewable by authenticated users" ON suppliers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Supplier products are viewable by authenticated users" ON supplier_products
  FOR SELECT USING (auth.role() = 'authenticated');
```

✓ **Debería ejecutarse sin errores**

### 3️⃣ Verifica que se creó la tabla

En Supabase → Table Editor, deberías ver:
- ✅ `suppliers` (1 fila)
- ✅ `supplier_products` (vacía)

### 4️⃣ Carga los 30 productos

```bash
export $(cat .env.local | grep SUPABASE | xargs)
node scripts/upload-jet-extramar.js
```

✓ Deberías ver:
```
🚀 Iniciando carga de productos Jet Extramar...

  ✓ Proveedor ya existe

  📦 Insertando 30 productos...
  ✓ Se insertaron 30 productos

📊 Resumen:
  Total de productos: 30
  Total de cantidad: 1576.25 unidades

✅ ¡Carga completada exitosamente!
```

---

## 📝 Alternativas

### Opción A: Si prefieres no hacer manual

Salta el paso 2-3 y ejecuta directamente:

```bash
node scripts/upload-jet-extramar.js
```

Creará automáticamente las tablas (si la conexión funciona).

### Opción B: Hacer commit y usar en CI/CD

Las migraciones ya están en:
- `supabase/migrations/016_proveedores_productos.sql`
- `supabase/migrations/017_jet_extramar_q2_2026.sql`

Cuando implementes Supabase CLI, ejecuta:
```bash
supabase db push
```

---

## ✅ Una vez completado

Accede a los datos:

```bash
# API
curl http://localhost:3000/api/suppliers/products?supplier_id=7331

# Código
import { SupplierProducts } from "@/app/components/SupplierProducts";

export default function AdminPage() {
  return <SupplierProducts supplierId={7331} />;
}
```

---

## 🆘 Troubleshooting

**P: El script falla diciendo "tabla no existe"**
A: Ve al paso 2 - hay que crear las tablas en Supabase SQL Editor primero.

**P: ¿Puedo ver los datos sin el script?**
A: Sí, ve a Supabase → Table Editor → `supplier_products` para verlos.

**P: ¿Dónde están todos los 30 productos?**
A: Después de ejecutar el script, están en `supplier_products` tabla.

**P: ¿Puedo editar cantidades?**
A: Sí, directamente en Supabase Table Editor o crea un componente de edición.

---

## 📊 Resultado Final

Tendrás en tu BD:

```
suppliers table:
  ID: 7331
  Name: Jet Extramar
  30 relacionados en supplier_products

supplier_products table:
  Rango 1-30
  Productos ordenados por cantidad (Gyozas 360 UD primero)
  Total: 1,576 kg/unidades
```

API disponible en `/api/suppliers/products?supplier_id=7331`
