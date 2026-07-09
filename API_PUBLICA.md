# 🌐 API Pública - Karuma ERP Proveedores

**Versión:** 1.0
**Base URL:** `https://karuma-gestion.vercel.app/api/public`
**Authentication:** API Key en header `X-API-Key`

---

## 🔑 Autenticación

### Obtener API Key

1. Acceder a `/admin/settings`
2. Ir a sección "API Keys"
3. Hacer click en "+ Crear API Key"
4. Copiar la clave generada

### Usar API Key

**Header:**
```bash
curl -H "X-API-Key: sk_live_abc123..." https://api.karuma.es/api/public/suppliers
```

**Query Parameter:**
```bash
curl https://api.karuma.es/api/public/suppliers?api_key=sk_live_abc123...
```

---

## 📊 Endpoints

### 1. Proveedores

#### GET /api/public/suppliers
Obtener lista de proveedores

**Parámetros:**
- `page` - Número de página (default: 1)
- `limit` - Registros por página (default: 20, max: 100)

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 7331,
      "supplier_name": "Jet Extramar",
      "contact_name": "Juan",
      "contact_email": "juan@jet.es",
      "contact_phone": "+34 600 123 456",
      "created_at": "2026-07-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

**Ejemplo:**
```bash
curl -X GET "https://api.karuma.es/api/public/suppliers?page=1&limit=10" \
  -H "X-API-Key: sk_live_xxx"
```

---

#### POST /api/public/suppliers
Crear nuevo proveedor

**Body:**
```json
{
  "supplier_name": "Nuevo Proveedor",
  "contact_name": "Carlos",
  "contact_email": "carlos@proveedor.es",
  "contact_phone": "+34 600 999 888"
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "id": 7332,
    "supplier_name": "Nuevo Proveedor",
    "created_at": "2026-07-09T15:30:00Z"
  }
}
```

---

### 2. Productos

#### GET /api/public/products
Obtener productos con filtros

**Parámetros:**
- `supplier_id` - Filtrar por proveedor
- `page` - Número de página
- `limit` - Registros por página (max: 100)

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "supplier_id": 7331,
      "product_name": "GYOZAS DE CERDO",
      "quantity": 50,
      "unit": "UNIDAD",
      "unit_price": 2.50,
      "suppliers": { "supplier_name": "Jet Extramar" }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 250
  }
}
```

**Ejemplo:**
```bash
curl -X GET "https://api.karuma.es/api/public/products?supplier_id=7331&limit=25" \
  -H "X-API-Key: sk_live_xxx"
```

---

### 3. Webhooks

#### GET /api/public/webhooks
Listar webhooks configurados

**Respuesta:**
```json
{
  "success": true,
  "webhooks": [
    {
      "id": 1,
      "event": "supplier.created",
      "url": "https://tu-app.com/webhooks/supplier",
      "active": true,
      "created_at": "2026-07-01T10:00:00Z"
    }
  ],
  "count": 1
}
```

---

#### POST /api/public/webhooks
Registrar nuevo webhook

**Body:**
```json
{
  "event": "supplier.created",
  "url": "https://tu-app.com/webhooks/supplier",
  "active": true
}
```

**Eventos disponibles:**
- `supplier.created` — Nuevo proveedor creado
- `supplier.updated` — Proveedor actualizado
- `product.created` — Nuevo producto
- `product.updated` — Producto actualizado
- `alert.triggered` — Alerta disparada
- `order.approved` — Orden aprobada
- `order.rejected` — Orden rechazada
- `forecast.updated` — Pronóstico actualizado

**Payload del Webhook:**
```json
{
  "event": "supplier.created",
  "timestamp": "2026-07-09T15:30:00Z",
  "data": {
    "id": 7332,
    "supplier_name": "Nuevo Proveedor",
    "contact_email": "carlos@proveedor.es"
  }
}
```

---

### 4. Integraciones ERP

#### POST /api/integrations/erp/sync
Sincronizar datos con ERP

**Body:**
```json
{
  "erp_type": "sap",
  "supplier_data": [
    {
      "erp_id": "SUPP001",
      "name": "Jet Extramar",
      "email": "contacto@jet.es",
      "phone": "+34 600 123 456"
    }
  ],
  "product_data": [
    {
      "erp_id": "PROD001",
      "supplier_erp_id": "SUPP001",
      "name": "GYOZAS",
      "price": 2.50,
      "quantity": 100,
      "unit": "UNIDAD"
    }
  ]
}
```

**Parámetros erp_type:**
- `sap` — SAP ERP
- `netsuite` — Oracle NetSuite
- `oracle` — Oracle EBS
- `generic` — Formato genérico

**Respuesta:**
```json
{
  "success": true,
  "syncLog": {
    "erp_type": "sap",
    "suppliers_synced": 1,
    "products_synced": 1,
    "errors": [],
    "timestamp": "2026-07-09T15:30:00Z"
  }
}
```

---

#### GET /api/integrations/erp/status
Obtener estado de sincronizaciones recientes

**Respuesta:**
```json
{
  "success": true,
  "recent_syncs": [
    {
      "id": 1,
      "integration_type": "sap",
      "sync_log": { ... },
      "status": "success",
      "created_at": "2026-07-09T15:00:00Z"
    }
  ]
}
```

---

## 🔄 Flujo de Integración

### Caso 1: Sincronización de SAP

```
Tu Sistema SAP
     ↓
