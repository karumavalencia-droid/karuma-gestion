# 🔧 Documentación Técnica para Desarrolladores

## Índice Rápido

- [Arquitectura](#arquitectura)
- [Estructura de Carpetas](#estructura-de-carpetas)
- [Flujo de Datos](#flujo-de-datos)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## Arquitectura

### Stack Tecnológico

```
Frontend:     Next.js 15 + React 18 + TypeScript
Backend:      Next.js API Routes (serverless)
Database:     Supabase (PostgreSQL)
Auth:         Session cookies + PIN validation
Styling:      Tailwind CSS
```

### Componentes Principales

```
┌─────────────────────────────────────┐
│         Browser / Mobile             │
└────────────────┬────────────────────┘
                 │
        ┌────────▼─────────┐
        │  React Components │
        │ (announcements/   │
        │  my-attendance)   │
        └────────┬─────────┘
                 │
        ┌────────▼──────────────────┐
        │  Next.js API Routes       │
        │  /api/announcements       │
        │  /api/attendance          │
        └────────┬──────────────────┘
                 │
        ┌────────▼──────────────────┐
        │  Repository Layer         │
        │  (lib/announcements/)     │
        └────────┬──────────────────┘
                 │
        ┌────────▼──────────────────┐
        │  Supabase Admin Client    │
        └────────┬──────────────────┘
                 │
        ┌────────▼──────────────────┐
        │  PostgreSQL Database      │
        │  (announcements table)    │
        └──────────────────────────┘
```

---

## Estructura de Carpetas

```
karuma-gestion/
├── app/
│   ├── announcements/
│   │   └── page.tsx                    # UI principal
│   ├── my-attendance/
│   │   └── page.tsx                    # Incluye dashboard compañeros
│   └── api/
│       ├── announcements/
│       │   └── me/
│       │       ├── route.ts            # GET/POST
│       │       └── [id]/
│       │           └── route.ts        # PATCH/DELETE
│       └── attendance/
│           └── colleagues/
│               └── route.ts            # GET compañeros
├── lib/
│   ├── announcements/
│   │   ├── repository.ts               # Data access layer
│   │   ├── hooks.ts                    # React hooks
│   │   ├── analytics.ts                # Análisis
│   │   └── types.ts                    # (si se necesita localmente)
│   └── supabase/
│       └── types.ts                    # Tipos DB
├── supabase/
│   └── migrations/
│       └── 023_announcements_and_colleagues.sql
└── components/
    └── portal/
        └── PortalTabs.tsx              # Navegación
```

---

## Flujo de Datos

### Caso 1: Crear Anuncio

```
1. Usuario llena formulario en /announcements
   ↓
2. Componente valida datos localmente
   ↓
3. POST /api/announcements/me
   {
     "title": "...",
     "description": "...",
     "priority": "high"
   }
   ↓
4. API valida autenticación (SESSION_COOKIE)
   ↓
5. API valida permisos (employeeId existe)
   ↓
6. API valida datos
   - title: 1-200 chars
   - description: 1-1000 chars
   - priority: low|normal|high
   ↓
7. createAnnouncement(DbAnnouncementInsert)
   ↓
8. Supabase INSERT announcement
   ↓
9. Retorna DbAnnouncement (con ID, timestamps)
   ↓
10. Frontend actualiza UI
```

### Caso 2: Ver Anuncios

```
1. Usuario accede a /announcements
   ↓
2. useEffect dispara GET /api/announcements/me
   ↓
3. API obtiene employeeId de sesión
   ↓
4. Queries en paralelo:
   - listMyAnnouncements(employeeId)
   - listAnnouncementsByDepartment(department)
   ↓
5. Resultados:
   {
     "myAnnouncements": [...],
     "departmentAnnouncements": [...]  // solo no completados
   }
   ↓
6. Frontend renderiza en dos secciones
```

### Caso 3: Dashboard de Compañeros

```
1. Usuario accede a /my-attendance
   ↓
2. useEffect dispara 2 requests en paralelo:
   - GET /api/attendance/me
   - GET /api/attendance/colleagues
   ↓
3. Ambas validarán autenticación
   ↓
4. /api/attendance/colleagues:
   - Obtiene businessDate
   - Obtiene todos los eventos del día
   - Filtra por departamento del usuario
   - Agrupa por employeeId
   - Devuelve último evento de cada compañero
   ↓
5. Frontend muestra lado a lado:
   - Historial personal (de /api/attendance/me)
   - Dashboard de compañeros (de /api/attendance/colleagues)
```

---

## API Reference

### POST /api/announcements/me

**Crear nuevo anuncio**

```typescript
// Request
POST /api/announcements/me
Content-Type: application/json
Cookie: session_token=...

{
  "title": "Cambio de turno",
  "description": "Necesito cambiar mi turno del viernes...",
  "priority": "high"
}

// Response 201
{
  "id": "uuid",
  "employee_key": "emp_123",
  "employee_name": "Juan García",
  "department": "Sala",
  "title": "Cambio de turno",
  "description": "Necesito cambiar mi turno del viernes...",
  "priority": "high",
  "completed": false,
  "created_at": "2026-07-09T10:30:00Z",
  "updated_at": "2026-07-09T10:30:00Z"
}

// Errores
400 Bad Request
{
  "error": "El título es requerido y debe tener menos de 200 caracteres"
}

401 Unauthorized
{
  "error": "Debes iniciar sesión"
}

503 Service Unavailable
{
  "error": "No se pudo crear el anuncio"
}
```

### GET /api/announcements/me

**Obtener anuncios**

```typescript
// Request
GET /api/announcements/me
Cookie: session_token=...

// Response 200
{
  "myAnnouncements": [
    {
      "id": "uuid",
      "employee_key": "emp_123",
      ...
      "completed": false
    }
  ],
  "departmentAnnouncements": [
    {
      "id": "uuid",
      "employee_key": "emp_456",
      "employee_name": "María López",
      ...
      "completed": false  // Solo no completados
    }
  ]
}
```

### PATCH /api/announcements/me/[id]

**Actualizar anuncio (solo si es tuyo)**

```typescript
// Request
PATCH /api/announcements/me/uuid
Content-Type: application/json
Cookie: session_token=...

{
  "completed": true
  // Opcionales:
  // "title": "...",
  // "description": "...",
  // "priority": "high"
}

// Response 200
{
  "id": "uuid",
  ...
  "completed": true,
  "updated_at": "2026-07-09T11:00:00Z"
}

// Error si no es tuyo
404 Not Found
{
  "error": "Anuncio no encontrado o no tienes permiso"
}
```

### DELETE /api/announcements/me/[id]

**Eliminar anuncio (solo si es tuyo)**

```typescript
// Request
DELETE /api/announcements/me/uuid
Cookie: session_token=...

// Response 200
{
  "ok": true
}
```

### GET /api/attendance/colleagues

**Obtener estado de fichaje de compañeros**

```typescript
// Response 200
{
  "businessDate": "2026-07-09",
  "myDepartment": "Sala",
  "colleagues": [
    {
      "employeeId": "emp_124",
      "employeeName": "María López",
      "department": "Sala",
      "lastType": "in",
      "lastTime": "2026-07-09T12:30:00Z"
    },
    {
      "employeeId": "emp_125",
      "employeeName": "Carlos García",
      "department": "Sala",
      "lastType": "out",
      "lastTime": "2026-07-09T15:45:00Z"
    },
    {
      "employeeId": "emp_126",
      "employeeName": "Ana Martín",
      "department": "Sala",
      "lastType": null,
      "lastTime": null
    }
  ]
}
```

---

## Database Schema

### announcements table

```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_key TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  department TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_announcements_employee_key ON announcements (employee_key);
CREATE INDEX idx_announcements_department ON announcements (department);
CREATE INDEX idx_announcements_created_at ON announcements (created_at DESC);

-- RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_manage_announcements" ON announcements
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

### Queries Comunes

```sql
-- Mis anuncios
SELECT * FROM announcements 
WHERE employee_key = 'emp_123'
ORDER BY created_at DESC;

-- Anuncios no completados del departamento
SELECT * FROM announcements
WHERE department = 'Sala'
  AND completed = false
ORDER BY priority DESC, created_at DESC;

-- Estadísticas
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN completed THEN 1 ELSE 0 END) as completados,
  SUM(CASE WHEN priority = 'high' AND NOT completed THEN 1 ELSE 0 END) as urgentes
FROM announcements
WHERE department = 'Sala'
  AND created_at > NOW() - INTERVAL '30 days';

-- Por prioridad
SELECT priority, COUNT(*) FROM announcements
WHERE department = 'Sala' AND NOT completed
GROUP BY priority;
```

---

## Testing

### Test Unitarios (Ejemplos)

```typescript
// lib/announcements/__tests__/repository.test.ts
import { createAnnouncement, listMyAnnouncements } from '../repository';

describe('Announcement Repository', () => {
  it('should create announcement', async () => {
    const result = await createAnnouncement({
      employee_key: 'emp_123',
      employee_name: 'Test User',
      department: 'Sala',
      title: 'Test',
      description: 'Test description',
      priority: 'normal'
    });
    
    expect(result.id).toBeDefined();
    expect(result.completed).toBe(false);
  });

  it('should filter by department', async () => {
    const results = await listAnnouncementsByDepartment('Sala');
    expect(results.every(a => a.department === 'Sala')).toBe(true);
  });
});
```

### Test de API

```bash
# Crear anuncio
curl -X POST http://localhost:3000/api/announcements/me \
  -H "Content-Type: application/json" \
  -b "session_token=..." \
  -d '{
    "title": "Test",
    "description": "Test description",
    "priority": "high"
  }'

# Obtener anuncios
curl http://localhost:3000/api/announcements/me \
  -b "session_token=..."

# Actualizar
curl -X PATCH http://localhost:3000/api/announcements/me/uuid \
  -H "Content-Type: application/json" \
  -b "session_token=..." \
  -d '{"completed": true}'

# Eliminar
curl -X DELETE http://localhost:3000/api/announcements/me/uuid \
  -b "session_token=..."
```

---

## Deployment

### Pre-requisitos

- [ ] Base de datos Supabase configurada
- [ ] Migración ejecutada (023_announcements_and_colleagues.sql)
- [ ] Variables de entorno configuradas
- [ ] Tests pasando

### Pasos

1. **Ejecutar migración**
   ```bash
   supabase db push
   # O ejecutar SQL en Supabase Dashboard
   ```

2. **Verificar tipos**
   ```bash
   npm run build
   ```

3. **Deploy a producción**
   ```bash
   git push origin main
   # (Auto-deploy via CI/CD)
   ```

4. **Verificar en producción**
   ```bash
   curl https://karuma.app/api/announcements/me -b "session_token=..."
   ```

---

## Contributing

### Agregar Nueva Funcionalidad

1. **Crear rama**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Implementar cambios**
   - Actualizar tipos en `lib/supabase/types.ts`
   - Implementar en repository si usa BD
   - Crear API endpoint si es necesario
   - Actualizar componentes React

3. **Tests**
   ```bash
   npm run test
   npm run build
   ```

4. **Commit**
   ```bash
   git commit -m "feat: add my feature"
   ```

5. **Pull Request**
   - Describe cambios
   - Referencias a issues
   - Screenshots si es UI

### Code Style

- TypeScript con tipado fuerte (sin `any`)
- Componentes funcionales con hooks
- Error handling en APIs
- Loading states en UI
- Nombres en inglés para código

### Performance

- Cache control en APIs
- Queries eficientes en BD
- Debouncing en búsquedas
- Lazy loading de componentes

---

## Troubleshooting Desarrollo

### "Module not found"

```bash
npm install
npm run build
```

### "Port 3000 is in use"

```bash
# Encontrar proceso
lsof -i :3000

# Matar proceso
kill -9 <PID>

# O usar otro puerto
PORT=3001 npm run dev
```

### "Supabase connection failed"

```bash
# Verificar variables de entorno
cat .env.local

# Verificar conectividad
curl https://[PROJECT].supabase.co/rest/v1/announcements \
  -H "apikey: [ANON_KEY]"
```

---

## Recursos

- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

---

**Última actualización**: 2026-07-09  
**Version**: 2.0
