# Karuma ERP — Next Tasks
> Last updated: 2026-07-03. Reservas 1.0 + portal empleado v1 + envío de facturas a asesorías construidos.

## Done since last update (verificado en código)
- ✅ RLS hardening (`004_rls_production.sql`)
- ✅ Auth guard en middleware (dashboard protegido; portal empleado confinado)
- ✅ `cierres_servicio` en el motor de disponibilidad
- ✅ Realtime en mesa-view y lista de reservas
- ✅ Confirmación antes de cancelar
- ✅ Email de confirmación + recordatorio día antes (Resend) + email "Pedir reseña"
- ✅ Login con dos entradas: Empleado·PIN / Oficina
- ✅ Facturas: campo empresa (Kosushi/Spicy), filtro por tienda, envío con un clic a la asesoría (`POST /api/facturas/enviar`, adjuntos vía Resend, confirmación previa, estado "Enviada")
- ✅ NoShow incrementa/decrementa `clientes_reservas.no_shows`
- ✅ Botón "Reseña WhatsApp" para clientes sin email (requiere `google_review_link` en Config)
- ✅ Dashboard: fila "Operativa hoy" (facturas por enviar, fichados ahora, horas trabajadas)

## Pending — manual (no es código)
0. Aplicar `supabase/migrations/011_lista_espera.sql` (lista de espera pública)
1. Aplicar `supabase/migrations/010_turnos.sql` + `npm run seed:turnos` (portal empleado)
2. Configurar `google_review_link` en /dashboard/config (activa reseñas por email y WhatsApp)
3. En Vercel: `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, `RESERVAS_EMAIL_FROM` (o `FACTURAS_EMAIL_FROM`) para el envío de facturas
4. Importar los PDFs de facturas (bucket Supabase `facturas` / Gmail) al archivo web /facturas para poder enviarlos con un clic

## HIGH
5. Reasignar mesa desde la lista de gestión (modal con mesas libres del turno)
6. Fotos en la página pública /reservas (conversión)

## MEDIUM
7. ~~Lista de espera~~ ✅ hecha (pública en /reservas + staff en dashboard, tabla `lista_espera`, migración 011)
8. Historial de visitas por cliente en /dashboard/clientes
9. Estadísticas de origen de reserva (online / teléfono / walk-in)
9b. Ideas CoverManager pendientes: calendario mes completo en /reservas (hoy 7 días), pregunta de alergias como checkbox dedicado, consentimiento marketing (CRM), aviso automático al cliente cuando se libera mesa

## LOW (Phase 3)
10. Editor drag-and-drop del plano (`/dashboard/layout-editor`)
11. Multi-tienda (Kosushi / Spicy / Karuma): selector arriba, datos separados por tienda — el campo `empresa` de facturas ya es la base
12. Portal empleado v2: Nómina / Recetas / Tareas (huecos ya reservados en la nav)

## Technical debt
| Item | File | Notes |
|------|------|-------|
| Walk-in mesa assignment | `app/dashboard/reservas/page.tsx` | Walk-in crea reserva con `mesa_ids: []`; debería llamar `asignarMesa()` |
| Ventas dashboard | `app/dashboard/page.tsx` | Sin POS configurado muestra "—" (ya no números falsos); falta integración RestaurantSuite |
