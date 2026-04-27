# Database Schema

PostgreSQL via Prisma. Schema completo en `prisma/schema.prisma`.

---

## Diagrama de relaciones (texto)

```
Organization (slug único, ej: "mi-barberia")
    │
    ├── User[] (admin/barber/client de la org)
    ├── Branch[] (sucursales)
    │     │
    │     ├── WorkingHours[] (horario por día de semana)
    │     ├── Barber[]
    │     │     │
    │     │     ├── User (1:1)
    │     │     ├── BarberSchedule[] (horario por día)
    │     │     ├── BarberService[] (servicios que ofrece)
    │     │     ├── BlockTime[] (vacaciones, almuerzo, etc)
    │     │     └── Appointment[]
    │     │
    │     └── StockMovement[]
    │
    ├── Service[]
    │     ├── ServiceCategory (opcional)
    │     └── BarberService[] (M2M con Barber)
    │
    ├── ServiceCategory[]
    ├── ApiKey[] (integraciones)
    ├── Webhook[] (eventos salientes)
    └── LoyaltyConfig (1:1)

Client
    ├── User (1:1)
    ├── Appointment[]
    └── Waitlist[]

Appointment
    ├── Branch
    ├── Barber
    ├── Service
    ├── Client
    └── Payment (1:1, nullable)

Payment
    └── Appointment (1:1)
```

---

## Modelos clave

### `Organization`
El "tenant" del SaaS. Cada barbería es 1 Organization.

```prisma
model Organization {
  id          String  @id @default(cuid())
  slug        String  @unique  // URL-friendly: "mi-barberia"
  name        String
  description String?
  logo        String?
  phone       String?
  email       String?
  // ...relaciones a Branch, Service, User, etc
}
```

### `User`
Usuario base del sistema. Roles: `SUPERADMIN`, `ADMIN`, `BARBER`, `CLIENT`.

```prisma
model User {
  id        String  @id @default(cuid())
  name      String
  email     String  @unique
  phone     String?
  password  String
  role      Role    @default(CLIENT)
  orgId     String?  // null para SUPERADMIN

  @@unique([phone, role])  // dedup por (teléfono, rol)
}
```

**Por qué `@@unique([phone, role])`:**
- Garantiza que no haya 2 CLIENT con mismo teléfono (race condition de doble-click).
- Permite que un mismo teléfono exista para CLIENT + ADMIN si la persona tiene ambos roles.
- PostgreSQL permite múltiples NULLs en compound unique → usuarios sin teléfono no chocan.

### `Branch`
Sucursal física del negocio.

```prisma
model Branch {
  id        String  @id @default(cuid())
  name      String
  address   String?
  phone     String?
  latitude  Float?
  longitude Float?
  orgId     String
}
```

### `WorkingHours`
Horario de la sucursal por día de semana.

```prisma
model WorkingHours {
  branchId   String
  dayOfWeek  Int       // 0=Domingo, 1=Lunes, ..., 6=Sábado
  openTime   String    // "09:00"
  closeTime  String    // "20:00"
  isOpen     Boolean   @default(true)

  @@unique([branchId, dayOfWeek])
}
```

### `Barber`
Profesional. Hereda nombre/email del User.

```prisma
model Barber {
  id              String         @id @default(cuid())
  userId          String         @unique
  branchId        String
  commissionType  CommissionType @default(PERCENTAGE)  // PERCENTAGE | FIXED
  commissionValue Float          @default(0)
  color           String?        // hex para calendario, ej "#3B82F6"
  active          Boolean        @default(true)
}
```

### `BarberSchedule`
Horario del barbero por día (puede diferir del horario de la sucursal — ej: barbero arranca a las 10 aunque la sucursal abra a las 9).

```prisma
model BarberSchedule {
  barberId  String
  dayOfWeek Int
  startTime String
  endTime   String
  isWorking Boolean  @default(true)

  @@unique([barberId, dayOfWeek])
}
```

### `Service`
Servicio que se puede reservar.

```prisma
model Service {
  id          String  @id @default(cuid())
  name        String
  description String?
  durationMin Int
  price       Int      // CLP sin decimales
  active      Boolean  @default(true)
  order       Int      @default(0)
  categoryId  String?
  orgId       String
}
```

### `BarberService`
M2M entre `Barber` y `Service`. Permite override de duración/precio por barbero.

```prisma
model BarberService {
  barberId        String
  serviceId       String
  customDuration  Int?     // override de Service.durationMin
  customPrice     Int?     // override de Service.price

  @@id([barberId, serviceId])
}
```

**Caso real:** Daniel cobra $15.000 por "Corte" mientras los demás cobran $10.000. Sin esta tabla, todos cobrarían igual.

### `Appointment`
La cita reservada. Estado granular para flujo "llegó → en progreso → completó".

