import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const BASE_HOUSES = 7;
const BASE_TICKETS = 2;
const BASE_MOVEMENTS = 42;

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

async function loginAsQa(page) {
  const { email, password } = getQaCredentials();

  await page.goto("/login");
  await page.locator('input[autocomplete="username"]').fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/dashboard$/, { timeout: 15000 });
}

async function ensureDashboard(page) {
  await expect(page.getByRole("heading", { name: /bilhetes do dia/i })).toBeVisible({ timeout: 30000 });
}

async function openDevTools(page) {
  await page.getByTestId("dev-tools-trigger").click();
  const panel = page.getByTestId("dev-tools-panel");
  await expect(panel).toBeVisible();
  return panel;
}

async function reloadDashboard(page) {
  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureDashboard(page);
}

async function resetCurrentViewToBaseline(page) {
  const panel = await openDevTools(page);
  const resetButton = page.getByRole("button", { name: "Resetar ambiente" });
  const confirmationDialog = page.getByRole("alertdialog");
  const confirmButton = confirmationDialog.getByRole("button", { name: "Confirmar" });

  await resetButton.click();
  await expect(confirmationDialog).toBeVisible();
  await expect(confirmationDialog).toContainText(/Resetar o ambiente de testes/i);
  await confirmButton.click();
  await expect(panel).toContainText(/Reset do ambiente em andamento/i);
  await expect(panel).toContainText(/Reset do ambiente conclu[ií]do/i, { timeout: 30000 });
  await reloadDashboard(page);
}

async function prepareBaseline(page) {
  await loginAsQa(page);
  await resetCurrentViewToBaseline(page);
}

async function cleanupBaseline(page) {
  try {
    await resetCurrentViewToBaseline(page);
  } catch {
    // Best effort cleanup so the shared QA database returns to the default seed.
  }
}

async function runPrimaryOperation(page, buttonName, loadingPattern, successPattern) {
  const panel = await openDevTools(page);
  const button = page.getByRole("button", { name: buttonName });

  await button.click();
  await expect(panel).toContainText(loadingPattern);
  await expect(panel).toContainText(successPattern, { timeout: 30000 });
  await reloadDashboard(page);
}

async function runQuickGeneration(page, triggerTestId, quantity) {
  const panel = await openDevTools(page);
  await page.getByTestId(triggerTestId).click();

  const picker = page.getByTestId("dev-quantity-picker");
  await expect(picker).toBeVisible();

  const quantityButton = picker.getByRole("button", { name: String(quantity), exact: true });
  await quantityButton.click();
  await expect(picker).toBeHidden();
  await expect(panel).toContainText(/em andamento/i);

  return panel;
}

async function assertDashboardBaseline(page) {
  await ensureDashboard(page);
  await expect(page.locator(".dashboard-house-scroll-fixed .dashboard-house-card")).toHaveCount(BASE_HOUSES, {
    timeout: 30000,
  });
  await expect(page.locator(".dashboard-house-card-all-fixed small")).toHaveText(`${BASE_TICKETS} bilhetes`);
  await expect(page.getByText("Bet365")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await prepareBaseline(page);
});

test.afterEach(async ({ page }) => {
  await cleanupBaseline(page);
});

test("popular banco completo", async ({ page }) => {
  const panel = await openDevTools(page);
  const button = page.getByRole("button", { name: "Popular banco completo" });

  await button.click();
  await expect(panel).toContainText(/Banco completo em andamento/i);
  await expect(panel).toContainText(/Banco completo conclu[ií]do/i, { timeout: 30000 });
  await reloadDashboard(page);

  await ensureDashboard(page);
  await expect(page.locator(".dashboard-house-scroll-fixed .dashboard-house-card")).toHaveCount(BASE_HOUSES, {
    timeout: 30000,
  });
  await expect(page.getByText("Bet365")).toBeVisible();
});

test("gerar cenário aleatório", async ({ page }) => {
  await runPrimaryOperation(
    page,
    "Gerar cenário aleatório",
    /Cen[aá]rio aleat[oó]rio em andamento/i,
    /Cen[aá]rio aleat[oó]rio conclu[ií]do/i,
  );

  await ensureDashboard(page);
  await expect(page.locator(".dashboard-house-scroll-fixed .dashboard-house-card")).toHaveCount(BASE_HOUSES, {
    timeout: 30000,
  });
  await expect(page.getByText("Bet365")).toBeVisible();
});

