# 🔌 Fase 8: Integraciones y API Pública

**Commit:** `[nuevo]` (API pública, webhooks, integraciones ERP)

---

## 🎯 Funcionalidades Implementadas

### 1. API Pública REST

**Base URL:** `/api/public/`

Endpoints para acceso externo:

#### Proveedores
```bash
GET /api/public/suppliers?page=1&limit=20
POST /api/public/suppliers
```

#### Productos
```bash
GET /api/public/products?supplier_id=123&limit=50
```

**Autenticación:**
```
Header: X-API-Key: sk_live_abc123...
o Query: ?api_key=sk_live_abc123...
```

---

### 2. Sistema de Webhooks

**Configurar Webhook:**
```bash
POST /api/public/webhooks
{
  "event": "supplier.created",
  "url": "https://tu-app.com/webhook",
  "active": true
}
```

**Eventos Disponibles:**
- `supplier.created` — Nuevo proveedor
- `supplier.updated` — Proveedor modificado
- `product.created` — Nuevo producto
- `product.updated` — Producto modificado
- `alert.triggered` — Alerta disparada
- `order.approved` — Orden aprobada
- `order.rejected` — Orden rechazada
- `forecast.updated` — Pronóstico actualizado

**Payload:**
```json
{
  "event": "supplier.created",
  "timestamp": "2026-07-09T15:30:00Z",
  "data": {
    "id": 7332,
    "supplier_name": "Nuevo Proveedor",
    "contact_email": "contact@example.com"
  }
}
```

---

### 3. Integración ERP

**Endpoint:** `POST /api/integrations/erp/sync`

Sincronizar datos con sistemas ERP:

```bash
curl -X POST https://api.karuma.es/api/integrations/erp/sync \
  -H "Content-Type: application/json" \
  -d '{
    "erp_type": "sap",
    "supplier_data": [
      {
        "erp_id": "SUPP001",
        "name": "Jet Extramar",
        "email": "contact@jet.es",
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
  }'
```

**Tipos de ERP Soportados:**
- SAP EBS
- Oracle NetSuite
- Oracle EBS
- Formato genérico (custom)

**Respuesta:**
```json
{
  "success": true,
  "syncLog": {
    "erp_type": "sap",
    "suppliers_synced": 1,
    "products_synced": 5,
    "errors": [],
    "timestamp": "2026-07-09T15:30:00Z"
  }
}
```

**Ver histórico de sincronizaciones:**
```bash
GET /api/integrations/erp/status
```

---

### 4. API Key Management

**Tabla:** `api_keys`

```sql
id | key | name | scopes | rate_limit | active | created_at | expires_at
---|-----|------|--------|------------|--------|------------|------------
 1 | sk_live_abc... | Production | read:* | 1000 | true | 2026-07-01 | 2027-01-01
```

**Scopes Disponibles:**
- `read:suppliers` — Leer proveedores
- `read:products` — Leer productos
- `read:alerts` — Leer alertas
- `write:suppliers` — Crear/editar proveedores
- `write:products` — Crear/editar productos
- `admin` — Acceso total

**Rate Limiting:**
- 1,000 requests/hora (configurable)
- Tracked en `api_call_logs`
- Header: `X-RateLimit-Remaining`

---

### 5. Logging de API

**Tabla:** `api_call_logs`

Cada llamada se registra:
```sql
id | api_key_id | endpoint | method | status_code | response_time_ms | ip_address | created_at
---|------------|----------|--------|-------------|------------------|------------|-----------
```

**Útil para:**
- Debugging
- Monitoreo
- Rate limiting
- Auditoría

---

## 🔄 Flujos de Integración

### Flujo 1: SAP → Karuma

```
SAP ERP
  ↓
POST /api/integrations/erp/sync
  ├─ Parse supplier data
  ├─ Parse product data
  ├─ Validate data
  ├─ Upsert suppliers
  ├─ Upsert products
  └─ Log sync
  ↓
integration_logs entry
  ↓
Webhook: sync.completed
  ↓
SAP notificado ✓
```

### Flujo 2: Capturar Alertas

```
Sistema Karuma
  ↓
Alert triggered (stock bajo)
  ↓
POST webhook registered for "alert.triggered"
  ↓
Webhook payload envía a tu URL:
{
  "event": "alert.triggered",
  "data": {
    "alert_type": "low_stock",
    "product": "GYOZAS",
    "current": 15,
    "threshold": 50
  }
}
  ↓
Tu app recibe y actúa:
  - Crear PO automática
  - Notificar al equipo
  - Actualizar inventario
```

