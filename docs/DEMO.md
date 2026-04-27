# 🎤 Guía rápida para la demo

Todo lo que necesitas para mostrar la app en una entrevista. Las 3 rutas, las credenciales, qué demostrar en cada una y la "story" para vender.

---

## ⚡ Setup en 30 segundos antes de la demo

```bash
# Asegurate que la DB esté corriendo y reseteada
npx prisma migrate deploy
npx prisma db seed     # carga datos demo (idempotente, no rompe nada)
npm run dev            # arranca el server en http://localhost:3000
```

**Verifica que está OK:** abrí `http://localhost:3000/mi-barberia` — deberías ver la landing pública del negocio.

---

## 🔑 Credenciales (copiá-pegá)

| Rol         | Email                  | Password      | Ruta de login |
|-------------|------------------------|---------------|---------------|
| SuperAdmin  | `super@marbrava.cl`    | `Super1234!`  | `/login` |
| **Admin**   | `admin@barberia.cl`    | `Admin1234!`  | `/login` |
| **Barbero** | `daniel@barberia.cl`   | `Barber1234!` | `/login` |
| Barbero #2  | `juan@barberia.cl`     | `Barber1234!` | `/login` |
| Cliente     | `carlos@gmail.com`     | `Client1234!` | (no necesita login para reservar) |

**Slug del negocio:** `mi-barberia`
**Sucursal:** Sede Central — Av. Providencia 1234, Santiago
**Horario:** Lun–Sáb 09:00–20:00

---

## 🎯 Las 3 rutas para probar (en orden recomendado)

### 1️⃣ CLIENTE — Reservar una hora (sin login)
**URL:** http://localhost:3000/mi-barberia/book

**Qué mostrar (5 min):**
1. **Landing del negocio** primero: `http://localhost:3000/mi-barberia`
   - Hero con logo/descripción, lista de barberos con sus servicios, mapa, QR para compartir, botón WhatsApp directo.
2. Click en **"Reservar hora"** → entra al flujo de 4 pasos.
3. **Paso 1 — Servicio:** elegí "Corte Clásico" ($12.000, 45 min).
4. **Paso 2 — Fecha + barbero:**
   - Mostrá el botón **"⚡ Próximo disponible"** (atajo, agarra el slot más cercano).
   - Mostrá el **heatmap** debajo de las fechas (puntos verde/amarillo/rojo) + leyenda.
   - Elegí una fecha → aparecen los barberos con disponibilidad.
   - Mostrá el botón **"Cualquier disponible"** (load-balancing entre barberos).
   - Auto-selecciona si solo hay 1 barbero con cupos.
5. **Paso 3 — Horario:**
   - Mostrá los filtros **🌅 Mañana / ☀️ Tarde / 🌙 Noche** con contadores.
   - Skeletons de loading bonitos (no texto plano).
6. **Paso 4 — Confirmar:**
   - El input de teléfono se **auto-formatea** mientras tipeás (`+56 9 1234 5678`).
   - Validación inline: si dejás `12345` ves error rojo.
   - Mostrá el campo **"Mensaje al barbero"** (ej: "vengo apurado").
7. **Confirmación:**
   - Status badge ("Reserva recibida — pendiente de confirmar").
   - Botón **"Agregar a Google Calendar"** (abre Google con todo prellenado).
   - Botón **"Descargar .ics"** (Apple Calendar / Outlook).
   - Botón **"Compartir reserva"** (Web Share en mobile, copia link en desktop).
   - Mini-mapa + "Cómo llegar" (Google Maps Directions).

**El elevator pitch para esta sección:**
> *"Es como Booksy/Fresha pero adaptado al mercado chileno. El cliente no necesita registrarse, valida teléfono chileno, agarra el slot más cercano de un click, y al final se sincroniza con su calendario. Esto es lo que más mueve la aguja en conversión."*

---

### 2️⃣ BARBERO — Su agenda + reportes
**URL:** http://localhost:3000/login → `daniel@barberia.cl` / `Barber1234!`

Te redirige automáticamente a `/barber`.

**Qué mostrar (5 min):**
1. **Topbar con greeting personalizado** ("Buenos días, Daniel").
2. **Card "Tu mes":** comisión acumulada, ingresos, propinas, ticket promedio, deltas vs mes anterior.
3. **Card "Próximas citas":** las 3 que vienen, con tiempo relativo ("en 2h").
4. **Calendario** (FullCalendar):
   - Vista semanal por default, día en mobile.
   - Click en un evento → modal de detalle con toda la info del cliente.
5. **Modal de cita** (mostrá el flujo completo):
   - Datos del cliente (nombre, teléfono con link WhatsApp).
   - **Mensaje del cliente** (azul, lo que dejó al reservar).
   - **Nota interna del equipo** (ámbar, editable, con historial de notas pasadas del cliente — *"Juan pidió tapper fade la última vez"*).
   - Botones de status granular: **Marcar llegó → Empezar corte → Completar** con modal de pago + propina + método (efectivo/débito/crédito/transferencia).
   - Cancelar con motivo.
6. **Sidebar con mini-calendarios** (en desktop): 2 calendarios para navegar entre meses.
7. **Búsqueda Ctrl+K:** abrí con el atajo, buscá un cliente, ves su historial de notas.
8. **Editar perfil:** botón en la toolbar, podés cambiar tu teléfono y color del calendario.
9. **Reporte personal:** click en pestaña "Reportes" del topbar → `/barber/reports`:
   - 4 KPI cards: Comisión, Ingresos, Ticket promedio, Propinas.
   - 3 mini cards: próximas, canceladas (% rate), no-show (% rate).
   - Gráfico de barras de ingresos diarios con tooltip al hover.
   - Top 5 servicios más vendidos.
   - Pills de período: Hoy / Semana / Mes / Año.

