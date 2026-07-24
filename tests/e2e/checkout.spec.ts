import { test, expect } from "@playwright/test";

test.describe("Checkout Mercado Pago", () => {
  test("detalhe do plano exibe opções de pagamento Pix e Cartão", async ({ page }) => {
    await page.goto("/velas/vela-20-dias", { waitUntil: "networkidle" });
    await expect(page.getByText(/Pix/i).first()).toBeVisible();
    await expect(page.getByText(/Cart[ãa]o/i).first()).toBeVisible();
  });

  test("formulário exige nome e email antes de gerar pagamento", async ({ page }) => {
    await page.goto("/velas/vela-20-dias", { waitUntil: "networkidle" });

    // Campos essenciais visíveis
    await expect(page.getByLabel(/Seu nome|Nome/i).first()).toBeVisible();
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
    await expect(page.getByLabel(/homenagead|em mem[oó]ria/i).first()).toBeVisible();
  });
});
