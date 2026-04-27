# Arquitectura

Decisiones técnicas y patrones que guían el código.

---

## Capas

```
┌─────────────────────────────────────────────────────┐
│  UI (React Server + Client Components)              │
│  src/app/**/page.tsx, src/features/**/*.tsx         │
└─────────────────────────────────────────────────────┘
                          │
                  fetch() / Server Action
                          ▼
┌─────────────────────────────────────────────────────┐
│  API Routes (thin, validate + delegate)             │
│  src/app/api/**/*.ts                                │
└─────────────────────────────────────────────────────┘
                          │
            withAdmin / withBarber / withPublic
                          ▼
┌─────────────────────────────────────────────────────┐
│  Services (business logic)                          │
│  src/lib/services/*.service.ts                      │
└─────────────────────────────────────────────────────┘
                          │
                       Prisma
                          ▼
┌─────────────────────────────────────────────────────┐
│  PostgreSQL                                         │
└─────────────────────────────────────────────────────┘
```

**Regla de oro:** las API routes son delgadas (validan input + llaman a services). Los services tienen toda la lógica de negocio. Los componentes UI nunca llaman a Prisma directamente.

---

## Auth flow

```
[Cliente] → POST /api/auth/login
              { email, password }
              ↓
        verify password (bcrypt)
              ↓
        signJWT({ userId, role, orgId })
              ↓
        Set-Cookie: bb_session=xxx (HttpOnly, SameSite=Strict, 7d)
              ↓
[Cliente con cookie] → middleware.ts intercepta /admin/* /barber/*
              ↓
        verifyJWT(cookie) → valida firma + expiración
              ↓
        check role coincide con la ruta
              ↓
        x-org-id header injectado para downstream
              ↓
        ✓ acceso
```

**Por qué JWT en cookie HTTP-only:**
- No accesible desde JS → mitiga XSS
- `SameSite=Strict` → mitiga CSRF
- 7 días de expiración → balance entre UX y seguridad

---

## Multi-tenancy

El schema soporta multi-tenant via `Organization`:

```
Organization (slug: "mi-barberia")
  ├── Branch[] (sucursales)
  │     ├── Barber[] (profesionales)
  │     │     ├── BarberSchedule[]
  │     │     ├── BarberService[]
  │     │     └── Appointment[]
  │     └── WorkingHours[]
  ├── Service[]
  └── Client[]
```

**Resolución del tenant:**
1. JWT tiene `orgId` para usuarios autenticados (admin, barber).
2. Páginas públicas (`/{slug}/...`) resuelven via `tenant.ts` → `resolveOrgIdBySlug` con cache 5 min.
3. API públicos (`/api/book/*`) reciben `?slug=xxx` query param.

Hoy: 1 negocio, 1 sucursal. Mañana: N negocios sin cambios de schema.

---

## Validación de slots (corazón del sistema)

`validateAppointmentSlot` (en `availability.service.ts`) es la **fuente única de verdad** para validar si un slot es reservable. Lo usan:

- `POST /api/book` (cliente reserva)
- `POST /api/admin/appointments` (admin crea cita)
- `rescheduleAppointment` (drag-to-reschedule)

**Verifica en orden:**
1. Slot no está en el pasado (configurable con `rejectPast`).
2. Barbero trabaja ese día (`BarberSchedule.isWorking`).
3. Sucursal abierta ese día (`WorkingHours.isOpen`).
4. Slot dentro de la intersección barbero-sucursal.
5. No solapa con otra cita activa (excluye CANCELED/NO_SHOW).
6. No solapa con bloqueo de tiempo (`BlockTime`).

**Atómico dentro de transacción:** acepta el cliente `tx` de `prisma.$transaction()` para que el check + INSERT sean indivisibles. Esto cierra la race condition donde un slot validado segundos antes podía ser tomado por otro cliente.

```ts
const result = await prisma.$transaction(async (tx) => {
  const conflict = await validateAppointmentSlot(tx, args, options);
  if (conflict) throw new Error(`SLOT_INVALID:${slotConflictMessage(conflict)}`);
  return tx.appointment.create({ ... });
});
```

---

## Algoritmo de slots disponibles

`getAvailableSlots(barberId, date, durationMin)`:

```
1. Buscar BarberSchedule del día → ventana startTime-endTime
2. Buscar WorkingHours de la sucursal → intersectar
3. Generar slots cada 30 min dentro de la ventana
   (si servicio dura 45 min, slots a las 09:00, 09:30, 10:00, ...)
4. Para cada slot, descartar si solapa con:
   - Appointment existente (status != CANCELED, NO_SHOW)
   - BlockTime
5. Filtrar slots pasados (si la fecha es hoy)
```

**Performance:** todas las queries en paralelo con `Promise.all` (no N+1). Para `getBarbersWithAvailability` hay 4 queries fijas sin importar cantidad de barberos.

---

## Timezone handling

