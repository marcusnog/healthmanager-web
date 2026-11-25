import { expect, test } from "@playwright/test";

test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });

test("fila registrada na ficha alimenta demanda e pode ser encerrada sem arquivo", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await page.getByLabel("E-mail", { exact: true }).fill("admin@clinicaaurora.com");
  await page.getByLabel("Senha", { exact: true }).fill("ChangeMe123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  async function openCare() {
    await page.getByRole("button", { name: "Pacientes", exact: true }).click();
    await page.getByRole("button", { name: "Acompanhamento", exact: true }).first().click();
  }
  await openCare();
  await page.getByLabel("Entrada na fila").fill("2026-10-01");
  await page.getByRole("button", { name: "Salvar registro" }).click();
  await expect(page.getByRole("status")).toContainText("Registro salvo");
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  async function demand(expected: string) {
    await page.getByRole("button", { name: "Relatórios", exact: true }).click();
    await page.getByRole("combobox", { name: "Relatório", exact: true }).selectOption({ label: "Demanda reprimida" });
    await page.getByLabel("De", { exact: true }).fill("2026-10-01");
    await page.getByLabel("Até", { exact: true }).fill("2026-10-31");
    await expect(page.getByRole("table").getByRole("cell", { name: expected, exact: true })).toBeVisible();
  }
  await demand("1");
  await openCare();
  await page.getByRole("dialog").getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByLabel("Saída da fila").fill("2026-10-20");
  await page.getByRole("button", { name: "Salvar registro" }).click();
  await expect(page.getByRole("status")).toContainText("Registro salvo");
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await demand("0");
});
