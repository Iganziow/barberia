# Features

Lista completa agrupada por audiencia.

---

## 🌐 Cliente final (sin login)

### Landing del negocio (`/{slug}`)
- Hero con logo, nombre, descripción del negocio
- Lista de profesionales con avatar, color, sus servicios y horarios
- Servicios agrupados por categoría (colapsables)
- Schedule de atención (Lun-Dom)
- Botón directo de WhatsApp
- Mapa Google embed con dirección
- QR code generado para compartir
- CTA "Reservar hora" en hero, sticky en navbar, inline en cada servicio
- OG metadata (preview en WhatsApp/IG cuando se comparte)
- Página 404 amigable si el slug no existe

### Flujo de reserva (`/{slug}/book`)
**Paso 1 — Servicio:**
- Selector de sucursal (solo aparece si hay 2+, auto-selecciona si hay 1)
- Lista de servicios con duración + precio
- Skeleton loading bonito
- Empty state si no hay servicios reservables

**Paso 2 — Fecha + barbero:**
- ⚡ Atajo "Próximo disponible" (encuentra el slot más cercano automáticamente)
- Carrusel de 14 días con heatmap (puntos verde/amarillo/rojo según disponibilidad)
- Leyenda explicativa del heatmap
- Lista de barberos con count de horarios disponibles
- Botón "Cualquier disponible" cuando hay 2+ barberos (load balancing automático)
- Auto-selecciona si solo hay 1 barbero con cupos
- Filtra solo barberos que ofrezcan el servicio elegido

**Paso 3 — Horario:**
- Grid de slots con filtros 🌅 Mañana / ☀️ Tarde / 🌙 Noche con contadores
- Si no hay slots: lista de espera con captura de teléfono
- Empty state con sugerencia de probar otro día

**Paso 4 — Confirmar:**
- Resumen completo de la reserva
- Input de nombre, teléfono, email opcional
- **Máscara automática de teléfono chileno** (+56 9 1234 5678)
- Validación inline con mensaje de error
- Campo opcional "Mensaje al barbero"
- Botón Confirmar deshabilitado si datos inválidos

### Confirmación (`/{slug}/book/confirmation?id=...`)
- Status badge dinámico (Recibida / Confirmada / Cancelada)
- Detalle completo de la reserva
- Tarjeta con dirección + mini-mapa embed
- Botón "Cómo llegar" (Google Maps Directions)
- 🗓️ Botón "Agregar a Google Calendar"
- 📥 Botón "Descargar .ics" (Apple Calendar / Outlook)
- 📤 Botón "Compartir reserva" (Web Share API en mobile, copia link en desktop)
- 📞 Botón "Contactar por WhatsApp"

---

## ✂️ Barbero (rol BARBER)

### Dashboard (`/barber`)
- Topbar con greeting personalizado según hora ("Buenos días/tardes/noches")
- Card "Tu mes": comisión acumulada, ingresos, propinas, ticket promedio + delta vs mes anterior
- Card "Próximas citas": las 3 que vienen con tiempo relativo
- Filtro pills: Todas / Activas / Pendientes / Completadas
- Calendario FullCalendar (semana en desktop, día en mobile)
- Sidebar con 2 mini-calendarios para navegación rápida (desktop)
- Vista alternativa: lista
- Botón flotante (FAB) para crear bloqueo
- Picker de granularidad de slots (5/15/30/60 min)

### Modal de detalle de cita
- Datos del cliente con link directo a WhatsApp (tel:)
- **Mensaje del cliente** (azul) — lo que dejó al reservar
- **Nota interna** (ámbar) — editable, persiste entre visitas
- **Historial de notas pasadas** del cliente con este barbero — *"Juan pidió tapper fade en su última visita"*
- Status flow granular con botones de color:
  - Marcar llegó → Empezar corte → Completar
  - No asistió
  - Cancelar con motivo (textarea)
- Modal de pago al completar: monto, propina, método (5 opciones grandes táctiles)
- Atómico: status + pago + nota se guardan en una sola transacción

### Búsqueda Ctrl+K
- Modal con búsqueda fuzzy de clientes propios
- Debounce + AbortController para evitar race conditions
- Expandir un cliente muestra sus notas pasadas

### Editar perfil
- Cambiar teléfono y color del calendario
- Sin cambiar email (lock)

### Reportes (`/barber/reports`)
- Pills de período: Hoy / Semana / Mes / Año
- 4 KPI cards: Comisión / Ingresos / Ticket promedio / Propinas
- 3 mini cards: Próximas / Canceladas (con %) / No-show (con %)
- Bar chart de ingresos diarios con tooltip al hover
- Top 5 servicios más vendidos con ranking circular
- Deltas vs período anterior

