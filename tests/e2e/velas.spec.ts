import { test, expect } from "@playwright/test";

test.describe("Página de planos /velas", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/velas", { waitUntil: "networkidle" });
  });

  test("renderiza os 3 planos principais com preços em BRL", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Acenda/i);

    for (const slug of ["vela-10-dias", "vela-20-dias", "vela-30-dias"]) {
      await expect(page.locator(`a[href="/velas/${slug}"]`).first()).toBeVisible();
    }

    await expect(page.getByText("R$ 14,90").first()).toBeVisible();
    await expect(page.getByText("R$ 27,90").first()).toBeVisible();
    await expect(page.getByText("R$ 47,90").first()).toBeVisible();
  });

  test('badge "Mais escolhido" no card do meio (20 dias / R$ 27,90)', async ({ page }) => {
    const badge = page.getByText(/mais escolhido/i);
    await expect(badge).toBeVisible();

    // O badge deve pertencer ao card de R$ 27,90
    const card = badge.locator(
      'xpath=ancestor::div[contains(@class,"rounded-2xl") and contains(@class,"border")][1]',
    );
    await expect(card).toContainText("R$ 27,90");
    await expect(card).toContainText(/20\s*dias/i);
  });

  test("ordem visível: 10 dias antes de 20, e 20 antes de 30", async ({ page }) => {
    const titles = (await page.locator("h3.font-serif").allTextContents())
      .map((t) => t.trim())
      .filter((t) => /Vela\s+\d+\s+Dias/i.test(t));
    const idx = (t: string) => titles.indexOf(t);
    expect(idx("Vela 10 Dias")).toBeLessThan(idx("Vela 20 Dias"));
    expect(idx("Vela 20 Dias")).toBeLessThan(idx("Vela 30 Dias"));
  });

  test("CTA leva ao detalhe do plano", async ({ page }) => {
    await page
      .locator('a[href="/velas/vela-20-dias"]')
      .first()
      .click();
    await expect(page).toHaveURL(/\/velas\/vela-20-dias$/);
  });
});
