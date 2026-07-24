import { test, expect } from "@playwright/test";

test.describe("Página de planos /velas", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/velas", { waitUntil: "networkidle" });
  });

  test("renderiza 3 planos com preços em BRL", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Acenda/i);

    const cards = page.locator('a[href^="/velas/"]').filter({ hasText: /Acender/i });
    await expect(cards).toHaveCount(3);

    await expect(page.getByText("R$ 14,90")).toBeVisible();
    await expect(page.getByText("R$ 27,90")).toBeVisible();
    await expect(page.getByText("R$ 47,90")).toBeVisible();
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

  test("ordem dos cards: 10 → 20 → 30 dias", async ({ page }) => {
    const titles = await page
      .locator("h3.font-serif")
      .allTextContents();
    const durations = titles.map((t) => t.trim());
    expect(durations.slice(0, 3)).toEqual([
      "Vela 10 Dias",
      "Vela 20 Dias",
      "Vela 30 Dias",
    ]);
  });

  test("CTA leva ao detalhe do plano", async ({ page }) => {
    await page
      .locator('a[href="/velas/vela-20-dias"]')
      .first()
      .click();
    await expect(page).toHaveURL(/\/velas\/vela-20-dias$/);
  });
});
