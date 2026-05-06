import { test as setup, expect } from "@playwright/test";

export const AUTH_FILE = "playwright/.auth/user.json";

setup("autenticar usuário de teste", async ({ page }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Defina TEST_EMAIL e TEST_PASSWORD em .env.test para rodar os testes E2E"
    );
  }

  await page.goto("/auth");

  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/senha/i).fill(password);
  await page.getByRole("button", { name: /entrar/i }).click();

  // Aguarda redirecionar para o dashboard
  await page.waitForURL("/", { timeout: 15000 });
  await expect(page).toHaveURL("/");

  // Salva sessão autenticada
  await page.context().storageState({ path: AUTH_FILE });
});
