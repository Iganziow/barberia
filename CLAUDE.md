# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Barber booking system built with Next.js 16 (App Router), React 19, TypeScript, Prisma (PostgreSQL), and Tailwind CSS 4. Chilean market (UI in Spanish, code in English). Estimated ~100 users, single-tenant with multi-tenant schema ready (Organization model).

## Commands

```bash
npm run dev          # Dev server (Turbopack disabled via cross-env)
npm run build        # Production build
npm run lint         # ESLint (React 19 strict rules)
npx prisma migrate dev   # Run migrations
npx prisma db seed       # Seed data (idempotent — safe to run multiple times)
npx prisma generate      # Regenerate Prisma client
npx prisma studio        # Visual DB browser on port 5555
```

**Seed credentials:** `admin@barberia.cl / Admin1234!`

## Architecture

### Routing & Auth
- Next.js App Router at `src/app/`
- Middleware (`middleware.ts`) protects `/admin/*` routes, checks JWT + ADMIN role
- JWT tokens (HS256, 7-day expiry) stored in HTTP-only cookie `bb_session`
- Auth utilities in `src/lib/auth.ts` using `jose` library
- Auth guard for API routes: `src/lib/api-auth.ts` — `requireAdmin()` returns `{ok, payload}` or `{ok: false, response}`

### Layered Architecture (SOLID)
```
src/
├── app/api/admin/        # API route handlers (thin — validate + delegate)
├── lib/services/         # Business logic layer (Prisma queries)
├── lib/validations/      # Zod schemas for request validation
├── hooks/                # Client-side data fetching hooks
├── types/                # Shared TypeScript types (decoupled from Prisma)
├── features/admin/       # Feature-grouped UI components
└── components/ui/        # Shared UI primitives
```

- **Services** (`src/lib/services/`): Server-only functions that encapsulate Prisma queries. API routes call these, never `prisma` directly.
- **Validations** (`src/lib/validations/`): Zod schemas used by API routes for input validation.
- **Types** (`src/types/agenda.ts`): Frontend-safe types (`BarberOption`, `ServiceOption`, `AgendaEvent`, etc.) decoupled from `@prisma/client`.
- **Hooks** (`src/hooks/`): `useBarbers()`, `useServices()`, `useBranches()`, `useAgendaEvents()`, `useAuthUser()` — fetch from API endpoints.

### API Routes

**Auth (public):**
- `POST /api/auth/login` — Login with email/password
- `POST /api/auth/logout` — Clear session cookie

**Admin (protected — requireAdmin):**
- `GET /api/admin/me` — Current user info
- `GET /api/admin/barbers?branchId=X` — Barbers by branch
- `GET /api/admin/services` — Active services
- `GET /api/admin/branches` — All branches
- `GET|POST /api/admin/appointments` — List (with filters) or create
- `PATCH /api/admin/appointments/[id]/status` — Update appointment status
- `GET|POST /api/admin/block-times` — List or create block times
- `GET /api/admin/clients` — List clients with stats
- `GET /api/admin/payments` — List payments
- `POST /api/admin/payments` — Record payment for appointment
- `GET /api/admin/reports?period=X` — Dashboard stats (today/week/month/year)

**Public booking (no auth):**
- `GET /api/book/services` — Active services
- `GET /api/book/branches` — Branches
- `GET /api/book/availability?serviceId=X&date=Y&barberId=Z` — Available slots
- `GET /api/book/availability?serviceId=X&date=Y&branchId=Z` — Barbers with availability
- `POST /api/book` — Create booking (finds/creates client by phone)
- `GET /api/book/[id]` — Public booking detail (confirmation page)

### Database
- Prisma schema at `prisma/schema.prisma` — 21 models including Organization, Branch, User, Barber, Client, Service, Appointment, BlockTime, Payment, etc.
- All models are actively used via services layer
- Path alias: `@/*` maps to `src/*`

### Admin Features
- **Agenda** (`features/admin/agenda/`): FullCalendar v6, filters, create appointments/blocks, overlap detection
- **Clients** (`app/admin/clients/`): Client list with visit count, total spent, last visit
- **Reports** (`features/admin/reports/`): KPI cards, barber revenue bars, service stats, daily revenue chart
- **Profile** (`app/admin/profile/`): User info display

### Public Booking (`/book`)
- Step-by-step flow: Service → Date + Barber → Time slot → Client info + Confirm
- Availability service (`lib/services/availability.service.ts`): schedule - appointments - blocks = available slots
- Confirmation page at `/book/confirmation?id=X`
- Mobile-first design

### UI & Styling
- Tailwind CSS 4 with PostCSS plugin
- Geist font family loaded in root layout
- Client components use `"use client"` directive

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Secret for JWT signing

## Language

The application UI is in Spanish (Chilean market). Variable names and code are in English.

## React 19 Lint Rules

The project uses strict React 19 ESLint rules:
- **No synchronous setState in useEffect** — use callbacks (.then) or restructure
- **No ref access during render** — only access refs in event handlers or effects
- Always include all dependencies in hook dependency arrays
