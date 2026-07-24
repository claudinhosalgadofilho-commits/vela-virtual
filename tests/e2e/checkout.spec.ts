import { test, expect } from "@playwright/test";

test.describe("Checkout Mercado Pago", () => {
  test("detalhe do plano exibe opções de pagamento Pix e Cartão", async ({ page }) => {
    await page.goto("/velas/vela-20-dias", { waitUntil: "networkidle" });
    await expect(page.getByText(/Pix/i).first()).toBeVisible();
    await expect(page.getByText(/Cart[ãa]o/i).first()).toBeVisible();
  });

  test("iniciar pagamento sem dados válidos exibe validação", async ({ page }) => {
    await page.goto("/velas/vela-20-dias", { waitUntil: "networkidle" });

    // Tenta submeter sem preencher nome — deve haver validação HTML5 ou toast.
    const submit = page.getByRole("button", { name: /pagar|acender|continuar|pix|cart/i }).first();
    await submit.click().catch(() => undefined);

    // Aceita qualquer sinal de validação (aria-invalid, toast, ou campo destacado)
    const invalid = page.locator("[aria-invalid='true'], [data-invalid='true']");
    const toast = page.locator("[role='status'], [role='alert']");
    await expect(invalid.or(toast).first()).toBeVisible({ timeout: 5_000 });
  });
});
