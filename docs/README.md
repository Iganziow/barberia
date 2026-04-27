# MarBrava — Barber Booking SaaS

Sistema de gestión y reservas para barberías chilenas. Reemplaza Agenda Pro / Booksy con un foco específico en el mercado chileno (CLP, formato de teléfono +56, idioma español).

---

## ¿Qué hace?

**Para el cliente final:**
- Landing pública del negocio (`/{slug}`) con servicios, profesionales, mapa, QR
- Reservar hora en 4 pasos sin necesidad de registrarse
- Recibe confirmación por email + sincroniza con Google Calendar / Apple Calendar
- Lista de espera si el día está lleno

**Para el barbero:**
- Su agenda personal con vista calendario o lista
- Cierra cada cita con pago + propina + método
- Notas privadas por cliente ("Juan pidió tapper fade") — historial entre visitas
- Comisión acumulada del mes en tiempo real
- Reporte personal de ingresos y servicios top

**Para el dueño/admin:**
- Agenda multi-barbero global
- Gestión de sucursales, barberos, servicios, horarios
- CRM de clientes con timeline de visitas
- Reportes con export CSV
- API + webhooks para integraciones

**Para el SaaS owner (superadmin):**
- Dashboard de organizaciones cliente
- Crear nuevas barberías

---

## Stack técnico

- **Framework:** Next.js 16 (App Router) + React 19
- **Lenguaje:** TypeScript
- **Base de datos:** PostgreSQL via Prisma 6
- **Estilos:** Tailwind CSS 4
- **Calendario:** FullCalendar v6
- **Auth:** JWT (jose) en cookie HTTP-only
- **Tests:** Vitest (119 tests) + Playwright (e2e)
- **Email:** Resend (configurable)
- **Deploy:** Optimizado para Railway / Vercel

---

## Quick start

```bash
# 1. Instalar dependencias
npm install

# 2. Setear variables de entorno
cp .env.example .env
# Editar .env con tu DATABASE_URL y JWT_SECRET

# 3. Crear DB + correr migraciones
npx prisma migrate deploy

# 4. Seed con datos demo
npx prisma db seed

# 5. Levantar dev server
npm run dev
```

Abrí http://localhost:3000/mi-barberia para ver la landing del negocio demo.

**Credenciales seed:**
- Admin: `admin@barberia.cl` / `Admin1234!`
- Barbero: `daniel@barberia.cl` / `Barber1234!`
- SuperAdmin: `super@marbrava.cl` / `Super1234!`

---

## Comandos útiles

```bash
npm run dev          # Dev server con hot reload
npm run build        # Build de producción
npm run lint         # ESLint
npm run test         # Tests unitarios (119 tests)
npm run test:e2e     # Tests Playwright

npx prisma migrate dev   # Nueva migración (dev)
npx prisma db seed       # Cargar datos demo
npx prisma studio        # GUI para la DB en :5555
npx prisma generate      # Regenerar cliente Prisma
```

---

## Estructura del proyecto

```
src/
├── app/                    # Next.js App Router
│   ├── [slug]/             # Páginas públicas del negocio
│   │   ├── page.tsx        # Landing
│   │   ├── layout.tsx      # OG metadata server-side
│   │   └── book/           # Flujo de reserva
│   ├── admin/              # Panel del dueño (rol ADMIN)
│   ├── barber/             # Panel del barbero (rol BARBER)
│   ├── superadmin/         # Panel del SaaS owner (rol SUPERADMIN)
│   ├── login/              # Login compartido
│   └── api/                # API routes
│       ├── book/           # Endpoints públicos (sin auth)
│       ├── admin/          # Endpoints admin
│       ├── barber/         # Endpoints barbero
│       └── superadmin/     # Endpoints SaaS owner
├── lib/
│   ├── services/           # Lógica de negocio (Prisma queries)
│   ├── validations/        # Schemas Zod
│   ├── api-handler.ts      # Wrappers withAdmin/withBarber/withPublic
│   ├── auth.ts             # JWT firma/verify
│   ├── tenant.ts           # Resolución de orgId desde slug/JWT
│   └── ...
├── features/               # UI components agrupados por feature
├── components/             # UI primitives compartidos
├── types/                  # Types TS compartidos
├── hooks/                  # Hooks de fetch (useBarbers, useServices, etc)
└── instrumentation.ts      # TZ=America/Santiago en boot
```

---

## Roles y permisos

| Rol | Path protegido | Scope |
|---|---|---|
| `SUPERADMIN` | `/superadmin/*` | Cross-tenant (todas las orgs) |
| `ADMIN` | `/admin/*` | Su organización |
| `BARBER` | `/barber/*` | Solo sus citas/clientes |
| `CLIENT` | (sin path) | Solo reserva pública |

Middleware (`middleware.ts`) verifica JWT + rol en cada request a paths protegidos.

---

## Documentación adicional

- 🎤 **[DEMO.md](./DEMO.md)** — Guía rápida para presentar la app (rutas, credenciales, flujo)
- 🏗️ **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Decisiones técnicas y patrones
- 🌐 **[API.md](./API.md)** — Referencia de endpoints
- 🗃️ **[DATABASE.md](./DATABASE.md)** — Modelos y relaciones
- ✨ **[FEATURES.md](./FEATURES.md)** — Lista completa de features
- 🚀 **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Guía de deploy

---

## Licencia

Proprietary. Todos los derechos reservados.
