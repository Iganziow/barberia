# API Reference

Todos los endpoints del sistema agrupados por audiencia.

**Base URL local:** `http://localhost:3000`

**Auth:** las rutas protegidas requieren cookie `bb_session` (JWT). Login en `POST /api/auth/login`.

**Errores:** todos los endpoints devuelven JSON con `{ message: string }` y un status code apropiado (400 / 401 / 403 / 404 / 409 / 500).

---

## 🔓 Auth (público)

### `POST /api/auth/login`
Login con email + password.

**Body:**
```json
{ "email": "admin@barberia.cl", "password": "Admin1234!" }
```

**200:** setea cookie `bb_session` + redirect según rol.

**401:** credenciales inválidas.

---

### `POST /api/auth/logout`
Limpia la cookie de sesión.

**200:** cookie eliminada.

---

## 🌐 Booking público (sin auth, con rate limit)

Todos aceptan `?slug=mi-barberia` para identificar el negocio.

### `GET /api/book/info?slug=mi-barberia`
Info del negocio para landing y header del booking.

**200:**
```json
{
  "branch": {
    "name": "Sede Central",
    "address": "Av. Providencia 1234",
    "phone": "+56922334455",
    "latitude": -33.42,
    "longitude": -70.61,
    "orgName": "Mi Barbería",
    "orgDescription": "...",
    "orgLogo": "...",
    "workingHours": [...]
  },
  "barbers": [...],
  "services": [...]
}
```

**404:** slug no existe.

---

### `GET /api/book/services?slug=mi-barberia`
Servicios reservables (filtra solo los que tienen al menos 1 barbero activo ofreciéndolos).

**200:**
```json
{
  "services": [
    { "id": "...", "name": "Corte Clásico", "durationMin": 45, "price": 12000, "category": "Corte" }
  ]
}
```

---

### `GET /api/book/branches?slug=mi-barberia`
Sucursales del negocio.

**200:**
```json
{ "branches": [{ "id": "...", "name": "Sede Central", "address": "..." }] }
```

---

### `GET /api/book/availability?serviceId=X&date=YYYY-MM-DD&branchId=Y&slug=...`
Lista barberos con disponibilidad para esa fecha + servicio. Filtra por barberos que ofrecen el servicio.

**200:**
```json
{
  "barbers": [
    { "id": "...", "name": "Daniel Silva", "color": "#3B82F6", "availableSlots": 8 }
  ]
}
```

### `GET /api/book/availability?serviceId=X&date=YYYY-MM-DD&barberId=Z&slug=...`
Slots disponibles del barbero para ese servicio. Respeta `BarberService.customDuration`.

**200:**
```json
{
  "slots": [
    { "start": "2026-04-28T13:00:00.000Z", "end": "2026-04-28T13:45:00.000Z" }
  ]
}
```

**Validaciones:**
- `date < hoy` → array vacío
- `date > hoy + 60 días` → array vacío

---

### `GET /api/book/heatmap?branchId=X&serviceId=Y&days=14&slug=...`
Heatmap de disponibilidad por día (para mostrar puntos de color en el calendario).

**200:**
```json
{
  "heatmap": [
    {
      "date": "2026-04-28",
      "totalSlots": 16,
      "availableSlots": 12,
      "level": "high",
      "waitlistCount": 0
    }
  ]
}
```

`level`: `"high" | "medium" | "low" | "full" | "closed"`.

---

### `POST /api/book?slug=mi-barberia`
Crear una reserva.

**Body:**
```json
{
  "serviceId": "...",
  "barberId": "...",
  "branchId": "...",
  "start": "2026-04-28T13:00:00.000Z",
  "end": "2026-04-28T13:45:00.000Z",
  "clientName": "Juan Pérez",
  "clientPhone": "+56912345678",
  "clientEmail": "juan@example.com",
  "notePublic": "Vengo apurado"
}
```

**Rate limit:** 10 reservas / minuto / IP.

**201:**
```json
{ "booking": { "id": "...", "start": "...", "end": "...", ... } }
```

**400:** datos inválidos / barbero no ofrece el servicio / duración no coincide / fecha fuera del rango (60 días).

**404:** servicio/barbero/sucursal no encontrado.

**409:** slot no disponible (incluye razón específica: barbero no trabaja, sucursal cerrada, overlap, etc).

---

### `GET /api/book/[id]`
Detalle público de una reserva (para la pantalla de confirmación).

**200:**
```json
{
  "booking": {
    "id": "...",
    "start": "...",
    "end": "...",
    "status": "RESERVED",
    "price": 12000,
    "serviceName": "Corte Clásico",
    "serviceDuration": 45,
    "barberName": "Daniel Silva",
    "clientName": "Juan",
    "branch": {
      "name": "Sede Central",
      "address": "...",
      "phone": "...",
      "latitude": -33.42,
      "longitude": -70.61,
      "orgName": "Mi Barbería"
    }
  }
}
```

**404:** id no existe.

---

### `POST /api/book/waitlist?slug=...`
Anotarse en lista de espera cuando un día está lleno.

**Body:**
```json
{
  "clientName": "...",
  "clientPhone": "...",
  "serviceId": "...",
  "barberId": "",
  "preferredDate": "2026-04-28",
  "branchId": "..."
}
```

**Rate limit:** 5 / minuto / IP.

**200/201:** `{ id, position, alreadyExists, message }`

