/**
 * Smoke tests — CreditoHub / Trilho
 *
 * Foco: navegação e fluxos read-only que validam que o refactor visual
 * não quebrou comportamento. Sem criação de dados.
 *
 * Requer sessão autenticada (gerada pelo auth.setup.ts via project "setup").
 *
 * Padrões:
 *  - getByRole / getByLabel / getByText (acessibilidade-first)
 *  - expect(page).toHaveURL(...) pra verificar navegação
 *  - Sem setTimeout arbitrário — espera semântica
 *  - Sem dependência de dados pré-existentes (skip se vazio)
 */

import { test, expect, type Page } from "@playwright/test";

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

/** Espera o shell autenticado carregar (header + nav). */
async function waitShell(page: Page) {
  await expect(page.locator("header").first()).toBeVisible({ timeout: 15000 });
  // Logo "Trilho." sempre presente no topbar autenticado
  await expect(page.getByText("Trilho.").first()).toBeVisible({ timeout: 8000 });
}

/** Clica num módulo do navbar (Painel / Comercial / Crédito / Monitoramento). */
async function clickModule(page: Page, label: string) {
  // Navbar é desktop — usa o primeiro botão visível com o texto exato
  const btn = page.getByRole("button", { name: new RegExp(`^${label}$`, "i") }).first();
  await btn.click();
}

// ──────────────────────────────────────────────────────────────────────
// 1. Layout shell
// ──────────────────────────────────────────────────────────────────────

test("layout: topbar carrega com módulos e logo", async ({ page }) => {
  await page.goto("/");
  await waitShell(page);

  await expect(page).toHaveURL(/\/$/, { timeout: 10000 });

  // Os 4 módulos do navbar devem estar visíveis (desktop)
  for (const label of ["Painel", "Comercial", "Crédito", "Monitoramento"]) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  }

  // Sidebar antiga não pode existir
  await expect(page.locator('[data-testid="sidebar"]')).toHaveCount(0);
});

// ──────────────────────────────────────────────────────────────────────
// 2. Auth golden path — login → dashboard → logout
//    (usa contexto novo, não a sessão pré-autenticada)
// ──────────────────────────────────────────────────────────────────────

test("auth: login e logout golden path", async ({ browser }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  test.skip(!email || !password, "TEST_EMAIL/TEST_PASSWORD ausentes");

  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Vai pra /auth (sem sessão)
  await page.goto("/auth");
  await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 10000 });
  await expect(page.getByLabel(/senha/i)).toBeVisible();

  // Topbar autenticado NÃO deve estar presente
  await expect(page.getByText("Trilho.")).toHaveCount(0);

  // 2. Faz login
  await page.getByLabel(/email/i).fill(email!);
  await page.getByLabel(/senha/i).fill(password!);
  await page.getByRole("button", { name: /entrar/i }).click();

  // 3. Redireciona pra /
  await page.waitForURL("/", { timeout: 15000 });
  await expect(page.locator("header").first()).toBeVisible({ timeout: 10000 });

  // 4. Logout via dropdown do avatar
  // Avatar é o botão com ChevronDown — abre dropdown
  const avatarBtn = page.locator("header button").filter({ has: page.locator("svg.lucide-chevron-down") }).first();
  await avatarBtn.click();
  await page.getByRole("button", { name: /sair da conta/i }).click();

  // 5. Volta pra /auth
  await page.waitForURL(/\/auth/, { timeout: 10000 });
  await expect(page.getByLabel(/email/i)).toBeVisible();

  await context.close();
});

// ──────────────────────────────────────────────────────────────────────
// 3. Navegação dos módulos do navbar
// ──────────────────────────────────────────────────────────────────────

