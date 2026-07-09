# 📋 Sistema de Anuncios y Dashboard de Compañeros - Guía Completa

## 📚 Tabla de Contenidos
1. [Descripción General](#descripción-general)
2. [Características](#características)
3. [Guía del Usuario](#guía-del-usuario)
4. [Guía Técnica](#guía-técnica)
5. [Configuración](#configuración)
6. [Troubleshooting](#troubleshooting)

---

## 📖 Descripción General

Este documento describe las nuevas funcionalidades agregadas al Portal del Empleado de Karuma:

### 🔵 1. Dashboard de Compañeros (打卡看板)
Visualización en tiempo real de quién ha fichado en tu departamento hoy.

### 🟡 2. Sistema de Anuncios (公告栏)
Plataforma para compartir tareas y prioridades con tu equipo departamental.

---

## ✨ Características

### Dashboard de Compañeros
- ✅ Vista en tiempo real del estado de fichaje
- ✅ Filtrado automático por departamento
- ✅ Indicadores visuales (colores)
- ✅ Actualización en vivo
- ✅ Funciona en móvil y desktop

### Sistema de Anuncios
- ✅ Crear anuncios con prioridad
- ✅ Ver anuncios del departamento
- ✅ Marcar como completado
- ✅ Eliminar anuncios propios
- ✅ Búsqueda y filtrado
- ✅ Estadísticas en tiempo real
- ✅ Historial de anuncios

---

## 👥 Guía del Usuario

### Para Ver el Dashboard de Compañeros

1. **Acceso**
   - Ve a la página "Mi fichaje" (`/my-attendance`)
   - Desplázate hacia abajo después del botón de fichaje
   - Verás la sección "Compañeros"

2. **Información Mostrada**
   - Nombre de cada compañero
   - Última acción (Entrada/Salida)
   - Hora exacta del último fichaje
   - Indicador de estado (●)

3. **Indicadores de Color**
   - 🟢 Verde: Entraron (actualmente en turno)
   - 🟡 Amarillo: Salieron (ya se fueron)
   - ⚫ Gris: No han fichado aún

4. **Actualizar Datos**
   - Click en el botón Actualizar (🔄)
   - Se carga la información más reciente

### Para Usar el Sistema de Anuncios

#### Crear un Anuncio

1. **Acceso**
   - Click en la pestaña "Anuncios" del menú inferior
   - O ve a `/announcements`

2. **Crear Nuevo**
   - Click en "Nuevo anuncio"
   - Se abre un formulario

3. **Llenar el Formulario**
   ```
   Título (ej: "Cambio de turno")
   - Máximo 200 caracteres
   - Sé conciso y descriptivo
   
   Descripción (ej: "Pasaré mi turno del viernes...")
   - Máximo 1000 caracteres
   - Explica qué necesitas que hagan
   
   Prioridad
   - Baja: Tarea normal, sin urgencia
   - Normal: Tarea estándar
   - Alta: Urgente, requiere atención inmediata
   ```

4. **Publicar**
   - Click en "Publicar anuncio"
   - Aparecerá en "Mis anuncios"
   - Los compañeros lo verán en "Anuncios del departamento"

#### Ver Anuncios

La página de Anuncios tiene dos secciones:

1. **Mis Anuncios**
   - Todos los anuncios que creaste
   - Completados y pendientes
   - Opciones: ✓ Completar, 🗑️ Eliminar

2. **Anuncios del Departamento**
   - Anuncios de compañeros (sin completar)
   - Ordenados por prioridad (Alta → Normal → Baja)
   - Solo lectura (no puedes editarlos)

#### Completar un Anuncio

1. Encuentra tu anuncio en "Mis anuncios"
2. Click en el botón ✓ (círculo verde)
3. El anuncio se marca como completado
4. Desaparece de "Anuncios del departamento"
5. Permanece en "Mis anuncios" para referencia

#### Eliminar un Anuncio

1. Encuentra tu anuncio en "Mis anuncios"
2. Click en el botón 🗑️ (papelera roja)
3. Confirma que quieres eliminarlo
4. Se elimina permanentemente

---

## 🔧 Guía Técnica

### Arquitectura

```
Frontend (React)
    ↓
API REST (/api/announcements/me, /api/attendance/colleagues)
    ↓
Database (Supabase - announcements table)
    ↓
Repository Layer (lib/announcements/repository.ts)
```

### Archivos Principales

```
app/announcements/page.tsx          ← Página principal de anuncios
app/my-attendance/page.tsx          ← Página con dashboard de compañeros
app/api/announcements/me/route.ts   ← API GET/POST anuncios
app/api/announcements/me/[id]/route.ts ← API PATCH/DELETE anuncios
app/api/attendance/colleagues/route.ts ← API GET compañeros
lib/announcements/repository.ts     ← Acceso a base de datos
lib/announcements/hooks.ts          ← Hooks de React personalizados
lib/announcements/analytics.ts      ← Estadísticas y análisis
lib/supabase/types.ts               ← Tipos TypeScript
supabase/migrations/023_announcements_and_colleagues.sql ← Migración BD
```

### Flujo de Datos

#### Para Anuncios

```
USER
  ↓ (click en "Nuevo anuncio")
Frontend (announcements/page.tsx)
  ↓ (POST request)
API (/api/announcements/me)
  ↓ (validación de auth)
Repository (createAnnouncement)
  ↓ (SQL INSERT)
Database (announcements table)
  ↓ (response)
Frontend
  ↓ (reload)
USER ve su anuncio
```

#### Para Dashboard de Compañeros

```
USER accede a /my-attendance
  ↓
Frontend hace 2 requests en paralelo
  ├─→ GET /api/attendance/me (sus datos)
  └─→ GET /api/attendance/colleagues (compañeros)
      ↓ (validación)
      Repository (listAttendanceEvents)
      ↓ (filtrado por departamento)
      Database (attendance_events table)
      ↓
Frontend muestra ambos datos
```

### API Endpoints

#### GET /api/announcements/me
```
Parámetros: ninguno
Headers: Cookie (session)
Respuesta:
{
  "myAnnouncements": [DbAnnouncement[]],
  "departmentAnnouncements": [DbAnnouncement[]]
}
Errores:
- 401: No autenticado
- 403: No es empleado
- 503: Error de BD
```

#### POST /api/announcements/me
```
Body:
{
  "title": "string (1-200)",
  "description": "string (1-1000)",
  "priority": "low|normal|high"
}
Respuesta: DbAnnouncement (nuevo)
Errores:
- 400: Datos inválidos
- 401: No autenticado
- 403: No es empleado
```

#### PATCH /api/announcements/me/[id]
```
Body: Parcial
{
  "completed": boolean?,
  "title": string?,
  "description": string?,
  "priority": "low|normal|high"?
}
Respuesta: DbAnnouncement (actualizado)
Errores:
- 400: Datos inválidos
- 404: Anuncio no encontrado o no es tuyo
```

#### DELETE /api/announcements/me/[id]
```
Respuesta: { "ok": true }
Errores:
- 404: Anuncio no encontrado
```

#### GET /api/attendance/colleagues
```
Respuesta:
{
  "businessDate": "2026-07-09",
  "myDepartment": "Sala",
  "colleagues": [
    {
      "employeeId": "1",
      "employeeName": "Juan Pérez",
      "department": "Sala",
      "lastType": "in",
      "lastTime": "2026-07-09T10:30:00Z"
    }
  ]
}
```

### Tipos TypeScript

```typescript
// Anuncio
interface DbAnnouncement {
  id: string;
  employee_key: string;
  employee_name: string;
  department: string;
  title: string;
  description: string;
  priority: "low" | "normal" | "high";
  completed: boolean;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

// Compañero
interface ColleagueAttendance {
  employeeId: string;
  employeeName: string;
  department: string;
  lastType: "in" | "out" | null;
  lastTime: string | null;
}
```

### Hooks Disponibles

```typescript
// Refrescar automáticamente cada N ms
useAnnouncementRefresh(interval: number)

// Obtener estadísticas
useAnnouncementStats(announcements: DbAnnouncement[])

// Agrupar por prioridad
groupAnnouncementsByPriority(announcements: DbAnnouncement[])

// Ordenar por fecha
sortAnnouncementsByDate(announcements: DbAnnouncement[])

// Buscar
filterAnnouncementsBySearch(announcements: DbAnnouncement[], query: string)
```

---

## ⚙️ Configuración

### Cambiar Límites de Caracteres

Editar `/app/api/announcements/me/route.ts`:

```typescript
// Línea ~77
const MAX_TITLE_LENGTH = 200;        // Cambiar a tu límite
const MAX_DESCRIPTION_LENGTH = 1000; // Cambiar a tu límite
```

### Cambiar Colores de Prioridad

Editar `/app/announcements/page.tsx`:

```typescript
// Línea ~31
const priorityConfig = {
  low: { color: "bg-blue-50 text-blue-700", label: "Baja" },
  normal: { color: "bg-gray-50 text-gray-700", label: "Normal" },
  high: { color: "bg-red-50 text-red-700", label: "Alta" },
};
```

### Cambiar Intervalo de Actualización

Editar `/app/announcements/page.tsx`:

```typescript
// En el componente, cambiar fetch
const load = useCallback(async () => {
  // Cambiar cache-control
  const response = await fetch("/api/announcements/me", {
    cache: "no-store", // o "no-cache"
  });
```

### Agregaciones Personalizadas

Crear nuevas estadísticas en `/lib/announcements/analytics.ts`:

```typescript
export function myCustomMetric(announcements: DbAnnouncement[]) {
  // Tu lógica aquí
}
```

---

## 🆘 Troubleshooting

### "No se pudo cargar los anuncios"

**Causas posibles:**
1. ❌ No estás autenticado
2. ❌ Tu cuenta no está vinculada a un empleado
3. ❌ La BD está caída
4. ❌ Problema de red

**Soluciones:**
```bash
# 1. Verifica la consola del navegador (F12)
# 2. Comprueba que estés logueado
# 3. Revisa el estado de Supabase
# 4. Intenta actualizar la página
```

### "No puedo ver anuncios del departamento"

**Causas:**
1. ❌ Los compañeros no han creado anuncios
2. ❌ Todos los anuncios están completados
3. ❌ No eres del mismo departamento

**Soluciones:**
- Crea un anuncio de prueba
- Pide a un compañero que cree uno
- Verifica tu departamento en la BD

### "Botón de Nuevo anuncio no funciona"

**Causas:**
1. ❌ JavaScript deshabilitado
2. ❌ Caché del navegador
3. ❌ Problemas de formulario

**Soluciones:**
```bash
# 1. Recarga la página (Ctrl+F5 / Cmd+Shift+R)
# 2. Limpia la caché (Dev Tools > Storage > Clear)
# 3. Prueba en otro navegador
```

### "Cambios no aparecen"

**Causas:**
1. ❌ Caché del navegador
2. ❌ Necesita refrescar
3. ❌ Sincronización lenta

**Soluciones:**
- Click en el botón 🔄 Actualizar
- Espera unos segundos
- Recarga la página completa

### "Solo veo mis anuncios, no los del departamento"

**Verificar:**
```sql
-- En Supabase SQL Editor
SELECT * FROM announcements 
WHERE department = 'Sala' 
AND completed = false 
LIMIT 10;
```

Si no hay anuncios, es normal. Pide a colegas que creen algunos.

---

## 📊 Estadísticas y Análisis

### Ver Estadísticas

Las estadísticas están disponibles mediante hooks:

```typescript
import { useAnnouncementStats } from "@/lib/announcements/hooks";

const stats = useAnnouncementStats(announcements);
console.log(stats);
// {
//   total: 15,
//   highPriority: 3,
//   completed: 8,
//   pending: 7
// }
```

### Tendencias

```typescript
import { getAnnounceementTrends } from "@/lib/announcements/analytics";

const trends = getAnnounceementTrends(announcements, 30);
// { "2026-07-09": 5, "2026-07-08": 3, ... }
```

---

## 🔐 Seguridad y Privacidad

### Permisos

- ✅ **Crear anuncios**: Solo tú
- ✅ **Editar/Eliminar**: Solo tus anuncios
- ✅ **Ver anuncios**: Solo tu departamento
- ✅ **Filtrado automático**: Por API

### Datos No Compartidos

- ❌ Anuncios de otros departamentos
- ❌ Fichajes de otros departamentos
- ❌ Datos personales de otros usuarios

---

## 📱 Compatibilidad

| Dispositivo | Compatibilidad | Notas |
|-------------|---|---|
| iPhone | ✅ Completa | Safari, Chrome, Firefox |
| Android | ✅ Completa | Chrome, Firefox |
| iPad | ✅ Completa | Safari, Chrome |
| Desktop | ✅ Completa | Todos los navegadores |
| Tablet | ✅ Completa | Todos los navegadores |

---

## 🚀 Próximas Mejoras Planeadas

- [ ] Notificaciones push
- [ ] Comentarios en anuncios
- [ ] @menciones
- [ ] Adjuntos/imágenes
- [ ] Historial completo
- [ ] Exportar a PDF
- [ ] Integración con Slack
- [ ] Recordatorios automáticos

---

## 📞 Soporte

Para problemas:
1. Revisa esta guía
2. Consulta la sección Troubleshooting
3. Revisa los logs del navegador (F12)
4. Contacta al equipo de desarrollo

---

**Última actualización**: 2026-07-09  
**Versión**: 2.0  
**Autor**: Claude Code + Karuma Team
