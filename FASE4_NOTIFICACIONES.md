# 🔔 Fase 4: Notificaciones Inteligentes

**Commit:** `3d3e4ff` (Sistema completo de notificaciones y recomendaciones)

---

## 🎯 Funcionalidades Implementadas

### 1. Centro de Notificaciones

**URL:** `/admin/suppliers/notifications`

Panel completo para gestionar notificaciones:
- ✅ Lista de todas las notificaciones
- ✅ Filtro: todas vs sin leer
- ✅ Marcar como leído
- ✅ Actualización automática cada 30 segundos
- ✅ Código de colores por prioridad

**Interfaz:**
```
Centro de Notificaciones
┌─────────────────────────────────┐
│ Todas | Sin leer (3)            │
├─────────────────────────────────┤
│ [URGENT] Stock bajo - GYOZAS    │
│ 15 UD < 50                      │
│ hace 2 min                      │
├─────────────────────────────────┤
│ [HIGH] Cambio de precio         │
│ COSTILLA: €20.00 → €21.05       │
│ hace 5 min                      │
└─────────────────────────────────┘
```

---

### 2. Preferencias de Notificación

**Endpoint:** `PATCH /api/suppliers/notifications/preferences`

Configuración completa del usuario:

```json
{
  "user_id": "admin",
  "email_alerts": true,
  "email_forecast": true,
  "email_daily_digest": true,
  "slack_enabled": true,
  "slack_webhook": "https://hooks.slack.com/...",
  "phone_alerts": false,
  "phone_number": null,
  "quiet_hours_start": "22:00",
  "quiet_hours_end": "08:00"
}
```

**Características:**
- 📧 Alertas por email
- 📋 Pronóstico semanal
- 📊 Resumen diario
- 💬 Notificaciones Slack
- 📱 Alertas SMS (futuro)
- 🌙 Horario de silencio

---

### 3. Recomendaciones Automáticas

**Endpoint:** `POST /api/suppliers/recommendations/generate`

El sistema genera automáticamente 4 tipos de recomendaciones:

#### 3.1 Negociar Descuento por Volumen
```
📦 "Negociar descuento por volumen"
- Gasto > €5,000/mes → -10% potencial
- Con 150 unidades/mes puedes pedir descuento
- Acción: Contactar al proveedor
- Ahorro: €300-450/mes
```

#### 3.2 Consolidación de Proveedores
```
🤝 "Consolidar con proveedores mayores"
- Market share < 30% → fragmentación
- Consolida 5+ proveedores en 2-3
- Acción: Revisar estrategia
- Ahorro: 5% en negociación
```

#### 3.3 Cambiar Proveedor
```
🔄 "Considerar Komei Distributor"
- Este proveedor es 15% más caro
- Komei Distributor: €2,100/mes
- Ahorro potencial: €750/año
- Acción: Solicitar cotización
```

#### 3.4 Renegociar Contrato
```
💬 "Precios al alza - Renegociar contrato"
- Precio subió 8% en últimos 3 meses
- Acción: Iniciar negociación
- Ahorro potencial: 5% (~€150/mes)
```

**Scoring:**
- Confianza: basada en data points (6+ meses = 90%)
- Prioridad: 1-10 (8+ = rojo, 6+ = naranja)
- Ahorro potencial: calculado en EUR

---

## 📨 Canales de Notificación

### Email (Resend)
```
[URGENT] Stock bajo - GYOZAS

El sistema detectó que el stock de GYOZAS está por debajo del umbral.

Cantidad actual: 15 UD
Umbral: 50 UD

Acción recomendada: Hacer pedido urgente

---
Preferencias: Administrar
```

### Slack
```
color: #ff0000 (rojo para urgent)
title: "⚠️ STOCK BAJO"
text: "Stock bajo: GYOZAS (15 < 50)"
fields:
  - alert_type: low_stock
  - current_value: 15
  - threshold: 50
```

### SMS (futuro)
```
[Karuma] Stock bajo GYOZAS: 15 < 50. Acción: Pedir urgente.
```

---

## 🔌 Ejemplos de API

### Crear notificación
```bash
curl -X POST http://localhost:3000/api/suppliers/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "admin",
    "supplier_id": 7331,
    "notification_type": "alert",
    "title": "⚠️ STOCK BAJO",
    "message": "Stock bajo: GYOZAS (15 < 50)",
    "priority": "high",
    "data": {
      "product": "GYOZAS",
      "current": 15,
      "threshold": 50
    }
  }'
```

### Obtener notificaciones
```bash
GET /api/suppliers/notifications?user_id=admin&is_read=false
# Retorna notificaciones sin leer
```

### Marcar como leído
```bash
PATCH /api/suppliers/notifications/123/read
-d '{ "is_read": true }'
```

### Obtener preferencias
```bash
GET /api/suppliers/notifications/preferences?user_id=admin
```

### Actualizar preferencias
```bash
PATCH /api/suppliers/notifications/preferences
-d '{
  "user_id": "admin",
  "email_alerts": true,
  "slack_enabled": true,
  "slack_webhook": "..."
}'
```

