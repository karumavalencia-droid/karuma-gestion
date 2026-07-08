# 🚀 Guía de Inicio Rápido

**Sistema de Gestión de Proveedores v4.0**

---

## ⚡ 5 Minutos para Empezar

### Paso 1: Acceder al Dashboard
```
URL: http://localhost:3000/admin/dashboard
(En producción: https://karuma-gestion.vercel.app)
```

### Paso 2: Explorar Proveedores
```
/admin/suppliers
├─ Ver lista de proveedores
├─ Agregar nuevo proveedor
└─ Editar productos de proveedor
```

### Paso 3: Ver Analytics
```
/admin/suppliers/analytics
├─ Gastos últimos 6 meses
├─ Pronóstico de costos
└─ Benchmarking con otros proveedores
```

### Paso 4: Centro de Notificaciones
```
/admin/suppliers/notifications
├─ Alertas automáticas
├─ Recomendaciones inteligentes
└─ Configurar preferencias (email, Slack)
```

### Paso 5: Administración
```
/admin/settings
├─ Crear nuevos usuarios
├─ Asignar roles
└─ Ver workflow de aprobación
```

---

## 📊 Dashboard Ejecutivo

**URL:** `/admin/dashboard`

Visualiza en tiempo real:
- 💰 **Gasto Total** — EUR últimos N meses
- 📈 **Tendencia** — ↑↓→ Costos subiendo/bajando
- 💡 **Ahorros Potenciales** — EUR a recuperar
- ⚠️ **Alertas Activas** — Acciones requeridas
- ⭐ **Proveedor Principal** — TOP 1 por volumen
- 💸 **Producto Más Caro** — Oportunidad de negociación

**Selectores:**
- Período: 1, 3, 6, 12 meses
- Filtros: Por proveedor, categoría

---

## 🛒 Gestión de Proveedores

**URL:** `/admin/suppliers`

### Crear Proveedor
```
Click "+ Agregar Proveedor"
├─ Nombre
├─ Contacto
├─ Email
└─ Teléfono
```

### Agregar Productos
```
Seleccionar proveedor → Click en proveedor
├─ Nombre del producto
├─ Cantidad actual
├─ Precio unitario
├─ Unidad (KG, UNIDAD, PAQUETE)
└─ Umbral de stock
```

### Edición Rápida
```
Doble-click en celda → Editar inline
Enter → Guardar automático
Esc → Cancelar
```

### Exportar a CSV
```
Click "⬇️ Exportar"
├─ Abre descarga del navegador
└─ Archivo: proveedores-YYYY-MM-DD.csv
```

---

## 📈 Analytics Avanzado

**URL:** `/admin/suppliers/analytics`

### 1. Resumen de Gastos
```
Tabla histórica 12 meses:
├─ Mes
├─ Cantidad (kg/unidades)
├─ Costo total
└─ Costo promedio/unidad
```

### 2. Pronóstico (3-12 meses)
```
Predicción automática:
├─ Mes próximo
├─ Cantidad estimada
├─ Costo estimado
└─ Confianza del pronóstico (%)
```

**Cómo interpretar:**
- 60-75%: Datos limitados, revisar en 1 mes
- 75-85%: Buena confiabilidad
- 85%+: Excelente, usar para planificación

### 3. Benchmarking
```
Comparar con otros proveedores:
├─ Ranking por costo
├─ Desviación vs promedio
├─ Ahorro potencial
└─ Insights automáticos
```

---

## 🔔 Notificaciones

**URL:** `/admin/suppliers/notifications`

### Tipos de Alertas

1. **📦 Stock Bajo**
   - Se dispara cuando: cantidad < umbral
   - Acción: Hacer pedido urgente

2. **💹 Cambio de Precio**
   - Se dispara cuando: precio sube > 5%
   - Acción: Renegociar con proveedor

3. **📋 Sin Compras Recientes**
   - Se dispara cuando: > 45 días sin compra
   - Acción: Verificar si aún se necesita

### Configurar Preferencias
```
/admin/suppliers/notifications → Preferences
├─ Email Alerts ☑️
├─ Email Forecast Semanal ☑️
├─ Slack Webhook [URL] ☑️
├─ Horario de Silencio 22:00-08:00
└─ Guardar
```

### Recomendaciones Automáticas
```
Analytics → Botón "Generar Recomendaciones"
├─ Negociar descuento por volumen
├─ Consolidar proveedores
├─ Cambiar a proveedor más económico
└─ Renegociar precio
```

---

## 👥 Usuarios y Roles

**URL:** `/admin/settings`

### Crear Usuario
```
Click "+ Nuevo Usuario"
├─ Email: usuario@example.com
├─ Nombre: Juan Pérez
├─ Rol: [admin | manager | buyer | viewer]
└─ Departamento: Compras
```

