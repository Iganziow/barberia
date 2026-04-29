import { test, expect } from "@playwright/test";

/**
 * Validación del input de teléfono en la pantalla Confirm.
 *
 * El input tiene máscara progresiva (+56 9 XXXX XXXX) y validación
 * estricta de número chileno. Si esto se rompe, los clientes nuevos no
 * pueden reservar (botón Confirm queda deshabilitado).
 */

async function avanzarHastaConfirm(page: import("@playwright/test").Page) {
  await page.goto("/mi-barberia/book");
  await page.locator(".bk-a__svc").first().waitFor({ timeout: 8000 });
  await page.locator(".bk-a__svc").first().click();
  const days = page.locator(".bk-a__day:not(.is-closed)");
  await days.first().waitFor({ timeout: 5000 });
  const dayIdx = Math.min(1, (await days.count()) - 1);
  await days.nth(dayIdx).click();
  const specificBarber = page.locator(".bk-a__barber:not(.is-any):not(:disabled)").first();
  await specificBarber.waitFor({ timeout: 5000 });
  await specificBarber.click();
  const slot = page.locator(".bk-a__slot").first();
  await slot.waitFor({ timeout: 5000 });
  await slot.click();
  await page.locator(".bk-a__cta-go").click();
  await expect(page.locator(".bk-cf__ticket")).toBeVisible({ timeout: 5000 });
}

test.describe("Validación de teléfono chileno", () => {
  test.setTimeout(45_000);

  test("Teléfono inválido (12345) → botón Confirmar deshabilitado", async ({ page }) => {
    await avanzarHastaConfirm(page);
    await page.locator('input.bk-cf__input[type="text"]').fill("Test");
    await page.locator('input.bk-cf__phone-input').fill("12345");
    await page.locator('input.bk-cf__phone-input').blur();
    await expect(page.locator(".bk-cf__cta-btn")).toBeDisabled();
  });

  test("Teléfono válido 9 dígitos → botón Confirmar habilitado", async ({ page }) => {
    await avanzarHastaConfirm(page);
    await page.locator('input.bk-cf__input[type="text"]').fill("Test");
    await page.locator('input.bk-cf__phone-input').fill("9 1234 5678");
    await expect(page.locator(".bk-cf__cta-btn")).toBeEnabled();
  });

  test("Teléfono empezando con 0 (inválido CL) → botón deshabilitado", async ({ page }) => {
    await avanzarHastaConfirm(page);
    await page.locator('input.bk-cf__input[type="text"]').fill("Test");
    await page.locator('input.bk-cf__phone-input').fill("0 1234 5678");
    await page.locator('input.bk-cf__phone-input').blur();
    await expect(page.locator(".bk-cf__cta-btn")).toBeDisabled();
  });

  test("Empty name → botón deshabilitado", async ({ page }) => {
    await avanzarHastaConfirm(page);
    await page.locator('input.bk-cf__input[type="text"]').fill(""); // Sin nombre
    await page.locator('input.bk-cf__phone-input').fill("9 1234 5678");
    await expect(page.locator(".bk-cf__cta-btn")).toBeDisabled();
  });
});