Bug real arreglado: `new Date("2026-04-27T00:00:00")` se interpreta en la **TZ del server**. Si el server corre en UTC (default de Vercel/Railway), una reserva "9:00 AM" se guarda como "9:00 UTC" = "5:00 AM Chile" → 4 horas de desfase.

**Solución:** `src/instrumentation.ts` setea `process.env.TZ = "America/Santiago"` en boot. Next.js garantiza que corre antes de cualquier request.

```ts
export async function register() {
  if (!process.env.TZ) {
    process.env.TZ = "America/Santiago";
  }
}
```

Funciona en local, Vercel, Railway, Docker — sin tocar configuración de infra.

---

## Race conditions cubiertas

1. **Dos clientes reservan el mismo slot simultáneamente:**
   - Validación atómica dentro de transacción → uno gana, el otro recibe 409 Conflict con retry automático.
2. **Cliente sin email registrándose en mismo ms:**
   - Email sintético con `randomUUID()` (antes `Date.now()`) → cero colisiones.
3. **Mismo cliente nuevo registrándose 2 veces (doble-click):**
   - `@@unique([phone, role])` en User → segunda inserción falla, find retorna el primero.
4. **Bloqueo creado entre `getAvailableSlots` y commit:**
   - El validador re-corre dentro de la transacción → detecta el block que apareció.

---

## Patrones de código

### `withAdmin` / `withBarber` / `withPublic`

Wrappers que extraen contexto de auth + rate limit (público) + manejo de errores:

```ts
export const POST = withAdmin(async (req, { orgId, userId }) => {
  // orgId/userId ya validados, request listo para procesar
});
```

`AppError` extends `Error` con `statusCode`. Lanzar `AppError.notFound("...")` se convierte automáticamente en `404 { message: "..." }`.

### Servicios sin estado, no clases

```ts
// ✅ functions exportadas
export async function getBarbers(orgId: string) { ... }

// ❌ no usamos clases con estado
class BarberService { ... }
```

### Hooks de fetch del lado cliente

```ts
// hooks/useBarbers.ts encapsula el fetch + cache
const { data: barbers, isLoading } = useBarbers(branchId);
```

---

## Tests

**Vitest** para unit tests (119 pasando):

- `tests/availability.test.ts` — algoritmo de slots
- `tests/slot-validator.test.ts` — `validateAppointmentSlot` con fake Prisma in-memory
- `tests/phone.test.ts` — formato y validación de teléfono chileno
- `tests/calendar-export.test.ts` — generación de URLs Google + .ics
- `tests/agenda-grid-math.test.ts` — math del grid del calendario admin
- `tests/api-handler.test.ts` — wrappers de API
- `tests/rate-limit.test.ts` — rate limiter en memoria
- `tests/sanitize.test.ts` — strip HTML, parse de fechas

**Playwright** para e2e (config en `playwright.config.ts`).

---

## Performance

**Lo que hicimos:**
- Batch fetches en `getBarbersWithAvailability` (4 queries fijas vs N×4 antes).
- Cache 5min de slug→orgId en memoria (`tenant.ts`).
- `select` explícito en Prisma (evita over-fetch de campos no usados).
- AbortController en búsqueda de clientes (cancela requests obsoletos).

**Lo que NO hicimos pero está en roadmap:**
- Redis para cache distribuido (cuando haya multi-instancia).
- ISR para landing pública (`/{slug}`) — actualmente SSR puro.
- Image optimization para logos de orgs (subir a CDN).

---

## Deuda técnica conocida

1. **Multi-servicio en una reserva:** UI fue restringida a 1 servicio. Implementación correcta requiere crear N citas back-to-back en una transacción + ajustar cálculo de slots para considerar duración total.
2. **Reenvío manual de email de confirmación:** no hay endpoint admin para reenviar.
3. **Timezone por organización:** hoy hardcoded a `America/Santiago`. Si vendemos a otros mercados, agregar `Organization.timezone` y leer de ahí.
4. **Rate limit en memoria:** se pierde con multi-instancia. Migrar a Redis cuando escalemos.
5. **Recordatorios push del barbero:** usa Notification API client-side (sin service worker). Limitado a la pestaña abierta.

---

## Decisiones controvertidas (y por qué)

**¿Por qué no Server Actions?**
- Mantenemos API routes explícitas porque facilitan integraciones externas (la app expone una API pública con `/api/v1/*` para clientes B2B).
- Server actions están fine pero rompen el patrón uniforme.

**¿Por qué Prisma y no Drizzle?**
- Prisma 6 sigue siendo el ecosistema más maduro para Postgres en Next.
- Drizzle es atractivo para perf-crítico pero acá las queries son simples y el ORM no es bottleneck.

**¿Por qué FullCalendar y no construir el calendario?**
- Edge cases (timezones, eventos cross-day, drag-resize) son MUCHO trabajo.
- FullCalendar v6 está bien mantenido y es flexible.

**¿Por qué cookie HTTP-only en lugar de NextAuth?**
- NextAuth agrega ~30KB y abstracciones que no usamos.
- Nuestro JWT con `jose` (10KB) es suficiente y entendible.