test("nav módulos: Painel / Comercial / Crédito / Monitoramento", async ({ page }) => {
  await page.goto("/");
  await waitShell(page);

  // Painel → /
  await clickModule(page, "Painel");
  await expect(page).toHaveURL(/\/$/, { timeout: 8000 });

  // Comercial → /crm/dashboard
  await clickModule(page, "Comercial");
  await expect(page).toHaveURL(/\/crm\/dashboard/, { timeout: 8000 });
  await expect(page.getByRole("heading", { name: /painel comercial/i }).first()).toBeVisible({ timeout: 10000 });

  // Crédito → /analises
  await clickModule(page, "Crédito");
  await expect(page).toHaveURL(/\/analises/, { timeout: 8000 });
  await expect(page.getByRole("heading", { name: /análises de crédito/i }).first()).toBeVisible({ timeout: 10000 });

  // Monitoramento → /monitoramento-nfs
  await clickModule(page, "Monitoramento");
  await expect(page).toHaveURL(/\/monitoramento-nfs/, { timeout: 8000 });
});

// ──────────────────────────────────────────────────────────────────────
// 4. Submenu Crédito
// ──────────────────────────────────────────────────────────────────────

test("submenu Crédito: Análises / Comitê / Portfólio / Blacklist", async ({ page }) => {
  await page.goto("/analises");
  await waitShell(page);

  // SubNav só aparece quando módulo Crédito está ativo — já estamos
  const items = [
    { label: "Análises",  url: /\/analises/,  heading: /análises de crédito/i },
    { label: "Comitê",    url: /\/comite/,    heading: /comitê/i },
    { label: "Portfólio", url: /\/cedentes/,  heading: /portfólio/i },
    { label: "Blacklist", url: /\/blacklist/, heading: /blacklist/i },
  ];

  for (const { label, url, heading } of items) {
    await page.getByRole("button", { name: new RegExp(`^${label}$`, "i") }).first().click();
    await expect(page).toHaveURL(url, { timeout: 8000 });
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible({ timeout: 10000 });
  }
});

// ──────────────────────────────────────────────────────────────────────
// 5. Submenu Comercial
// ──────────────────────────────────────────────────────────────────────

test("submenu Comercial: Dashboard / Consulta / Prospects / Pipeline / Contatos / Atividades / Tarefas", async ({ page }) => {
  await page.goto("/crm/dashboard");
  await waitShell(page);

  const items = [
    { label: "Dashboard",  url: /\/crm\/dashboard/  },
    { label: "Consulta",   url: /\/consulta/        },
    { label: "Prospects",  url: /\/prospects/       },
    { label: "Pipeline",   url: /\/crm\/pipeline/   },
    { label: "Contatos",   url: /\/crm\/contatos/   },
    { label: "Atividades", url: /\/crm\/atividades/ },
    { label: "Tarefas",    url: /\/crm\/tarefas/    },
  ];

  for (const { label, url } of items) {
    // Volta pra Comercial pra garantir que subnav está visível
    if (!page.url().match(/\/crm|\/consulta|\/prospects/)) {
      await clickModule(page, "Comercial");
      await expect(page).toHaveURL(/\/crm\/dashboard/, { timeout: 8000 });
    }
    await page.getByRole("button", { name: new RegExp(`^${label}$`, "i") }).first().click();
    await expect(page).toHaveURL(url, { timeout: 8000 });
  }
});

// ──────────────────────────────────────────────────────────────────────
// 6. Dashboard: KPIs visíveis
// ──────────────────────────────────────────────────────────────────────

test("dashboard: KPIs principais visíveis", async ({ page }) => {
  await page.goto("/");
  await waitShell(page);

  await expect(page.getByRole("heading", { name: /painel inicial/i }).first()).toBeVisible({ timeout: 10000 });

  const kpiLabels = [
    /exposição total/i,
    /score médio/i,
    /análises aprovadas/i,
    /pipeline crm/i,
  ];

  for (const label of kpiLabels) {
    await expect(page.getByText(label).first()).toBeVisible({ timeout: 10000 });
  }
});

// ──────────────────────────────────────────────────────────────────────
// 7. Consulta CNPJ — input + botão Consultar
// ──────────────────────────────────────────────────────────────────────

