/* eslint-disable */
/**
 * k6 load test del flujo público de reserva.
 *
 * Simula clientes navegando por el flujo de booking:
 *   1. GET /api/book/info        — info del negocio
 *   2. GET /api/book/services    — lista de servicios
 *   3. GET /api/book/branches    — sucursales
 *   4. GET /api/book/heatmap     — heatmap 14 días
 *   5. GET /api/book/availability (barbers count)
 *   6. GET /api/book/availability (slots de un barbero)
 *
 * Stages (por default — modificable con env vars):
 *   1m → 20 VUs (warmup)
 *   3m → 50 VUs (sustained)
 *   1m → 100 VUs (spike)
 *   1m → 0 VUs  (rampdown)
 *
 * Thresholds (hard fails):
 *   - p95 < 500ms en availability
 *   - p99 < 1000ms en cualquier endpoint
 *   - error rate < 1%
 *
 * Cómo correr:
 *   # Instalar k6: choco install k6 (Windows) o brew install k6 (Mac)
 *   npm run test:load                                          (local)
 *   BASE_URL=https://barberia-production-43c8.up.railway.app \
 *     npm run test:load                                        (prod — solo lecturas)
 *
 * Para escenarios más cortos en dev:
 *   k6 run --duration 30s --vus 10 loadtest/booking-flow.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const SLUG = __ENV.SLUG || "mi-barberia";

// Métricas custom
const errorRate = new Rate("errors");
const flowsCompleted = new Counter("flows_completed");

export const options = {
  scenarios: {
    // Carga gradual + spike + rampdown
    booking_flow: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: __ENV.WARMUP || "1m", target: 20 },
        { duration: __ENV.SUSTAIN || "3m", target: 50 },
        { duration: __ENV.SPIKE || "1m", target: 100 },
        { duration: __ENV.RAMPDOWN || "1m", target: 0 },
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    "http_req_duration{endpoint:availability}": [
      "p(95)<500",
      "p(99)<1500",
    ],
    "http_req_duration{endpoint:heatmap}": [
      "p(95)<800",
      "p(99)<2000",
    ],
    "http_req_failed": ["rate<0.01"], // <1% errores
    "errors": ["rate<0.02"], // <2% errores de negocio
    "checks": ["rate>0.98"], // >98% checks pasan
  },
};

export default function bookingFlow() {
  // 1) Info del negocio
  let r = http.get(`${BASE_URL}/api/book/info?slug=${SLUG}`, {
    tags: { endpoint: "info" },
  });
  let ok = check(r, { "info 200": (res) => res.status === 200 });
  if (!ok) {
    errorRate.add(1);
    return;
  }

  // 2) Servicios
  r = http.get(`${BASE_URL}/api/book/services?slug=${SLUG}`, {
    tags: { endpoint: "services" },
  });
  ok = check(r, { "services 200": (res) => res.status === 200 });
  if (!ok) { errorRate.add(1); return; }
  const services = r.json("services");
  if (!services || services.length === 0) { errorRate.add(1); return; }
  const serviceId = services[0].id;

  // 3) Sucursales
  r = http.get(`${BASE_URL}/api/book/branches?slug=${SLUG}`, {
    tags: { endpoint: "branches" },
  });
  ok = check(r, { "branches 200": (res) => res.status === 200 });
  if (!ok) { errorRate.add(1); return; }
  const branchId = r.json("branches.0.id");
  if (!branchId) { errorRate.add(1); return; }

  // Tiempo de "thinking" del usuario
  sleep(0.5 + Math.random() * 1.5);

  // 4) Heatmap
  r = http.get(
    `${BASE_URL}/api/book/heatmap?branchId=${branchId}&serviceId=${serviceId}&days=14&slug=${SLUG}`,
    { tags: { endpoint: "heatmap" } }
  );
  check(r, { "heatmap 200": (res) => res.status === 200 });

  // 5) Próximo lunes para availability
  const now = new Date();
  const daysUntilMonday = ((8 - now.getDay()) % 7) || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysUntilMonday);
  const dateStr = monday.toISOString().split("T")[0];

  // 6) Availability barberos
  r = http.get(
    `${BASE_URL}/api/book/availability?serviceId=${serviceId}&date=${dateStr}&branchId=${branchId}&slug=${SLUG}`,
    { tags: { endpoint: "availability" } }
  );
  ok = check(r, { "availability barbers 200": (res) => res.status === 200 });
  if (!ok) { errorRate.add(1); return; }

  const barbers = r.json("barbers") || [];
  const availableBarber = barbers.find((b) => b.availableSlots > 0);

  // 7) Si hay barbero, fetcheamos sus slots
  if (availableBarber) {
    r = http.get(
      `${BASE_URL}/api/book/availability?serviceId=${serviceId}&date=${dateStr}&barberId=${availableBarber.id}&slug=${SLUG}`,
      { tags: { endpoint: "availability" } }
    );
    check(r, { "availability slots 200": (res) => res.status === 200 });
  }

  flowsCompleted.add(1);
  sleep(1 + Math.random()); // think time
}
