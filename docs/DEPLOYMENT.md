# Deployment

Cómo deployar la app a producción.

---

## Stack soportado

✅ **Railway** (recomendado — config simple, DB incluida)
✅ **Vercel + Neon/Supabase** (DB externa)
✅ **Docker** (cualquier host)

---

## Requisitos

- Node.js 20+
- PostgreSQL 14+
- Variables de entorno configuradas (ver abajo)

---

## Variables de entorno

```bash
# Conexión a la DB (Postgres)
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Secret para firmar JWT (mínimo 32 chars random)
# Generá uno con: openssl rand -base64 48
JWT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# (Opcional) Slug por defecto cuando no se puede resolver el tenant
DEFAULT_ORG_SLUG=mi-barberia

# (Opcional) API key de Resend para email transaccional
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM=noreply@tudominio.cl

# (Opcional) URL pública del sitio (usada en emails y links)
NEXT_PUBLIC_APP_URL=https://tu-dominio.cl
```

**No necesitás `TZ=America/Santiago`** — `instrumentation.ts` lo setea automáticamente en boot.

---

## Deploy en Railway

### 1. Crear proyecto

```bash
# Instalá Railway CLI si no lo tenés
npm i -g @railway/cli

# Login
railway login

# Crear proyecto + linkear
railway init
railway link
```

O via UI:
1. Andá a [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Elegí el repo

### 2. Agregar Postgres

```bash
# Via CLI
railway add postgres

# O en UI: + New → Database → PostgreSQL
```

Railway inyecta automáticamente `DATABASE_URL` en las env vars.

### 3. Setear variables

Via UI (Settings → Variables) o CLI:

```bash
railway variables set JWT_SECRET="$(openssl rand -base64 48)"
railway variables set DEFAULT_ORG_SLUG=mi-barberia
railway variables set NEXT_PUBLIC_APP_URL=https://tudominio.cl
# RESEND_API_KEY si vas a usar email
```

### 4. Configurar build

Railway detecta Next.js automáticamente. Verificá que tu `package.json` tenga:

```json
{
  "scripts": {
    "build": "next build",
    "start": "next start",
    "postinstall": "prisma generate"
  }
}
```

### 5. Migraciones en deploy

Agregá un release command para correr las migraciones antes de levantar el server:

**railway.toml:**
```toml
[deploy]
startCommand = "npx prisma migrate deploy && npm run start"
```

O setealo en Settings → Deploy → Custom Start Command.

### 6. Seed inicial (solo primera vez)

```bash
railway run npx prisma db seed
```

### 7. Dominio custom

Settings → Networking → Generate Domain (gratis con `*.up.railway.app`)

Para custom domain: agregá CNAME a Railway en tu DNS.

---

## Deploy en Vercel + Neon

### 1. Crear DB en Neon

1. [neon.tech](https://neon.tech) → New Project
2. Copiá la connection string

### 2. Deploy en Vercel

```bash
npm i -g vercel
vercel
```

O via UI: Vercel → Import Git Repository.

### 3. Variables de entorno

Settings → Environment Variables:

```
DATABASE_URL=postgresql://...neon.tech/...
JWT_SECRET=<random>
DEFAULT_ORG_SLUG=mi-barberia
NEXT_PUBLIC_APP_URL=https://tudominio.cl
```

### 4. Build settings

Vercel detecta Next.js. Verificá:
- Build command: `npm run build`
- Install command: `npm install`
- Framework: Next.js

### 5. Migraciones

Vercel no tiene release phase. Opciones:

**A) Build hook:**
```json
// package.json
"scripts": {
  "vercel-build": "prisma migrate deploy && next build"
}
```

**B) GitHub Action que corra `prisma migrate deploy` antes del deploy.**

**C) Manual:**
```bash
DATABASE_URL="postgres://..." npx prisma migrate deploy
```

---

## Deploy con Docker

### `Dockerfile`

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
```

### Build + run

```bash
docker build -t marbrava .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="..." \
  marbrava
```

---

## Checklist pre-deploy

- [ ] `npm run build` corre limpio en local
- [ ] `npm run lint` sin errores
- [ ] `npm run test` 119/119 passing
- [ ] Migraciones probadas en una DB staging
- [ ] `JWT_SECRET` generado con valor random fuerte (no copy-paste de internet)
- [ ] `DEFAULT_ORG_SLUG` configurado si vas a usar URL sin slug
- [ ] Cookies en producción: verificá que `Secure` flag esté activo (HTTPS)
- [ ] Rate limit configurado correctamente para tu volumen esperado
- [ ] Backup automático de DB activado
- [ ] Logging y alerting configurados (Sentry/LogTail/etc)

---

## Post-deploy

### Verificación

```bash
# Healthcheck
curl https://tudominio.cl/api/health   # debería devolver 200

# Login
curl -X POST https://tudominio.cl/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@barberia.cl","password":"Admin1234!"}'
```

### Monitoring

Métricas clave a vigilar:
- **5xx error rate** — debería ser < 0.1%
- **p95 latency** — `/api/book/availability` debería ser < 500ms
- **DB connections** — Postgres maneja ~100 conexiones por default
- **Queue de email** (Resend) — si falla, las confirmaciones no llegan

### Backups

PostgreSQL nativo:
```bash
pg_dump -Fc -U user -d dbname > backup-$(date +%Y%m%d).dump
```

Restore:
```bash
pg_restore -c -d dbname backup.dump
```

Railway/Neon hacen backups automáticos diarios — verificá la retención en tu plan.

---

## Troubleshooting

### "TZ-related" issues
Si las horas se ven corridas: verificá que `instrumentation.ts` esté en `src/` y que no haya un override en env vars.

### Migration falla en deploy
```
Error: P3009 — failed migrations
```
Revisar manualmente la DB + ejecutar:
```bash
npx prisma migrate resolve --rolled-back <migration-name>
npx prisma migrate deploy
```

### Cookies no se setean
- En producción `Secure: true` solo funciona con HTTPS.
- Si tu dominio es custom, verificá que Vercel/Railway tengan el cert SSL emitido.

### Email no llega
- Verificá `RESEND_API_KEY` válida.
- Verificá DNS records (SPF, DKIM) del dominio `RESEND_FROM`.
- Mirá los logs: `console.error("Email failed:", err)` está en `email.service.ts`.

### Búsqueda de cliente lenta
- Verificá que existan los índices del schema (`@@index([orgId])` en User).
- Si tenés > 10k clientes, considerá agregar `@@index([phone])` y `@@index([name])`.

---

## Escalabilidad

**Hasta 100 negocios / 10k clientes:** suficiente con 1 instancia + 1 DB.

**100–1000 negocios:** considerar:
- Horizontal scaling de Next.js (Railway autoscale o Vercel automático).
- PgBouncer / connection pooling.
- Redis para rate limit + cache distribuido (`tenant.ts` actual usa Map en memoria).

**1000+ negocios:**
- Read replicas de Postgres.
- Separar el job de envío de emails a queue (BullMQ + Redis).
- CDN para assets estáticos (logos, imágenes).
- Considerar microservicios para el módulo de notificaciones.

Hoy estamos a años de eso — start lean.
