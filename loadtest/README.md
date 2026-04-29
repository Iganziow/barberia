# Load testing

Tests de carga con [k6](https://k6.io). Detecta cuellos de botella, regresiones de performance, y verifica que la app aguanta picos.

## Setup

```bash
# Windows (Chocolatey)
choco install k6

# Mac
brew install k6

# Linux (apt)
sudo apt install k6

# O descargar el binario: https://k6.io/docs/get-started/installation/
```

## Tests disponibles

| Archivo | Duración | Carga máx | Cuándo correrlo |
|---|---|---|---|
| `smoke.js` | 30s | 5 VUs | Post-deploy: confirmar que los endpoints respondan |
| `booking-flow.js` | ~6 min | 100 VUs | Antes de release: simular tráfico real con spike |

## Cómo correr

```bash
# Smoke contra localhost (npm run dev primero)
k6 run loadtest/smoke.js

# Smoke contra producción
BASE_URL=https://barberia-production-43c8.up.railway.app k6 run loadtest/smoke.js

# Flujo completo con stages
npm run test:load

# Custom: stage corto para dev
k6 run --duration 30s --vus 10 loadtest/booking-flow.js
```

## Thresholds

`booking-flow.js` falla si:
- p95 de availability > 500ms
- p99 de cualquier endpoint > 1.5s
- Error rate > 1%
- < 98% de checks pasan

`smoke.js` falla si:
- p95 > 500ms
- Error rate > 1%

Ambos exit con código != 0 si los thresholds se rompen → integración con CI directa.

## Métricas a observar

Output típico de un run exitoso:
```
✓ http_req_duration..............: avg=180ms p(95)=420ms p(99)=890ms
✓ http_req_failed................: 0.00% ✓ 0     ✗ 1240
✓ flows_completed................: 1240
✓ checks.........................: 99.92%
```

Si `http_req_failed` > 1%, algo está mal. Casos típicos:
- Rate limiter activado por IP — k6 simula 1 IP por default; agregar `--http-debug` o usar `__VU` para variar.
- Connection refused — el server colapsó. Revisar memoria/CPU.
- Timeouts — endpoints lentos. Profiling con `EXPLAIN ANALYZE` en Postgres.

## Importante

- **NO correr `booking-flow.js` contra producción con POSTs** — los scripts actuales hacen solo lecturas, así que es seguro. Si en el futuro agregás un script que postea, asegurate de usar un IP/cuenta de test dedicado.
- El plan gratis de Railway tiene CPU/memoria limitada — esperá saturación temprana en stages > 50 VUs.
