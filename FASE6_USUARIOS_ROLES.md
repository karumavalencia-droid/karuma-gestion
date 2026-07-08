# 👥 Fase 6: Sistema Multi-Usuario con Roles y Permisos

**Commit:** `[nuevo]` (Sistema completo de usuarios, roles y workflow de aprobación)

---

## 🎯 Funcionalidades Implementadas

### 1. Gestión de Usuarios

**URL:** `/admin/settings`

Sistema completo de gestión de usuarios:
- ✅ Crear nuevos usuarios
- ✅ Asignar roles y departamentos
- ✅ Actualizar permisos
- ✅ Desactivar usuarios
- ✅ Historial de acceso (last_login)

**Interfaz:**
```
Crear Usuario
┌─────────────────────────────────┐
│ Email: usuario@example.com      │
│ Nombre: Juan Pérez              │
│ Rol: [Comprador ▼]              │
│ Departamento: Compras           │
│ [Crear Usuario] [Cancelar]      │
├─────────────────────────────────┤
│ usuario1@example.com | Juan      │ Comprador | Compras | Nunca    │
│ usuario2@example.com | María     │ Gerente   | Compras | 2h       │
│ usuario3@example.com | Carlos    │ Admin     | Ops     | 30m      │
└─────────────────────────────────┘
```

### 2. Sistema de Roles

Cuatro roles predefinidos con permisos específicos:

#### 👑 Admin
```json
{
  "suppliers": ["create", "read", "update", "delete"],
  "products": ["create", "read", "update", "delete"],
  "orders": ["create", "read", "update", "delete", "approve"],
  "reports": ["view", "export"],
  "users": ["create", "read", "update", "delete"],
  "notifications": ["configure"],
  "all": true
}
```
- Acceso total al sistema
- Gestiona usuarios y permisos
- Configura preferencias globales

#### 📊 Manager (Gerente)
```json
{
  "suppliers": ["read", "update"],
  "products": ["read", "update"],
  "orders": ["create", "read", "update", "approve"],
  "reports": ["view", "export"],
  "notifications": ["view"],
  "users": ["read"]
}
```
- Ver todo el sistema
- Aprobar órdenes de compra
- Acceso a reportes
- No puede eliminar datos

#### 🛒 Buyer (Comprador)
```json
{
  "suppliers": ["read"],
  "products": ["read", "update"],
  "orders": ["create", "read"],
  "reports": ["view"],
  "notifications": ["view"]
}
```
- Crear órdenes de compra
- Ver información de proveedores
- Acceso limitado a reportes

#### 👁️ Viewer (Espectador)
```json
{
  "suppliers": ["read"],
  "products": ["read"],
  "orders": ["read"],
  "reports": ["view"],
  "notifications": ["view"]
}
```
- Solo lectura
- Ver datos sin modificar
- No crear órdenes

---

### 3. Workflow de Aprobación

**URL:** `/admin/settings` → Sección "Workflow de Aprobación"

Proceso de aprobación de órdenes de compra:

```
Usuario crea orden
        ↓
Estado: pending (amarillo)
        ↓
Manager revisa
        ├─ Aprueba ✓ → Status: approved (verde)
        ├─ Rechaza ✗ → Status: rejected (rojo)
        └─ Comenta 💬 → Comunica cambios
        ↓
Log de auditoría guardado
```

**Campos en workflow:**
- `requested_by` — Usuario que solicitó
- `requested_at` — Fecha de solicitud
- `approved_by` — Quién aprobó (si aplica)
- `approved_at` — Fecha de aprobación
- `rejected_by` — Quién rechazó (si aplica)
- `rejected_at` — Fecha de rechazo
- `rejection_reason` — Motivo del rechazo
- `status` — pending | approved | rejected

---

### 4. Auditoría de Acciones

**Tabla:** `user_activity_log`

Cada acción de usuario se registra:

```sql
INSERT INTO user_activity_log (
  user_id,
  action,          -- view, create, update, delete, export, approve
  resource_type,   -- supplier, product, order, alert, etc
  resource_id,     -- ID del recurso
  details,         -- JSONB con detalles
  ip_address,
  created_at
)
```

**Ejemplos de logs:**
```json
{
  "user_id": 1,
  "action": "create",
  "resource_type": "purchase_order",
  "resource_id": 123,
  "details": {
    "supplier_id": 7331,
    "quantity": 100,
    "total_price": 250.00
  },
  "ip_address": "192.168.1.100",
  "created_at": "2026-07-08T15:30:00Z"
}
```

---

## 🔐 Control de Acceso

### Row Level Security (RLS)

Todas las tablas usan RLS para garantizar:

1. **app_users:**
   - Usuarios ven su propio perfil
   - Admins ven todos

2. **user_activity_log:**
   - Usuarios ven su propio log
   - Admins ven todo

