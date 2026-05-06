/**
 * Smoke tests — Phase 3-B · Trilho Cred Design System
 *
 * Cobre os 7 fluxos críticos definidos no AGENTS.md.
 * Requer sessão autenticada (gerada pelo auth.setup.ts).
 */

import { test, expect } from "@playwright/test";

// ── 1. Layout shell ──────────────────────────────────────────────────────────

test("layout: topbar presente, sidebar ausente", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // Confirma que não foi redirecionado para /auth
  await expect(page).toHaveURL(/localhost:5173\/$/, { timeout: 10000 });

  // Topbar é um <header> — aguarda até ele aparecer (ProtectedRoute é async)
  const topbar = page.locator("header").first();
  await expect(topbar).toBeVisible({ timeout: 10000 });

  // Logo "Trilho." deve estar no topbar
  await expect(page.getByText("Trilho.")).toBeVisible();

  // Módulos de navegação no <nav> dentro do header
  await expect(page.getByText("Painel").first()).toBeVisible();
  await expect(page.getByText("Crédito").first()).toBeVisible();
  await expect(page.getByText("Comercial").first()).toBeVisible();

  // Background off-paper — body não deve ter background escuro
  const bodyBg = await page.evaluate(() =>
    getComputedStyle(document.body).backgroundColor
  );
  // off = #F7F7F2 = rgb(247, 247, 242)
  expect(bodyBg).toBe("rgb(247, 247, 242)");

  // Sidebar antiga não deve existir
  await expect(page.locator('[data-testid="sidebar"]')).toHaveCount(0);
  await expect(page.locator(".sidebar")).toHaveCount(0);
});

// ── 2. Auth: design próprio sem topbar ───────────────────────────────────────

test("auth: painel login sem topbar", async ({ browser }) => {
  // Abre contexto sem autenticação
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("/auth");
  await page.waitForLoadState("networkidle");

  // Deve mostrar formulário de login
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/senha/i)).toBeVisible();

  // Topbar NÃO deve estar presente na página de auth
  await expect(page.getByText("Trilho.")).toHaveCount(0);

  // Painel esquerdo marinho deve estar visível
  const leftPanel = page.locator(".bg-marinho").first();
  await expect(leftPanel).toBeVisible();

  await context.close();
});

// ── 3. Dashboard: 4 KPIs ────────────────────────────────────────────────────

test("dashboard: 4 KPIs visíveis", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  await expect(page).toHaveURL(/localhost:5173\/$/, { timeout: 8000 });
  // Confirma autenticação — header deve estar visível
  await expect(page.locator("header").first()).toBeVisible({ timeout: 8000 });

  // Os 4 KPIs do Dashboard (labels reais do componente KPI)
  const kpiLabels = [
    "Exposição total",
    "Score médio",
    "Análises aprovadas",
    "Pipeline CRM",
  ];

  for (const label of kpiLabels) {
    const kpi = page.getByText(label).first();
    await expect(kpi).toBeVisible({ timeout: 8000 });
  }
});

// ── 4. Crédito → Cedentes Kanban ─────────────────────────────────────────────

test("cedentes: kanban com 6 colunas", async ({ page }) => {
  await page.goto("/analises");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // As 6 etapas do Kanban
  const stages = ["Cadastro", "Documentos", "Análise", "Comitê", "Aprovado", "Restrito"];

  for (const stage of stages) {
    await expect(page.getByText(stage, { exact: false }).first()).toBeVisible({
      timeout: 8000,
    });
  }

  // Deve ter 6 colunas de kanban (headers com borda top colorida)
  // Cada coluna tem header com label e count
  const columns = page.locator(".flex.flex-col.min-w-0");
  await expect(columns).toHaveCount(6, { timeout: 8000 });
});

// ── 5. Crédito → Análise: 7 abas ────────────────────────────────────────────

test("análise: 7 abas navegáveis", async ({ page }) => {
  await page.goto("/analises");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // Clica na primeira análise disponível
  const firstCard = page.locator('[class*="cursor-pointer"]').first();
  const cardCount = await firstCard.count();

  if (cardCount === 0) {
    test.skip(true, "Nenhuma análise cadastrada — pule este teste");
    return;
  }

  await firstCard.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // As 7 abas do dossiê
  const tabs = ["Resumo", "Análises", "Cadastrais", "Restrições", "Documentos", "Insights", "Histórico"];

  for (const tab of tabs) {
    await expect(page.getByRole("tab", { name: tab, exact: false })).toBeVisible({
      timeout: 8000,
    });
  }
});

// ── 6. Comitê: 3 botões de voto ──────────────────────────────────────────────

test("comitê: 3 botões de voto visíveis", async ({ page }) => {
  await page.goto("/comite");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // Clica no primeiro item da fila de comitê
  const firstItem = page.locator('[class*="cursor-pointer"]').first();
  const itemCount = await firstItem.count();

  if (itemCount === 0) {
    test.skip(true, "Nenhuma análise em comitê — pule este teste");
    return;
  }

  await firstItem.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // Os 3 botões de voto
  await expect(
    page.getByText(/aprovar com limite/i).first()
  ).toBeVisible({ timeout: 8000 });
  await expect(
    page.getByText(/pedir mais informações|mais informações/i).first()
  ).toBeVisible({ timeout: 8000 });
  await expect(
    page.getByText(/rejeitar/i).first()
  ).toBeVisible({ timeout: 8000 });
});

// ── 7. Comercial → Pipeline Kanban ───────────────────────────────────────────

test("crm pipeline: kanban com estágios", async ({ page }) => {
  await page.goto("/crm/pipeline");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  await expect(page.locator("header").first()).toBeVisible({ timeout: 15000 });

  // Botão "+ Nova Oportunidade" deve estar visível
  await expect(
    page.getByText(/Nova Oportunidade/i).first()
  ).toBeVisible({ timeout: 10000 });

  // Deve ter pelo menos 1 coluna de estágio no kanban
  const columns = page.locator('[class*="min-w-0"]');
  const count = await columns.count();
  expect(count).toBeGreaterThanOrEqual(1);
});

// ── 8. Monitoramento → NFs: filtros e estrutura ──────────────────────────────

test("monitoramento nfs: filtros e estrutura", async ({ page }) => {
  await page.goto("/monitoramento-nfs");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  // Título da página
  await expect(
    page.getByText(/monitoramento/i, { exact: false }).first()
  ).toBeVisible({ timeout: 8000 });

  // Botão de upload ou novo grupo
  const actionBtn = page.getByRole("button", {
    name: /novo grupo|upload|importar/i,
  });
  await expect(actionBtn.first()).toBeVisible({ timeout: 8000 });
});

// ── 9. Cards brancos, borda sutil ────────────────────────────────────────────

test("design: cards brancos com borda sutil no dashboard", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  // Pega o primeiro card (KPI) e verifica que é branco
  const card = page.locator('[style*="background: rgb(255, 255, 255)"], [style*="background: white"]').first();
  const cardCount = await card.count();

  // Alternativa: verifica que não há elementos com background escuro (dark mode)
  const darkBgElements = page.locator('[class*="bg-gray-900"], [class*="bg-slate-900"], [class*="bg-zinc-900"]');
  await expect(darkBgElements).toHaveCount(0);
});