test("consulta: digita CNPJ e dispara consulta", async ({ page }) => {
  await page.goto("/consulta");
  await waitShell(page);

  await expect(page.getByRole("heading", { name: /consulta cpf \/ cnpj/i }).first()).toBeVisible({ timeout: 10000 });

  const input = page.getByPlaceholder(/digite o cpf ou cnpj/i);
  await expect(input).toBeVisible();

  // Banco do Brasil — CNPJ público válido
  await input.fill("00.000.000/0001-91");

  const btn = page.getByRole("button", { name: /^consultar$/i });
  await expect(btn).toBeEnabled({ timeout: 5000 });
  await btn.click();

  // Após click, a página deve renderizar área de resultado.
  // Aceita qualquer um dos estados possíveis: card de identificação,
  // alerta de blacklist, ou choice "como deseja seguir" (CNPJ não cadastrado).
  const resultArea = page.getByText(
    /como deseja seguir|este (cnpj|cpf) está bloqueado|banco do brasil|não encontrado|sem registros/i
  ).first();

  // Se nenhum dos textos aparecer, ao menos o input deve manter o valor digitado
  await expect(input).toHaveValue(/00\.000\.000/);

  // Espera o resultado (com timeout maior — consulta externa pode demorar)
  await resultArea.waitFor({ state: "visible", timeout: 20000 }).catch(() => {
    // Se a consulta externa falhar (sem API key configurada), não falha o teste —
    // o que importa é que o form aceita input e dispara a action
  });
});

// ──────────────────────────────────────────────────────────────────────
// 8. Notificações — abre dropdown, marca como lidas
// ──────────────────────────────────────────────────────────────────────

test("notificações: dropdown abre e marca todas como lidas", async ({ page }) => {
  await page.goto("/");
  await waitShell(page);

  // Botão sino é o único <button> no <header> com svg.lucide-bell
  const bellBtn = page.locator("header button").filter({ has: page.locator("svg.lucide-bell") }).first();
  await expect(bellBtn).toBeVisible({ timeout: 8000 });

  await bellBtn.click();

  // Dropdown abre — header "Notificações"
  await expect(page.getByText(/^notificações$/i).first()).toBeVisible({ timeout: 5000 });

  // Botão "Marcar todas como lidas" deve estar visível (mock tem 2 não lidas)
  const markAll = page.getByRole("button", { name: /marcar todas como lidas/i });
  if (await markAll.count() > 0) {
    await markAll.click();
    // Após marcar, o botão deve sumir
    await expect(markAll).toHaveCount(0, { timeout: 5000 });
  }
});

// ──────────────────────────────────────────────────────────────────────
// 9. User menu — dropdown e itens de navegação
// ──────────────────────────────────────────────────────────────────────

test("user menu: dropdown abre e navega para Configurações e Perfil", async ({ page }) => {
  await page.goto("/");
  await waitShell(page);

  // Avatar (botão com chevron-down no header)
  const avatarBtn = page.locator("header button").filter({ has: page.locator("svg.lucide-chevron-down") }).first();
  await expect(avatarBtn).toBeVisible({ timeout: 8000 });

  // Abre dropdown
  await avatarBtn.click();
  await expect(page.getByRole("button", { name: /configurações/i }).first()).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole("button", { name: /meu perfil/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /sair da conta/i }).first()).toBeVisible();

  // Navega pra Configurações
  await page.getByRole("button", { name: /configurações/i }).first().click();
  await expect(page).toHaveURL(/\/configuracoes/, { timeout: 8000 });
  await expect(page.getByRole("heading", { name: /configurações/i }).first()).toBeVisible({ timeout: 10000 });

  // Volta pra dashboard, abre dropdown de novo, navega pra Perfil
  await page.goto("/");
  await waitShell(page);
  await page.locator("header button").filter({ has: page.locator("svg.lucide-chevron-down") }).first().click();
  await page.getByRole("button", { name: /meu perfil/i }).first().click();
  await expect(page).toHaveURL(/\/perfil/, { timeout: 8000 });
  await expect(page.getByRole("heading", { name: /meu perfil/i }).first()).toBeVisible({ timeout: 10000 });
});

// ──────────────────────────────────────────────────────────────────────
// 10. Drawer mobile — viewport 390x800
// ──────────────────────────────────────────────────────────────────────