**El elevator pitch:**
> *"El barbero ve solo lo suyo — sus citas, sus clientes, sus números. La nota interna le permite recordar preferencias del cliente entre visitas. El reporte personal es lo que normalmente solo el dueño ve — acá empoderamos al barbero con sus métricas para que sepa cómo le va y trabaje mejor."*

---

### 3️⃣ ADMIN — Panel completo del negocio
**URL:** http://localhost:3000/login → `admin@barberia.cl` / `Admin1234!`

Te redirige a `/admin`.

**Qué mostrar (10 min):**
1. **`/admin` — Agenda global:**
   - Calendario con TODAS las citas de TODOS los barberos.
   - Crear cita: click en un slot vacío → modal de nueva reserva con cliente nuevo o existente.
   - Drag-to-reschedule: arrastrá una cita a otro horario, valida overlap automáticamente.
   - Filtros por barbero/sucursal arriba.

2. **`/admin/branches` — Sucursales:**
   - Lista de sucursales con dirección, teléfono, lat/long para mapa.
   - Editar horario de atención por día (Lun-Dom).

3. **`/admin/barbers` — Barberos:**
   - Cards de cada barbero con avatar, color, sucursal, comisión.
   - Click → editar: foto, color, comisión (% o fija), servicios que ofrece, horario semanal por día.
   - **Schedule editor:** marcar días que trabaja + horarios start/end por día.

4. **`/admin/services` — Servicios y categorías:**
   - Lista agrupada por categoría con drag-to-reorder.
   - Editar nombre/duración/precio.

5. **`/admin/clients` — CRM de clientes:**
   - Lista con visitas, total gastado, última visita.
   - Click en un cliente → su perfil con timeline de todas sus citas pasadas + notas del equipo.

6. **`/admin/reports` — Reportes globales:**
   - KPI cards (revenue total, comisiones pagadas, citas totales, etc).
   - Bar chart de revenue por barbero.
   - Top servicios.
   - Daily revenue chart.
   - Botón "Exportar CSV".

7. **`/admin/integrations` — API + Webhooks:**
   - Generar API keys para integrar con sistemas externos.
   - Configurar webhooks (cita creada/completada/cancelada).
   - Probar webhook con botón "Test".

8. **`/admin/settings` — Configuración del negocio:**
   - Editar nombre/logo/descripción de la org.
   - Configurar fidelización (puntos por compra).

9. **`/admin/profile` — Tu perfil:**
   - Cambiar contraseña.
   - Datos personales.

**El elevator pitch:**
> *"El admin tiene el control total: agenda multi-barbero, gestión de sucursales/servicios/barberos, CRM de clientes con historial, reportes con export CSV, integraciones via API + webhooks. Todo lo que un dueño de barbería necesita para operar."*

---

## 🎬 Demo flow recomendado (15 min total)

1. **Arrancá con el cliente** (impacto visual, fácil de seguir): 5 min
2. **Pasá al barbero** (mostrá la profundidad operativa): 5 min
3. **Cerrá con el admin** (mostrá la potencia del backend): 5 min

> **Tip:** abrí 3 ventanas/pestañas con cada rol logueado antes de la entrevista. Así no perdés tiempo con logins y podés saltar entre roles fluido.

---

## 🛡️ Cosas técnicas para mencionar si te preguntan

- **Stack:** Next.js 16 (App Router), React 19, TypeScript, Prisma + PostgreSQL, Tailwind CSS 4, FullCalendar.
- **Auth:** JWT firmado con `jose`, en cookie HTTP-only `bb_session`, expira en 7 días.
- **Multi-tenant:** preparado vía `Organization` + `slug`. Hoy single-tenant pero el schema lo soporta.
- **Validación de slots:** función central `validateAppointmentSlot` que verifica schedule del barbero + horario sucursal + overlap citas + overlap bloqueos. Atómica dentro de transacción Prisma.
- **Tests:** 119 tests pasando (Vitest). Cobertura sobre helpers críticos (validación de slots, formato teléfono, calendar export, etc).
- **TZ-aware:** `instrumentation.ts` setea `TZ=America/Santiago` en boot para evitar bugs de horario en deploy a UTC.
- **Performance:** queries con batch fetch (no N+1), caché de slug→orgId en memoria.
- **Mobile UX:** 100/100 — bottom-sheet modals, safe-area insets, scroll-margin para teclado virtual, máscaras de input.
- **Push notifications:** Notification API client-side (sin service worker) para recordatorios al barbero 15 min antes.

---

## 🚨 Si algo se rompe en vivo

| Problema | Solución rápida |
|---|---|
| "Cargando..." infinito en `/mi-barberia` | DB no corriendo. Levantar con `docker compose up -d postgres` o tu setup. |
| Login no funciona | Verificar que el seed corrió. `npx prisma db seed`. |
| No aparecen citas | Verificá que la fecha actual no sea domingo (el seed sume Lun-Sáb). |
| Calendario vacío en `/admin` | Crear una cita de prueba haciendo click en un slot. |
| Error 500 | Mirá la consola del `npm run dev`. Probablemente DB desconectada. |

---

## 📁 Otros documentos útiles

- `docs/README.md` — visión general del producto
- `docs/ARCHITECTURE.md` — decisiones técnicas y estructura
- `docs/API.md` — referencia de endpoints
- `docs/DATABASE.md` — modelos y relaciones
- `docs/FEATURES.md` — lista completa de features
- `docs/DEPLOYMENT.md` — cómo deployar a producción

¡Éxito mañana! 🚀
