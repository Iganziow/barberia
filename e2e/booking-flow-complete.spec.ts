import { test, expect } from "@playwright/test";

/**
 * Flujo público de reserva COMPLETO.
 *
 * Simula a un cliente real reservando una hora desde cero:
 *  1. Entra a /mi-barberia (redirige a /book)
 *  2. Ve hero del negocio + selecciona un servicio
 *  3. Selecciona un día (próximo lunes hábil)
 *  4. Selecciona un profesional
 *  5. Selecciona un horario
 *  6. La sticky CTA se enciende
 *  7. Click en "Reservar" → pantalla Confirm
 *  8. Llena nombre + teléfono + email
 *  9. Click en "Confirmar reserva"
 * 10. Aterriza en /book/confirmation con la cita visible
 *
 * Si este test pasa, el sistema funciona end-to-end para el flujo
 * más crítico del producto. Si falla, **la gente no puede reservar**.
 */
test.describe("Reserva pública — flujo end-to-end", () => {
  test.setTimeout(60_000);

  test("cliente reserva una hora completa de punta a punta", async ({ page }) => {
    // ───────── 1) Entrar al booking (vía landing redirect) ─────────
    await page.goto("/mi-barberia");
    await page.waitForURL("**/mi-barberia/book", { timeout: 10000 });

    // Esperar que el hero del negocio cargue (significa que branchInfo
    // ya llegó del API).
    await expect(page.locator(".bk-a__biz-name")).toBeVisible({ timeout: 8000 });

    // ───────── 2) Seleccionar un servicio ─────────
    // Click el primer servicio disponible. El kit usa .bk-a__svc.
    const firstSvc = page.locator(".bk-a__svc").first();
    await firstSvc.waitFor({ state: "visible", timeout: 8000 });
    await firstSvc.click();
    await expect(firstSvc).toHaveClass(/is-on/);

    // ───────── 3) Seleccionar un día (NO hoy domingo) ─────────
    // El strip de días tiene .bk-a__day. Buscamos uno habilitado (no closed).
    // La sucursal abre Lun-Sáb, así que tomamos cualquier día que no sea
    // .is-closed y no sea hoy si hoy es domingo.
    const days = page.locator(".bk-a__day:not(.is-closed)");
    await days.first().waitFor({ state: "visible", timeout: 8000 });
    // Click el segundo día disponible para garantizar que no sea "hoy"
    // (que podría no tener slots si es muy tarde en el día).
    const dayCount = await days.count();
    const dayIdx = Math.min(1, dayCount - 1);
    await days.nth(dayIdx).click();
    await expect(days.nth(dayIdx)).toHaveClass(/is-on/);

    // ───────── 4) Seleccionar un profesional ─────────
    // Después de elegir día, aparece la sección de barberos.
    // Click el primer barbero disponible (o "Cualquier" si está).
    const barbers = page.locator(".bk-a__barber:not(:disabled)");
    await barbers.first().waitFor({ state: "visible", timeout: 8000 });
    // Si hay "Cualquier disponible" (.is-any), evitarlo y elegir barbero
    // específico para evitar la lógica adicional de slotBarberMap.
    const specificBarber = page.locator(".bk-a__barber:not(.is-any):not(:disabled)").first();
    await specificBarber.click();
    await expect(specificBarber).toHaveClass(/is-on/);

    // ───────── 5) Seleccionar un horario ─────────
    const slots = page.locator(".bk-a__slot");
    await slots.first().waitFor({ state: "visible", timeout: 8000 });
    await slots.first().click();
    await expect(slots.first()).toHaveClass(/is-on/);

    // ───────── 6) La sticky CTA debe estar habilitada ─────────
    const cta = page.locator(".bk-a__cta-go");
    await expect(cta).toBeEnabled();

    // ───────── 7) Click en "Reservar" ─────────
    await cta.click();

    // ───────── 8) Pantalla Confirm ─────────
    await expect(page.locator(".bk-cf__ticket")).toBeVisible({ timeout: 5000 });
    await expect(page.locator(".bk-cf__ticket-h2")).toBeVisible();

    // ───────── 9) Llenar form ─────────
    // Nombre: input text
    await page.locator('input.bk-cf__input[type="text"]').fill("Test Cliente E2E");
    // Teléfono (en el wrap especial con prefix +56)
    await page.locator('input.bk-cf__phone-input').fill("9 1234 5678");

    // ───────── 10) Click en "Confirmar reserva" ─────────
    const confirmBtn = page.locator(".bk-cf__cta-btn");
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // ───────── 11) Aterrizar en /book/confirmation ─────────
    await page.waitForURL("**/book/confirmation**", { timeout: 15000 });
    // El SuccessScreen tiene .bk-ok__title con "¡Listo, ..."
    await expect(page.locator(".bk-ok__title")).toContainText(/¡Listo/i, { timeout: 8000 });
    // Y la card de cuándo
    await expect(page.locator(".bk-ok__when-card")).toBeVisible();
  });

  test("flujo Express muestra resumen en sticky CTA según va llenando", async ({ page }) => {
    await page.goto("/mi-barberia/book");
    await page.locator(".bk-a__svc").first().waitFor();

    // Antes de elegir servicio: CTA dice "Falta servicio" y botón disabled
    const ctaInfo = page.locator(".bk-a__cta-info-h");
    await expect(ctaInfo).toContainText(/Falta servicio/i);
    await expect(page.locator(".bk-a__cta-go")).toBeDisabled();

    // Elegir servicio
    await page.locator(".bk-a__svc").first().click();
    await expect(ctaInfo).toContainText(/Falta día|Falta hora|Falta profesional/i);
  });

  test("Click servicio toggle on/off (selección única)", async ({ page }) => {
    await page.goto("/mi-barberia/book");
    const svcs = page.locator(".bk-a__svc");
    await svcs.first().waitFor();

    // Click 1er servicio → seleccionado
    await svcs.first().click();
    await expect(svcs.first()).toHaveClass(/is-on/);

    // Click 2do servicio → reemplaza (selección única)
    if ((await svcs.count()) > 1) {
      await svcs.nth(1).click();
      await expect(svcs.first()).not.toHaveClass(/is-on/);
      await expect(svcs.nth(1)).toHaveClass(/is-on/);
    }
  });
});