POST /api/integrations/erp/sync
     ↓
Validar datos
     ↓
Upsert proveedores
     ↓
Upsert productos
     ↓
Log de sincronización
     ↓
Webhook: sync.completed
     ↓
Tu Sistema notificado
```

### Caso 2: Capturar Alertas

```
Sistema detecta stock bajo
     ↓
POST /api/suppliers/alerts/check
     ↓
Webhook: alert.triggered
     ↓
Tu Sistema:
  - POST /api/public/webhooks/receive
  - Procesar alerta
  - Tomar acción (crear PO, etc)
```

---

## 📋 Límites y Cuotas

| Recurso | Límite |
|---------|--------|
| Requests/hora | 1,000 (ajustable) |
| Registros por página | 100 max |
| Payload máximo | 10 MB |
| Reintentos webhook | 3 intentos |
| Timeout | 30 segundos |

---

## 🔒 Seguridad

### Best Practices

1. **Nunca** hardcodear API keys en código
2. Usar variables de entorno: `API_KEY=sk_live_...`
3. Rotar keys cada 90 días
4. Revocar keys no usadas
5. Usar HTTPS siempre

### Headers de Seguridad
```
X-API-Key: sk_live_abc123...
X-Request-ID: uuid-único
User-Agent: Tu-App/1.0
```

---

## 🚀 Ejemplos Completos

### Python

```python
import requests

API_KEY = "sk_live_abc123..."
BASE_URL = "https://api.karuma.es/api/public"

headers = {"X-API-Key": API_KEY}

# Obtener proveedores
response = requests.get(
    f"{BASE_URL}/suppliers?page=1&limit=20",
    headers=headers
)
suppliers = response.json()["data"]

# Crear proveedor
new_supplier = {
    "supplier_name": "Nuevo Proveedor",
    "contact_email": "email@example.com"
}
response = requests.post(
    f"{BASE_URL}/suppliers",
    json=new_supplier,
    headers=headers
)
print(response.json())
```

### JavaScript

```javascript
const API_KEY = "sk_live_abc123...";
const BASE_URL = "https://api.karuma.es/api/public";

async function getSuppliers() {
  const response = await fetch(
    `${BASE_URL}/suppliers?page=1&limit=20`,
    { headers: { "X-API-Key": API_KEY } }
  );
  return response.json();
}

async function createSupplier(name, email) {
  const response = await fetch(
    `${BASE_URL}/suppliers`,
    {
      method: "POST",
      headers: {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        supplier_name: name,
        contact_email: email
      })
    }
  );
  return response.json();
}
```

---

## 📖 Documentación Completa

**OpenAPI/Swagger:** `https://api.karuma.es/api/docs`

---

## 🆘 Soporte

- **Docs:** [API_PUBLICA.md](API_PUBLICA.md)
- **Email:** api-support@karuma.es
- **Status:** https://status.karuma.es

---

**v1.0 — 2026-07-09**