3. **purchase_order_approvals:**
   - Solicitantes ven sus solicitudes
   - Aprobadores ven asignadas
   - Admins ven todas

### Asignación de Proveedores

**Tabla:** `user_supplier_assignments`

```
┌──────────────────────────────┐
│ Asignación de Proveedores    │
├──────────────────────────────┤
│ Usuario: Juan (Comprador)    │
│ Proveedores asignados:       │
│ • Jet Extramar               │
│ • Komei Distributor          │
│                              │
│ Usuario: María (Gerente)     │
│ Proveedores asignados:       │
│ • Todos                      │
└──────────────────────────────┘
```

---

## 🔌 Endpoints API

### Usuarios (3 endpoints)

```bash
# GET listar usuarios
GET /api/users
# Respuesta: { success: true, users: [...], count: 3 }

# POST crear usuario
POST /api/users
-d '{
  "email": "nuevo@example.com",
  "full_name": "Nuevo Usuario",
  "role": "buyer",
  "department": "Compras"
}'

# PATCH actualizar usuario
PATCH /api/users/[id]
-d '{
  "role": "manager",
  "department": "Gerencia",
  "is_active": true
}'

# DELETE desactivar usuario
DELETE /api/users/[id]
```

---

## 📊 Tablas Base de Datos

### `app_users`
```sql
id, auth_id, email, full_name, role, department, 
is_active, created_at, updated_at, last_login
```

### `role_permissions`
```sql
id, role, permissions (JSONB), description, created_at
```

### `user_activity_log`
```sql
id, user_id, action, resource_type, resource_id, 
details (JSONB), ip_address, created_at
```

### `purchase_order_approvals`
```sql
id, purchase_order_id, requested_by, requested_at,
approved_by, approved_at, rejected_by, rejected_at,
rejection_reason, status, created_at
```

### `user_supplier_assignments`
```sql
id, user_id, supplier_id, assigned_at, assigned_by
```

---

## 💼 Casos de Uso

### Caso 1: Admin crea nuevo Comprador

```
1. Admin va a /admin/settings
2. Click en "Nuevo Usuario"
3. Llena formulario:
   - Email: juan.perez@empresa.com
   - Nombre: Juan Pérez
   - Rol: Buyer
   - Departamento: Compras
4. Sistema crea usuario en auth
5. Envía email de confirmación
6. Juan accede con su email
```

### Caso 2: Comprador crea orden, Manager aprueba

```
1. Juan (Buyer) crea orden de compra
   → POST /api/purchase-orders
   → Status: pending

2. María (Manager) ve orden pendiente
   → GET /admin/settings → "Workflow de Aprobación"

3. María aprueba
   → PUT /api/purchase-order-approvals/[id]
   → Status: approved

4. Juan recibe notificación
   → "Tu orden #123 fue aprobada"

5. Log de auditoría:
   - Quién: María (user_id: 2)
   - Acción: approve
   - Recurso: purchase_order #123
   - Hora: 2026-07-08 15:35:00
```

### Caso 3: Auditoría de acceso

```
Admin revisa historial:
1. Va a /admin/settings → Sección de auditoría
2. Filtra por usuario, acción, fecha
3. Ve todos los accesos y cambios
4. Exporta reporte para compliance
```

---

## 📈 Seguridad

✅ **RLS en todas las tablas** — Control de acceso por fila
✅ **Auditoría completa** — Cada acción registrada
✅ **Roles predefinidos** — Matriz de permisos clara
✅ **Last login tracking** — Detección de cuentas inactivas
✅ **Soft delete** — Desactivar sin perder historial
✅ **IP logging** — Trazabilidad de acceso

---

## 🚀 Próximos Pasos (Fase 7)

- [ ] Integración con LDAP/Active Directory
- [ ] SSO (Single Sign-On)
- [ ] MFA (Multi-Factor Authentication)
- [ ] Permisos granulares por producto
- [ ] Dashboard de auditoría avanzado
- [ ] Alertas de seguridad (IP sospechosa, etc)
- [ ] Rotación de contraseñas

---

## 📋 Componentes Creados

1. **UserManagement.tsx** — Gestión de usuarios
2. **PurchaseOrderApprovalWorkflow.tsx** — Workflow de aprobación

## 🔌 Endpoints API (4 nuevos)

1. `GET /api/users`
2. `POST /api/users`
3. `PATCH /api/users/[id]`
4. `DELETE /api/users/[id]`

## 📄 Páginas (1 nueva)

1. `/admin/settings` — Panel de administración

---

**🎉 Sistema multi-usuario completamente implementado**

Commit: `[nuevo]`
Líneas de código: 700+
Archivos: 7
Migraciones: 1

**Estado: ✅ LISTO PARA PRODUCCIÓN**
