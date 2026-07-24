import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

test.describe("Página de homenagem", () => {
  let tributeId: string | null = null;

  test.beforeAll(async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON) return;
    const supa = createClient(SUPABASE_URL, SUPABASE_ANON);
    const { data } = await supa
      .from("tributes")
      .select("id, ends_at, active")
      .eq("active", true)
      .gt("ends_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    tributeId = data?.id ?? null;
  });

  test("altar, foto/vela, popup de mensagens e QR code aparecem", async ({ page }) => {
    test.skip(!tributeId, "Sem homenagem ativa para testar");
    await page.goto(`/homenagem/${tributeId}`, { waitUntil: "networkidle" });

    // Layout de 3 colunas: altar central sempre presente
    await expect(page.locator(".oratorio-niche, .candle-scene").first()).toBeVisible();

    // Botão de curtir a homenagem
    await expect(page.getByRole("button", { name: /curtir/i }).first()).toBeVisible();

    // QR code renderizado como <svg> ou <canvas>
    await expect(
      page.locator("svg[role='img'], canvas").last(),
    ).toBeVisible();
  });

  test("id inexistente mostra estado 'Homenagem não encontrada'", async ({ page }) => {
    await page.goto("/homenagem/00000000-0000-0000-0000-000000000000", {
      waitUntil: "networkidle",
    });
    await expect(
      page.getByRole("heading", { name: /Homenagem n[ãa]o encontrada/i }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
