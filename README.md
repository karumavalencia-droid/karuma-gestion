# Karuma ERP 1.0

Sistema ERP interno para **Karuma Sushi & Grill** — restaurante buffet japonés en Valencia (Ruzafa).

## Tecnologías

- Next.js 15 (App Router)
- TypeScript
- TailwindCSS
- Lucide React

## Módulos

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Dashboard | `/dashboard` | Ventas, clientes, delivery, alertas |
| Pedidos | `/pedidos` | Mesa, delivery, estados en tiempo real |
| Inventario | `/inventario` | Stock, categorías, movimientos |
| Personal | `/personal` | Empleados, turnos, nómina estimada |
| Finanzas | `/finanzas` | Ingresos, gastos, IVA, comisiones |
| Marketing | `/marketing` | Promociones, ads, redes sociales |
| Cocina | `/cocina` | Recetas, Rational, Pira, fichas de coste |
| Configuración | `/configuracion` | Restaurante, usuarios, notificaciones |

## Instalación

```bash
cd ~/Projects/karuma-gestion
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Componentes reutilizables

- `Sidebar` — Navegación lateral (móvil + escritorio)
- `Header` — Cabecera con menú hamburguesa
- `StatCard` — Tarjetas de estadísticas
- `DataTable` — Tablas con vista móvil en tarjetas
- `StatusBadge` — Badges de estado

## Notas

- Datos simulados en `lib/data/`
- Rutas legacy (`/productos`, `/empleados`, etc.) siguen funcionando
- Diseño mobile-first, interfaz en español