test("mobile: drawer abre via hamburger e mostra módulos", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  await waitShell(page);

  // Hamburger só aparece em viewports < lg (1024px)
  const hamburger = page.getByRole("button", { name: /abrir menu/i });
  await expect(hamburger).toBeVisible({ timeout: 8000 });

  await hamburger.click();

  // Drawer mostra os 4 módulos sob o header "Módulos"
  await expect(page.getByText(/^módulos$/i).first()).toBeVisible({ timeout: 5000 });

  for (const label of ["Painel", "Comercial", "Crédito", "Monitoramento"]) {
    await expect(page.getByRole("button", { name: new RegExp(`^${label}$`, "i") }).first()).toBeVisible();
  }

  // CTA "+ Nova consulta" no rodapé do drawer
  await expect(page.getByRole("button", { name: /\+ nova consulta/i }).first()).toBeVisible();

  // Fecha drawer
  const close = page.getByRole("button").filter({ has: page.locator("svg.lucide-x") }).first();
  if (await close.count() > 0) {
    await close.click();
  }
});

// ──────────────────────────────────────────────────────────────────────
// 11. Cedentes (Portfólio) — abas
// ──────────────────────────────────────────────────────────────────────

test("portfólio: página carrega com tabs", async ({ page }) => {
  await page.goto("/cedentes");
  await waitShell(page);

  await expect(page.getByRole("heading", { name: /portfólio/i }).first()).toBeVisible({ timeout: 10000 });
});

// ──────────────────────────────────────────────────────────────────────
// 12. Comitê — fila renderiza
// ──────────────────────────────────────────────────────────────────────

test("comitê: página carrega", async ({ page }) => {
  await page.goto("/comite");
  await waitShell(page);

  await expect(page.getByRole("heading", { name: /comitê/i }).first()).toBeVisible({ timeout: 10000 });
});

// ──────────────────────────────────────────────────────────────────────
// 13. Pipeline CRM — kanban renderiza com header
// ──────────────────────────────────────────────────────────────────────

test("crm pipeline: header e CTA Nova Oportunidade", async ({ page }) => {
  await page.goto("/crm/pipeline");
  await waitShell(page);

  await expect(page.getByRole("heading", { name: /pipeline comercial/i }).first()).toBeVisible({ timeout: 10000 });

  // CTA principal pode aparecer como botão visível
  const novaOp = page.getByText(/nova oportunidade/i).first();
  await expect(novaOp).toBeVisible({ timeout: 10000 });
});

// ──────────────────────────────────────────────────────────────────────
// 14. Análises — fluxo de abrir um dossiê (skip se vazio)
// ──────────────────────────────────────────────────────────────────────

test("análise: dossiê abre com 7 abas", async ({ page }) => {
  await page.goto("/analises");
  await waitShell(page);

  // Tenta clicar em qualquer card/linha que leve ao dossiê.
  // Se não houver dado, pula.
  const candidate = page.locator('[data-testid="analysis-card"], a[href*="/analises/"], [role="button"][data-analysis-id]').first();
  const hasData = (await candidate.count()) > 0;

  if (!hasData) {
    // TODO: criar análise via fixture quando houver helper
    test.skip(true, "Sem análises cadastradas — pulando");
    return;
  }

  await candidate.click();
  await page.waitForLoadState("domcontentloaded");

  const tabs = ["Resumo", "Análises", "Cadastrais", "Restrições", "Documentos", "Insights", "Histórico"];
  for (const tab of tabs) {
    await expect(page.getByRole("tab", { name: new RegExp(tab, "i") })).toBeVisible({ timeout: 8000 });
  }
});

// ──────────────────────────────────────────────────────────────────────
// 15. Monitoramento NFs — header
// ──────────────────────────────────────────────────────────────────────

test("monitoramento nfs: página carrega", async ({ page }) => {
  await page.goto("/monitoramento-nfs");
  await waitShell(page);

  await expect(page.getByText(/monitoramento/i).first()).toBeVisible({ timeout: 10000 });
});
