import { expect, test } from "@playwright/test";

test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });

test("administrador consulta os grupos e importa reservas pela aba de relatórios", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await page.getByLabel("E-mail", { exact: true }).fill("admin@clinicaaurora.com");
  await page.getByLabel("Senha", { exact: true }).fill("ChangeMe123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.getByRole("button", { name: "Relatórios", exact: true }).click();
  const group = page.getByRole("combobox", { name: "Grupo", exact: true });
  const report = page.getByRole("combobox", { name: "Relatório", exact: true });
  await expect(report.locator("option")).toHaveCount(15);
  await group.selectOption("Programas de acompanhamento");
  await expect(report.locator("option")).toHaveCount(13);
  await group.selectOption("Injetáveis e protocolos");
  await expect(report.locator("option")).toHaveCount(14);
  await group.selectOption("Agenda");
  await page.getByLabel("De", { exact: true }).fill("2026-09-01");
  await page.getByLabel("Até", { exact: true }).fill("2026-09-30");
  await page.getByRole("button", { name: /Consultar ou importar dados/ }).click();
  await page.getByLabel("Registros para importar").fill("referencia;data;paciente;valor\nres-1;2026-09-02;p1;125,50\nres-2;2026-09-04;p1;50");
  await page.getByRole("button", { name: "Importar registros", exact: true }).click();
  await expect(page.getByRole("table").getByRole("cell", { name: "1", exact: true })).toBeVisible();
  await expect(page.getByRole("table")).toContainText("175,50");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(report).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