### Notificaciones push
- Recordatorio 15 min antes de cada cita (Notification API client-side)
- Pide permiso solo una vez

---

## 👨‍💼 Admin (rol ADMIN)

### Agenda global (`/admin`)
- Calendario multi-barbero con código de color
- Filtros por barbero/sucursal
- Crear cita: click en slot vacío → modal con cliente nuevo o existente
- Drag-to-reschedule con validación atómica (overlap, schedule, bloqueos)
- Resize para extender duración
- Vistas: día, semana, mes, lista
- Vista por barbero (columnas) o agrupada
- Detección de conflictos visual

### Sucursales (`/admin/branches`)
- Lista con dirección, teléfono, lat/long
- Editar working hours por día
- Crear/desactivar sucursales

### Barberos (`/admin/barbers`)
- Cards con avatar, color, sucursal asignada, comisión
- Editar perfil completo: foto, nombre, teléfono, color, comisión (% o $)
- Servicios asignados con drag-to-reorder
- Schedule editor por día (start/end por dayOfWeek)
- Activar/desactivar

### Servicios (`/admin/services`)
- Lista agrupada por categoría
- Drag-to-reorder dentro y entre categorías
- Editar nombre/duración/precio/descripción
- CRUD de categorías
- Soft delete (active: false)

### Clientes (`/admin/clients`)
- Lista con stats: visitas, total gastado, última visita
- Búsqueda y filtros
- Ficha individual con timeline de citas + notas internas

### Reportes (`/admin/reports`)
- Pills de período
- KPI cards globales (revenue, comisiones, citas, ticket promedio)
- Bar chart de revenue por barbero
- Top servicios
- Daily revenue chart
- Export CSV

### Integraciones (`/admin/integrations`)
- API keys con scopes y rotación
- Webhooks con secret HMAC
- Botón "Test webhook" que envía evento de prueba
- Lista de eventos disponibles

### Configuración (`/admin/settings`)
- Datos del negocio (nombre, logo, descripción, contacto)
- Configuración de fidelización
- Working hours globales

### Perfil (`/admin/profile`)
- Cambiar contraseña
- Datos personales

### Lista de espera (`/admin/waitlist`)
- Notificar/cancelar entradas
- Marcar como atendido

---

## 👑 SuperAdmin (rol SUPERADMIN)

### Dashboard (`/superadmin`)
- Métricas globales del SaaS

### Organizaciones (`/superadmin/organizations`)
- Listar todas las orgs cliente
- Crear nueva organización
- Activar/desactivar
- Estadísticas por org

---

## 🛠️ Features técnicas (transversales)

- **Validación central de slots:** schedule + horario sucursal + overlap citas + overlap bloqueos, atómica en transacción
- **TZ-aware:** boot con `TZ=America/Santiago` automático
- **Multi-tenant ready:** schema soporta N organizaciones
- **Push notifications:** sin service worker (Notification API)
- **Mobile UX 100/100:** bottom-sheet modals, safe-area, scroll-margin
- **Tablet UX 100/100:** sidebar adaptativo desde `md:`
- **A11y:** aria-busy, aria-live, aria-pressed, role="alert"
- **Performance:** batch queries, no N+1, `select` explícito
- **Race condition safe:** transacciones atómicas, retry automático en 409
- **Email confirmation:** Resend integration (configurable)
- **Webhooks:** salientes con HMAC signature + replay-attack protection
- **Rate limiting:** 10 reservas/min/IP, 5 waitlist/min/IP
- **Tests:** 119 unit tests + e2e con Playwright
- **PWA-ready:** offline page, manifest

---

## 📱 Responsive

| Breakpoint | Comportamiento |
|---|---|
| < 360px | Stepper sin labels, layout 1-col |
| 360–640px | Mobile estándar, FAB, bottom-sheet |
| 640–768px | Tablet portrait, formularios 2-col |
| ≥ 768px | Sidebar de mini-calendarios visible |
| ≥ 1024px | Sidebar full, grid 4-col en cards |

---

## 🌎 Internacionalización

- Hoy: español (Chile) hardcoded
- Locales en `Intl.DateTimeFormat("es-CL")` para fechas
- `formatCLP()` para moneda
- Validación de teléfono chileno con `+56 9 XXXX XXXX`
- Roadmap: i18n con `next-intl` cuando vendamos a otros mercados