```prisma
model Appointment {
  id            String              @id @default(cuid())
  start         DateTime
  end           DateTime
  status        AppointmentStatus   @default(RESERVED)
  price         Int                 // efectivo cobrado (puede diferir de Service.price)
  notePublic    String?             // mensaje del cliente al reservar
  noteInternal  String?             // nota privada del equipo
  cancelReason  String?
  barberId      String
  serviceId     String
  clientId      String
  branchId      String

  payment       Payment?
}

enum AppointmentStatus {
  RESERVED      // recién creada
  CONFIRMED     // confirmada por el local
  ARRIVED       // cliente llegó
  IN_PROGRESS   // en corte
  DONE          // completada
  NO_SHOW       // cliente no vino
  CANCELED
}
```

### `Payment`
Pago de la cita. Atómico con el cambio de status a DONE.

```prisma
model Payment {
  id            String        @id @default(cuid())
  amount        Int
  tip           Int           @default(0)
  method        PaymentMethod @default(CASH)  // CASH | DEBIT_CARD | CREDIT_CARD | TRANSFER | OTHER
  status        PaymentStatus @default(PENDING)  // PENDING | PAID | REFUNDED
  paidAt        DateTime?
  appointmentId String        @unique
}
```

### `BlockTime`
Bloqueo de tiempo del barbero (vacaciones, almuerzo, evento personal).

```prisma
model BlockTime {
  id        String   @id @default(cuid())
  start     DateTime
  end       DateTime
  reason    String?  // "Almuerzo", "Doctor", etc
  barberId  String
}
```

### `Client`
Cliente del negocio. Hereda nombre/email/teléfono del User.

```prisma
model Client {
  id            String    @id @default(cuid())
  userId        String    @unique
  birthDate     DateTime?
  notes         String?   // notas globales del cliente (no por cita)
  loyaltyPoints Int       @default(0)
}
```

### `Waitlist`
Lista de espera cuando un día está lleno.

```prisma
model Waitlist {
  id            String          @id @default(cuid())
  clientName    String
  clientPhone   String
  serviceId     String
  barberId      String?
  branchId      String
  preferredDate String          // YYYY-MM-DD
  status        WaitlistStatus  @default(ACTIVE)  // ACTIVE | NOTIFIED | CANCELED
  position      Int
  createdAt     DateTime        @default(now())
}
```

### `LoyaltyConfig`
Configuración de fidelización (puntos por compra → descuento).

```prisma
model LoyaltyConfig {
  orgId         String  @unique
  pointsPerCLP  Float   @default(0.01)  // 1 punto cada $100
  clpPerPoint   Float   @default(100)   // canjea 1 punto = $100 descuento
  active        Boolean @default(false)
}
```

---

## Modelos secundarios

### `ApiKey` y `Webhook`
Para integraciones B2B. Cada org puede emitir API keys con scopes y configurar webhooks que disparen ante eventos (`appointment.completed`, `appointment.canceled`).

### `ServiceCategory`
Agrupa servicios para mostrar al cliente ordenados por categoría (Corte / Barba / Coloración / etc).

### `StockMovement`
Movimientos de inventario por sucursal (no se usa todavía en la UI).

---

## Migraciones

Listadas en `prisma/migrations/`:

```
20260326051109_add_full_schema/        — schema base completo
20260402012536_add_waitlist/           — sistema de lista de espera
20260403181713_add_api_keys_webhooks/  — integraciones B2B
20260404115049_add_org_description/    — campo description en Organization
20260413061134_add_superadmin_role/    — rol SUPERADMIN
20260427150000_add_user_phone_role_unique/  — @@unique([phone, role])
```

**Aplicar migraciones:**
```bash
npx prisma migrate deploy   # producción
npx prisma migrate dev      # desarrollo (puede crear nuevas)
```

---

## Índices importantes

Auto-generados por relations + los explicit:

```prisma
User           @@index([orgId])
Appointment    @@index([barberId, start])
Appointment    @@index([clientId, start])
Appointment    @@index([branchId, start])
BlockTime      @@index([barberId, start])
```

---

## Constraints y validaciones a nivel DB

| Constraint | Modelo | Por qué |
|---|---|---|
| `User.email @unique` | User | Login |
| `User @@unique([phone, role])` | User | Dedup de clientes |
| `Branch + dayOfWeek` unique | WorkingHours | 1 fila por día |
| `Barber + dayOfWeek` unique | BarberSchedule | 1 fila por día |
| `Barber + serviceId` PK | BarberService | M2M único |
| `Appointment.payment 1:1` | Payment.appointmentId @unique | Un pago por cita |

---

## Performance tips

- **`select` siempre que sea posible.** Evita over-fetching de relaciones que no usás.
- **Batch queries con `Promise.all`** en lugar de await secuencial.
- **`groupBy` para agregaciones** en lugar de fetch + reducir en JS.
- **Index en campos de filtro frecuente** (`start`, `barberId`, `orgId`).