---

## 👨‍💼 Admin (requiere rol ADMIN)

Todos requieren cookie `bb_session` con `role=ADMIN`.

### `GET /api/admin/me`
Info del usuario actual.

### `PATCH /api/admin/me/password`
Cambiar contraseña. Body: `{ current, new }`.

### `GET /api/admin/barbers?branchId=X`
Lista barberos por sucursal.

### `GET /api/admin/services` / `POST` / `PATCH /[id]` / `DELETE /[id]`
CRUD de servicios.

### `GET /api/admin/services/categories` / `POST` / `PATCH` / `DELETE`
CRUD de categorías de servicios.

### `GET /api/admin/branches`
Lista sucursales del admin.

### `GET /api/admin/clients`
Lista clientes con stats (visitas, total gastado, última visita).

### `GET /api/admin/appointments?from=...&to=...&barberId=...&branchId=...`
Lista citas con filtros.

### `POST /api/admin/appointments`
Crear cita. Valida schedule, overlap, duración vs servicio.

### `PATCH /api/admin/appointments/[id]`
Reprogramar (drag-to-reschedule). Body: `{ start, end, barberId? }`.

### `PATCH /api/admin/appointments/[id]/status`
Cambiar status. Body: `{ status, cancelReason?, payment?, noteInternal? }`.

### `PATCH /api/admin/appointments/[id]/note`
Editar nota interna. Body: `{ noteInternal }`.

### `GET /api/admin/payments` / `POST`
Lista pagos / registrar pago manual.

### `GET /api/admin/reports?period=today|week|month|year`
Stats del dashboard.

### `GET /api/admin/reports/export?period=...`
CSV de reportes.

### `GET /api/admin/schedule` / `PUT`
Horarios de barberos.

### `GET /api/admin/block-times` / `POST` / `DELETE`
Gestión de bloqueos de tiempo.

### `GET /api/admin/integrations/keys` / `POST` / `DELETE`
API keys para integraciones B2B.

### `GET /api/admin/integrations/webhooks` / `POST` / `PATCH` / `DELETE`
Configuración de webhooks.

### `POST /api/admin/integrations/webhooks/[id]/test`
Probar un webhook (envía evento de prueba).

### `GET /api/admin/organization` / `PATCH`
Datos del negocio (nombre, logo, descripción).

### `GET /api/admin/waitlist` / `PATCH /[id]` / `DELETE /[id]`
Gestión de lista de espera.

---

## ✂️ Barber (requiere rol BARBER)

### `GET /api/barber/me`
Datos del barbero + stats del mes (comisión, ingresos, propinas, deltas).

### `PATCH /api/barber/me`
Actualizar perfil propio (phone, color).

### `GET /api/barber/appointments?date=YYYY-MM-DD`
### `GET /api/barber/appointments?from=ISO&to=ISO`
Citas del barbero (vista lista o calendario).

### `PATCH /api/barber/appointments/[id]/status`
Cambiar status de su cita. Acepta payment + cancelReason + noteInternal en una transacción.

### `PATCH /api/barber/appointments/[id]/note`
Editar nota interna de su cita.

### `GET /api/barber/clients/search?q=...`
Buscar entre sus clientes (con AbortController-friendly).

### `GET /api/barber/clients/[id]/notes`
Historial de notas que el barbero le dejó a un cliente específico.

### `GET /api/barber/block-times` / `POST` / `DELETE /[id]`
Bloqueos propios (ej: almuerzo, vacaciones).

### `GET /api/barber/reports?period=today|week|month|year`
Stats personales (comisión, top servicios, daily revenue).

---

## 👑 SuperAdmin (requiere rol SUPERADMIN)

### `GET /api/superadmin/organizations` / `POST`
Gestionar organizaciones cliente del SaaS.

### `PATCH /api/superadmin/organizations/[id]` / `DELETE`
Editar/desactivar organización.

### `GET /api/superadmin/stats`
Stats globales del SaaS.

---

## 🔌 API B2B (`/api/v1/*`, requiere API key)

Auth: header `Authorization: Bearer <api-key>` o cookie de admin.

### `GET /api/v1/appointments`
Lista citas para integración externa.

### `GET /api/v1/services`
Lista servicios.

---

## Webhooks salientes

Eventos que el sistema dispara via POST a URLs configuradas en `/admin/integrations/webhooks`:

| Evento | Payload |
|---|---|
| `appointment.completed` | `{ appointmentId, status, serviceName, barberName, price }` |
| `appointment.canceled` | `{ appointmentId, status }` |

Headers de seguridad:
- `X-Webhook-Signature` — HMAC SHA-256 del body con `Webhook.secret`
- `X-Webhook-Timestamp` — ISO timestamp para prevenir replay attacks

---

## Códigos de estado

| Code | Significado | Ejemplo |
|---|---|---|
| 200 | OK | GET exitoso |
| 201 | Created | Reserva creada |
| 400 | Bad Request | Datos inválidos, fecha fuera de rango |
| 401 | Unauthorized | Sin cookie / JWT inválido |
| 403 | Forbidden | Rol incorrecto / cross-org |
| 404 | Not Found | Recurso no existe |
| 409 | Conflict | Slot tomado, overlap, ya hay un pago |
| 429 | Too Many Requests | Rate limit |
| 500 | Internal Error | Bug del server (loguear y reportar) |
