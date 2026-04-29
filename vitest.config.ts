import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 15000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary", "json"],
      reportsDirectory: "./coverage",
      // Medimos solo helpers puros + lógica testeable sin DB. Los servicios
      // y endpoints (que tocan Prisma/HTTP) se cubren con E2E — incluirlos
      // acá los daría 0% y rompería el threshold sin reflejar la realidad.
      include: [
        "src/lib/phone.ts",
        "src/lib/calendar-export.ts",
        "src/lib/format.ts",
        "src/lib/sanitize.ts",
        "src/lib/rate-limit.ts",
        "src/lib/api-error.ts",
        "src/lib/services/availability.service.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.d.ts",
        "node_modules/**",
        ".next/**",
      ],
      // Thresholds por archivo — exigentes para los helpers puros que
      // tienen suite dedicada. Cada threshold por archivo rompe el run
      // si baja, así que actúan como guardian contra regresión.
      thresholds: {
        // Helpers críticos: deberían estar cerca del 100%
        "src/lib/phone.ts": {
          lines: 95, functions: 95, branches: 90, statements: 95,
        },
        "src/lib/calendar-export.ts": {
          // 50% porque downloadIcsFile usa Blob/createObjectURL (browser-only),
          // no testeable sin jsdom. Las funciones puras de fmt/escape/url están
          // 100% cubiertas.
          lines: 45, functions: 70, branches: 65, statements: 45,
        },
        // Slot validator: parte tiene tests con fake Prisma, parte se cubre por E2E.
        "src/lib/services/availability.service.ts": {
          lines: 15, functions: 8, branches: 25, statements: 15,
        },
        // Format: solo formatCLP + formatTime (fáciles de cubrir)
        "src/lib/format.ts": {
          lines: 50, functions: 50, branches: 100, statements: 50,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
