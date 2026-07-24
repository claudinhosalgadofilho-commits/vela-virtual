import { test, expect } from "@playwright/test";
import { restoreSupabaseSession } from "./helpers/auth";

test.describe("Área /admin", () => {
  test("visitante anônimo é redirecionado para /auth", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/auth/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test("admin autenticado acessa dashboard", async ({ page, context, baseURL }) => {
    const ok = await restoreSupabaseSession(context, page, baseURL ?? "http://localhost:8080");
    test.skip(!ok, "Sem sessão Supabase injetada nesta execução");

    await page.goto("/admin", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/admin/);
    // Deve ver algum KPI ou heading do painel
    await expect(
      page.getByRole("heading").first(),
    ).toBeVisible();
  });

  test("monitor de webhooks é acessível ao admin", async ({ page, context, baseURL }) => {
    const ok = await restoreSupabaseSession(context, page, baseURL ?? "http://localhost:8080");
    test.skip(!ok, "Sem sessão Supabase injetada nesta execução");

    await page.goto("/admin/webhooks", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/admin\/webhooks/);
  });
});
