/* eslint-disable */
/**
 * k6 smoke test — chequeo rápido de salud (~30 seg).
 *
 * Útil después de cada deploy para confirmar que los endpoints
 * responden bien sin saturar nada. 5 VUs por 30s.
 *
 * Cómo correr:
 *   k6 run loadtest/smoke.js
 *   BASE_URL=https://prod-url npm run test:load
 *      (con BASE_URL apuntando a prod, solo hace lecturas)
 */

import http from "k6/http";
import { check } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const SLUG = __ENV.SLUG || "mi-barberia";

export const options = {
  vus: 5,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  const tests = [
    `/api/book/info?slug=${SLUG}`,
    `/api/book/services?slug=${SLUG}`,
    `/api/book/branches?slug=${SLUG}`,
  ];
  for (const path of tests) {
    const r = http.get(`${BASE_URL}${path}`);
    check(r, {
      [`${path} → 200`]: (res) => res.status === 200,
      [`${path} fast`]: (res) => res.timings.duration < 500,
    });
  }
}