### Generar recomendaciones
```bash
POST /api/suppliers/recommendations/generate
-d '{ "supplier_id": 7331 }'
```

### Obtener recomendaciones
```bash
GET /api/suppliers/recommendations?supplier_id=7331&is_active=true
```

---

## 📊 Tablas Base de Datos

### `user_notifications`
```sql
id, user_id, supplier_id, notification_type, title, message, 
priority, data (JSONB), is_read, read_at, created_at
```

### `notification_preferences`
```sql
id, user_id, email_alerts, email_forecast, email_daily_digest, 
slack_enabled, slack_webhook, phone_alerts, phone_number, 
quiet_hours_start, quiet_hours_end, created_at, updated_at
```

### `supplier_recommendations`
```sql
id, supplier_id, recommendation_type, title, description, 
potential_savings, confidence_score, priority, action_required, 
is_active, created_at, expires_at
```

### `notification_log`
```sql
id, notification_id, channel (email/slack/sms/in_app), 
status (sent/failed/bounced), error_message, sent_at
```

---

## 🔄 Integración con Alertas Existentes

**Flujo automático:**

```
Datos cambian (stock bajo, precio sube)
        ↓
POST /api/suppliers/alerts/check
        ↓
    Crea alerta en BD ✓
        ↓
    Envía notificación automática ✓
        ↓
        ├─ Guarda en user_notifications
        ├─ Envía email si está habilitado
        ├─ Envía Slack si está configurado
        └─ Log de envío
        ↓
Usuario ve en:
    - Centro de notificaciones
    - Email inbox
    - Slack channel
    - SMS (futuro)
```

---

## 💡 Casos de Uso

### Caso 1: Alerta de Stock Bajo
```
1. Sistema detecta: GYOZAS stock < 50
2. Crea alerta automática
3. Envía notificación:
   - Email: [URGENT] Stock bajo
   - Slack: Red color attachment
   - In-app: Centro de notificaciones
4. Usuario marca como leído
5. Historial guardado para auditoría
```

### Caso 2: Recomendación de Negociación
```
1. Usuario hace clic en "Generar" en analytics
2. Sistema analiza:
   - Gasto promedio: €3,000/mes
   - Tendencia: +8% mes a mes
   - Datos: 12 meses histórico
3. Crea recomendación: "Precios al alza"
   - Prioridad: 7/10
   - Confianza: 90%
   - Acción: Contactar proveedor
4. Notificación enviada a usuario
```

### Caso 3: Configurar Slack
```
1. Usuario va a Preferencias
2. Activa "Notificaciones Slack"
3. Pega webhook URL
4. Guarda preferencias
5. Próximas alertas → Slack automático
```

---

## 🔐 Seguridad

✅ **RLS en todas las tablas** — Solo el usuario ve sus notificaciones
✅ **Validación de entrada** — Campos requeridos
✅ **Webhook seguro** — Verifica dominio Slack
✅ **Audit trail** — Cada notificación enviada registrada
✅ **Quiet hours** — Respeta preferencias del usuario
✅ **Soft deletes** — Notificaciones nunca se eliminan

---

## 🚀 Próximos Pasos (Fase 5)

### Prioritario
- [ ] Webhook para recibir confirmación de envío (Resend)
- [ ] Reintento automático en fallos
- [ ] Dashboard de métricas de notificaciones
- [ ] Integración SMS (Twilio)

### Enhancement
- [ ] Notificaciones en tiempo real (WebSocket)
- [ ] Template personalizado para emails
- [ ] Historial de recomendaciones
- [ ] A/B testing de textos

### Avanzado
- [ ] ML para timing óptimo
- [ ] Priorización dinámica
- [ ] DND (Do Not Disturb) automático
- [ ] Agregación de alertas

---

## 📋 Componentes Creados

1. **NotificationCenter.tsx** — Panel principal de notificaciones
2. **NotificationPreferences.tsx** — Configuración de preferencias
3. **RecommendationsPanel.tsx** — Panel de recomendaciones inteligentes

## 🔌 Endpoints API (6 nuevos)

1. `GET /api/suppliers/notifications`
2. `POST /api/suppliers/notifications`
3. `PATCH /api/suppliers/notifications/[id]/read`
4. `GET/PATCH /api/suppliers/notifications/preferences`
5. `POST /api/suppliers/recommendations/generate`
6. `GET /api/suppliers/recommendations`

## 📄 Páginas (2 nuevas)

1. `/admin/suppliers/notifications` — Centro de notificaciones
2. Integración en `/admin/suppliers/analytics` — Panel de recomendaciones

---

## ✨ Diferencial

Sistema completamente autónomo que:
- ✅ **Detecta** cambios automáticamente
- ✅ **Notifica** por múltiples canales
- ✅ **Recomienda** acciones data-driven
- ✅ **Audita** cada comunicación
- ✅ **Respeta** preferencias del usuario
- ✅ **Escala** fácilmente con más usuarios

---

**🎉 Sistema de notificaciones completamente implementado**

Commit: `3d3e4ff`
Líneas de código: 600+
Archivos: 11
Migraciones: 1

**Estado: ✅ LISTO PARA USAR**
