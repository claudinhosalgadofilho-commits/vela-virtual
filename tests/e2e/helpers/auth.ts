import type { BrowserContext, Page } from "@playwright/test";

/**
 * Restaura a sessão Supabase injetada pela sandbox Lovable, quando disponível.
 * Fora do sandbox retorna false e o teste deve pular gracefully.
 */
export async function restoreSupabaseSession(
  context: BrowserContext,
  page: Page,
  baseURL: string,
): Promise<boolean> {
  const storageKey = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
  const sessionJson = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
  const cookiesJson = process.env.LOVABLE_BROWSER_SUPABASE_COOKIES_JSON;

  if (!storageKey || !sessionJson) return false;

  if (cookiesJson) {
    try {
      const cookies = JSON.parse(cookiesJson).map((c: Record<string, unknown>) => ({
        ...c,
        url: baseURL,
      }));
      await context.addCookies(cookies);
    } catch {
      /* ignore */
    }
  }

  await page.goto(baseURL);
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key, value),
    [storageKey, sessionJson] as const,
  );
  return true;
}
