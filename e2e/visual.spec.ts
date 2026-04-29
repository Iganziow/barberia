import { test, expect } from "@playwright/test";

/**
 * Visual regression tests — comparan screenshots contra una versión
 * "baseline" guardada. Detectan cambios visuales no intencionales:
 * un botón que cambió de color, un padding distinto, un layout
 * que se rompió.
 *
 * Tag: @visual → corre solo con `npm run test:visual`.
 *
 * Workflow:
 *   1. La PRIMERA vez (baseline): `npm run test:visual:update`
 *      → genera screenshots en e2e/__screenshots__/
 *   2. Después: `npm run test:visual`
 *      → compara contra baseline. Si difiere > threshold, falla.
 *   3. Cuando un cambio visual SÍ es intencional, regenerás baseline
 *      con `:update` y commit los nuevos screenshots.
 *
 * Threshold default de Playwright: maxDiffPixelRatio 0.01 (1% de píxeles
 * pueden diferir). Nosotros usamos 0.02 (2%) por flakiness de fonts.
 */

const VIEWPORT_DESKTOP = { width: 1280, height: 800 };
const VIEWPORT_MOBILE = { width: 390, height: 844 };

test.describe("Visual regression — booking público @visual", () => {
  // Animaciones desactivadas para que las screenshots sean estables
  test.beforeEach(async ({ page }) => {
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    });
  });

  test("Booking landing — desktop", async ({ page }) => {
    await page.setViewportSize(VIEWPORT_DESKTOP);
    await page.goto("/mi-barberia/book");
    // Esperar que carguen los servicios para snapshot consistente
    await page.locator(".bk-a__svc").first().waitFor({ timeout: 8000 });
    // Mask del mini-mapa (iframe externo cambia con cada render)
    await expect(page).toHaveScreenshot("booking-landing-desktop.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      mask: [page.locator("iframe.bk-a__biz-map, iframe.bk-ok__map")],
    });
  });

  test("Booking landing — mobile", async ({ page }) => {
    await page.setViewportSize(VIEWPORT_MOBILE);
    await page.goto("/mi-barberia/book");
    await page.locator(".bk-a__svc").first().waitFor({ timeout: 8000 });
    await expect(page).toHaveScreenshot("booking-landing-mobile.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      mask: [page.locator("iframe.bk-a__biz-map, iframe.bk-ok__map")],
    });
  });

  test("Login page — desktop", async ({ page }) => {
    await page.setViewportSize(VIEWPORT_DESKTOP);
    await page.goto("/login");
    await page.locator('input[type="email"]').waitFor();
    await expect(page).toHaveScreenshot("login-desktop.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("404 — slug no encontrado", async ({ page }) => {
    await page.setViewportSize(VIEWPORT_MOBILE);
    await page.goto("/no-existe-este-slug");
    await page
      .getByRole("heading", { name: "Negocio no encontrado" })
      .waitFor({ timeout: 8000 });
    await expect(page).toHaveScreenshot("not-found.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("Booking — servicio seleccionado (estado is-on)", async ({ page }) => {
    await page.setViewportSize(VIEWPORT_DESKTOP);
    await page.goto("/mi-barberia/book");
    const firstSvc = page.locator(".bk-a__svc").first();
    await firstSvc.waitFor({ timeout: 8000 });
    await firstSvc.click();
    // El servicio queda con borde cobre + glow + check
    await expect(firstSvc).toHaveClass(/is-on/);
    await expect(firstSvc).toHaveScreenshot("service-card-selected.png", {
      maxDiffPixelRatio: 0.02,
    });
  });
});