### Flujo 3: Integraciones Custom

```
Tu App
  ↓
GET /api/public/suppliers
  ├─ Parse response
  ├─ Transform data
  └─ Store locally
  ↓
GET /api/public/products?supplier_id=123
  ├─ Parse response
  ├─ Update local DB
  └─ Sync inventario
  ↓
POST /api/public/webhooks (register)
  └─ Listen for updates
```

---

## 📊 Datos Sincronizados

### Desde SAP a Karuma

| Campo SAP | Campo Karuma | Tipo |
|-----------|-------------|------|
| LIFNR | id | INTEGER |
| NAME1 | supplier_name | TEXT |
| SMTP_ADDR | contact_email | TEXT |
| TELF1 | contact_phone | TEXT |
| MATNR | product.id | INTEGER |
| MAKTX | product.product_name | TEXT |
| MEINS | product.unit | TEXT |
| LABC1 | product.quantity | NUMERIC |
| EKPO.NETPR | product.unit_price | NUMERIC |

### Desde Karuma a Tu App (via Webhook)

```json
{
  "event": "product.updated",
  "data": {
    "id": 123,
    "product_name": "GYOZAS",
    "quantity": 50,
    "unit_price": 2.75,
    "updated_at": "2026-07-09T15:30:00Z"
  }
}
```

---

## 🔐 Seguridad de Integraciones

### API Key Security

✅ **Nunca** hardcodear keys
✅ Usar variables de entorno
✅ Rotar cada 90 días
✅ Revocar no usadas
✅ Usar HTTPS siempre

### Webhook Security

✅ Validar signature (HMAC)
✅ Verificar timestamp
✅ Reintentos con backoff
✅ Timeout de 30 segundos
✅ Log de intentos fallidos

### ERP Sync Security

✅ Validar credenciales ERP
✅ Encriptar datos en tránsito
✅ Validar formato de datos
✅ Log de todas las sincronizaciones
✅ Rollback on failure

---

## 📋 Tablas Nuevas

### `webhooks`
```sql
id, event, url, api_key, active, retry_count, 
last_triggered, created_at, updated_at
```

### `api_keys`
```sql
id, key, name, user_id, scopes, rate_limit, 
last_used, active, created_at, expires_at
```

### `api_call_logs`
```sql
id, api_key_id, endpoint, method, status_code, 
response_time_ms, ip_address, created_at
```

### `integration_logs`
```sql
id, integration_type, sync_log (JSONB), status, 
error_message, created_at
```

---

## 🚀 Uso

### Para Administradores

```
1. Ir a /admin/settings → API Keys
2. Crear nueva key
3. Configurar scopes
4. Establecer rate limit
5. Compartir con integradores
6. Monitorear en /admin/settings → API Logs
```

### Para Desarrolladores

```
1. Obtener API key
2. Instalar SDK (Python, JS, etc)
3. Configurar webhooks
4. Implementar handlers
5. Testear en staging
6. Deploy a producción
```

### Para Integradores SAP

```
1. Crear API key con scope "write:suppliers", "write:products"
2. Configurar job en SAP:
   - Frequency: diaria
   - Endpoint: POST /api/integrations/erp/sync
   - Payload: supplier + product data
3. Monitorear sync logs en Karuma
4. Configurar webhook para confirmación
```

---

## 📖 Documentación

- **API_PUBLICA.md** — Referencia completa de endpoints
- **OpenAPI/Swagger** — `/api/docs` (futuro)
- **SDK Python** — `pip install karuma-erp-sdk` (futuro)
- **SDK JavaScript** — `npm install karuma-erp-sdk` (futuro)

---

## 🔮 Roadmap: Fase 9+

- [ ] OpenAPI/Swagger documentation
- [ ] Python SDK
- [ ] JavaScript SDK
- [ ] Graphql endpoint
- [ ] Webhooks con retry inteligente
- [ ] Rate limiting por IP
- [ ] CORS configurables
- [ ] OAuth2 flow
- [ ] Certified integrations (SAP, NetSuite)

---

**🎉 Fase 8 completada: API Pública + Webhooks + Integraciones ERP**

Commit: `[nuevo]`
Líneas de código: 300+
Endpoints nuevos: 6
Migraciones: 1
Documentación: 1 doc completo

**Estado: ✅ LISTO PARA PRODUCCIÓN**