### Roles Disponibles

| Rol | Permisos | Ideal Para |
|-----|----------|-----------|
| **Admin** 👑 | Acceso total | Director IT |
| **Manager** 📊 | Ver todo, aprobar | Gerente Compras |
| **Buyer** 🛒 | Crear órdenes | Comprador |
| **Viewer** 👁️ | Solo lectura | Analista |

### Workflow de Aprobación
```
Workflow de Aprobación → Sección Pendientes
├─ Orden solicitada por [Usuario]
├─ Botón "Aprobar ✓"
├─ Botón "Rechazar ✗"
└─ Comentar 💬 (opcional)
```

---

## 💾 Órdenes de Compra

### Crear Orden Manual
```
/admin/suppliers → Botón "📋 Órdenes de Compra"
├─ Proveedor
├─ Productos (cantidad, precio)
├─ Total automático
└─ Guardar → Pendiente aprobación
```

### Órdenes Automáticas
```
Sistema detecta stock bajo
        ↓
Genera orden automática
        ↓
Notificación a Manager
        ↓
Manager aprueba en /admin/settings
```

### Programar Reórdenes
```
/admin/suppliers → Producto → "Programar Reorden"
├─ Frecuencia: Semanal, Quincenal, Mensual
├─ Cantidad automática
├─ Umbral de stock
└─ Sistema reordena automáticamente
```

---

## 📊 Reportes y Exportación

### Exportar CSV
```
/admin/suppliers → Botón "⬇️ Exportar"
Descarga: proveedores-YYYY-MM-DD.csv
```

### Reportes PDF
```
/admin/suppliers/analytics → Botón "📄 PDF"
Opciones:
├─ Resumen ejecutivo
├─ Analytics de proveedor
└─ Recomendaciones
```

### Datos Históricos
```
Todas las tablas guardan histórico:
├─ Cambios de precio (cuando/quién/valor anterior)
├─ Cambios de cantidad
├─ Auditoría completa
└─ Exportable para análisis
```

---

## ⚙️ Configuración

### Variables de Entorno
```
.env.local
├─ NEXT_PUBLIC_SUPABASE_URL=
├─ SUPABASE_SERVICE_ROLE_KEY=
├─ NEXT_PUBLIC_SUPABASE_ANON_KEY=
├─ RESEND_API_KEY= (para email)
└─ [Tu servicio de SMS si usas]
```

### Preferencias Globales
```
/admin/settings → System Preferences
├─ Currency: EUR
├─ Timezone: Europe/Madrid
├─ Formato de fecha: DD/MM/YYYY
└─ Idioma: Español
```

---

## 🔍 Búsqueda Rápida

### En cualquier tabla
```
Presionar Ctrl+F (o Cmd+F en Mac)
Escribe: nombre, producto, proveedor
Filtra resultados en tiempo real
```

### Filtros Avanzados
```
Analytics → Filtrar por:
├─ Período (1, 3, 6, 12 meses)
├─ Proveedor
├─ Categoría de producto
└─ Rango de precio
```

---

## 📱 Acceso Móvil

**Responsive Design** — Funciona en tablet y móvil

```
/admin/dashboard → Adaptado a mobile
├─ KPIs apilados verticalmente
├─ Tablas con scroll horizontal
└─ Botones grandes y accesibles
```

---

## 🆘 Troubleshooting

### "Acceso denegado"
```
✓ Verifica tu rol en /admin/settings
✓ Contacta al Admin si necesitas permisos
```

### "No se actualizan los datos"
```
✓ Refresca la página (F5)
✓ Borra caché (Ctrl+Shift+Delete)
✓ Cierra sesión y vuelve a entrar
```

### "Error al exportar"
```
✓ Verifica que haya datos en la tabla
✓ Intenta con período más pequeño
✓ Contacta a IT si persiste
```

---

## 💬 Soporte

### Centro de Ayuda
```
Email: karumavalencia@gmail.com
Docs: Vea RESUMEN_FINAL_v4.md
Issues: GitHub Issues
```

### Videos de Tutorial
```
Coming soon en:
├─ YouTube
├─ Confluence
└─ Wiki interno
```

---

## 🎯 Checklist de Primeros Pasos

- [ ] Accedí a /admin/dashboard
- [ ] Exploré /admin/suppliers
- [ ] Vi datos en analytics
- [ ] Configuré notificaciones
- [ ] Invité a un usuario
- [ ] Creé primer reporte
- [ ] Probé búsqueda
- [ ] Descargué CSV

**¡Felicidades! Ya conoces el 80% del sistema.** 🎉

El 20% restante aprenderás conforme lo uses.

---

**Última actualización:** 2026-07-08
**Versión:** 4.0
**Enviado por:** Karuma ERP Team