test("gerar casas", async ({ page }) => {
  const panel = await runQuickGeneration(page, "dev-generate-houses", 10);
  await expect(panel).toContainText(/Gera[cç][aã]o de casas conclu[ií]do/i, { timeout: 30000 });
  await reloadDashboard(page);

  await expect(page.locator(".dashboard-house-scroll-fixed .dashboard-house-card")).toHaveCount(BASE_HOUSES + 10, {
    timeout: 30000,
  });
  await expect(page.locator(".dashboard-house-card-all-fixed small")).toHaveText(`${BASE_TICKETS} bilhetes`);
});

test("gerar bilhetes", async ({ page }) => {
  const panel = await runQuickGeneration(page, "dev-generate-tickets", 50);
  await expect(panel).toContainText(/Gera[cç][aã]o de bilhetes conclu[ií]do/i, { timeout: 30000 });
  await reloadDashboard(page);

  await expect(page.locator(".dashboard-house-scroll-fixed .dashboard-house-card")).toHaveCount(BASE_HOUSES, {
    timeout: 30000,
  });
});

test("gerar movimentações", async ({ page }) => {
  const panel = await runQuickGeneration(page, "dev-generate-movements", 10);
  await expect(panel).toContainText(/Gera[cç][aã]o de movimenta[cç][oõ]es conclu[ií]do/i, { timeout: 30000 });
  await reloadDashboard(page);

  await page.getByRole("button", { name: "Movimentações" }).click();
  await page.getByRole("button", { name: "Extrato" }).click();
  await page.locator(".cb-movement-statement-page").getByLabel("Período").selectOption("Geral");

  await expect(page.locator(".cb-movement-statement-page .cb-ticket-pagination")).toContainText("52 movimentações", {
    timeout: 30000,
  });
  await expect(page.locator(".cb-movement-statement-page .cb-ticket-table-row")).toHaveCount(7, {
    timeout: 30000,
  });
});

test("limpar banco", async ({ page }) => {
  const panel = await openDevTools(page);
  const clearButton = page.getByRole("button", { name: "Limpar banco" });
  const confirmationDialog = page.getByRole("alertdialog");
  const confirmButton = confirmationDialog.getByRole("button", { name: "Confirmar" });

  await clearButton.click();
  await expect(confirmationDialog).toBeVisible();
  await expect(confirmationDialog).toContainText(/Limpar todos os dados de teste/i);
  await confirmButton.click();
  await expect(panel).toContainText(/Limpeza do banco em andamento/i);
  await expect(panel).toContainText(/dados de teste removidos/i, { timeout: 30000 });
  await reloadDashboard(page);

  await expect(page.locator(".dashboard-house-scroll-fixed .dashboard-house-card")).toHaveCount(0, {
    timeout: 30000,
  });
});

test("resetar ambiente", async ({ page }) => {
  const clearPanel = await openDevTools(page);
  const clearButton = page.getByRole("button", { name: "Limpar banco" });
  const clearDialog = page.getByRole("alertdialog");
  const clearConfirmButton = clearDialog.getByRole("button", { name: "Confirmar" });

  await clearButton.click();
  await expect(clearDialog).toBeVisible();
  await expect(clearDialog).toContainText(/Limpar todos os dados de teste/i);
  await clearConfirmButton.click();
  await expect(clearPanel).toContainText(/dados de teste removidos/i, { timeout: 30000 });
  await reloadDashboard(page);

  const resetPanel = await openDevTools(page);
  const resetButton = page.getByRole("button", { name: "Resetar ambiente" });
  const resetDialog = page.getByRole("alertdialog");
  const resetConfirmButton = resetDialog.getByRole("button", { name: "Confirmar" });

  await resetButton.click();
  await expect(resetDialog).toBeVisible();
  await expect(resetDialog).toContainText(/Resetar o ambiente de testes/i);
  await resetConfirmButton.click();
  await expect(resetPanel).toContainText(/Reset do ambiente conclu[ií]do/i, { timeout: 30000 });
  await reloadDashboard(page);
  await assertDashboardBaseline(page);
});
