import { expect, test } from "@playwright/test";

function getQaCredentials() {
  const email = globalThis.process?.env?.E2E_SUPABASE_EMAIL?.trim();
  const password = globalThis.process?.env?.E2E_SUPABASE_PASSWORD?.trim();

  if (!email || !password) {
    throw new Error(
      "Defina E2E_SUPABASE_EMAIL e E2E_SUPABASE_PASSWORD para executar os testes E2E com a conta de QA existente.",
    );
  }

  return { email, password };
}

async function loginWithEmail(page, email, password) {
  await page.goto("/login");
  await page.locator('input[autocomplete="username"]').fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();

  try {
    await page.waitForURL(/\/dashboard$/, { timeout: 15000 });
    return true;
  } catch {
    return false;
  }
}

async function ensureAuthenticated(page) {
  const credentials = getQaCredentials();
  const authenticated = await loginWithEmail(page, credentials.email, credentials.password);

  if (authenticated) {
    return credentials;
  }

  throw new Error("Nao foi possivel autenticar a conta de QA no ambiente E2E do Supabase.");
}

test("real dev flow logs in with QA account, seeds data and loads the dashboard", async ({ page }) => {
  test.setTimeout(120000);

  await ensureAuthenticated(page);

  await expect(page.getByRole("heading", { name: /bilhetes do dia/i })).toBeVisible();

  await page.getByTestId("dev-tools-trigger").click();
  await expect(page.getByTestId("dev-tools-panel")).toBeVisible();

  await page.getByTestId("dev-populate-complete").click();
  await expect(page.getByTestId("dev-tools-panel")).toContainText(/Banco completo conclu[ií]do/i);
  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: /bilhetes do dia/i })).toBeVisible({ timeout: 30000 });
  await expect(page.getByText("Bet365")).toBeVisible({ timeout: 30000 });
});
