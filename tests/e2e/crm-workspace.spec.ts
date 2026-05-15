import { expect, test } from "@playwright/test";
import { mockCrmApi } from "./fixtures/api-mocks";

test.describe("CRM workspace", () => {
  test.beforeEach(async ({ page }) => {
    await mockCrmApi(page);
  });

  test("renders the operational dashboard with mocked API data", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: "Visao do dia para secretaria e gestao da clinica.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Marina Souza", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("R$ 45.120,50").first()).toBeVisible();
    await expect(page.getByText("81%", { exact: true })).toBeVisible();
    await expect(page.getByText("Paciente novo").first()).toBeVisible();
    await expect(page.getByText("R$ 150,00")).toBeVisible();
  });

  test("allows logout and login as secretaria through the mocked auth endpoint", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Marina Souza", exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Encerrar sessao" }).click();

    await expect(page.getByText("Sessao bloqueada")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Entrar no painel" }),
    ).toBeVisible();

    await page.getByLabel("Email").fill("secretaria@clinicaaurora.com");
    await page.getByLabel("Senha").fill("12345678");
    await page.getByLabel("Perfil").selectOption("Secretary");
    await page.getByRole("button", { name: "Entrar no painel" }).click();

    await expect(page.getByText("secretaria")).toBeVisible();
    await expect(page.getByText("Secretary")).toBeVisible();
    await expect(page.getByText("Clinica Aurora")).toBeVisible();
  });
});
