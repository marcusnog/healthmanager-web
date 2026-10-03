import { expect, test } from "@playwright/test";

for (const width of [1280, 390]) {
  test(`corrects status and expands simultaneous appointments at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem("healthmanager.auth", JSON.stringify({
      accessToken: "mock-token", refreshToken: "mock-refresh", expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      clinicId: "clinic-1", userId: "user-1", email: "test@example.test",
      session: { name: "Admin Teste", role: "Admin", clinicName: "Clinica Teste", permissions: [] },
    })));
    const appointments = [
      { id: "appointment-1", patientId: "patient-1", doctorId: "doctor-1", startAt: "2026-10-03T15:00:00Z", endAt: "2026-10-03T15:30:00Z", status: "Scheduled", type: "Consulta", amount: 180 },
      { id: "appointment-2", patientId: "patient-2", doctorId: "doctor-1", startAt: "2026-10-03T15:00:00Z", endAt: "2026-10-03T15:30:00Z", status: "Scheduled", type: "Consulta", amount: 180 },
    ];
    await page.route("**/backend/**", async route => {
      const path = new URL(route.request().url()).pathname.replace("/backend", "");
      if (path === "/appointments/appointment-1" && route.request().method() === "DELETE") {
        appointments.splice(0, 1);
        await route.fulfill({ status: 204 });
        return;
      }
      if (path === "/appointments/appointment-1/status") {
        appointments[0].status = route.request().postDataJSON().status;
        await route.fulfill({ contentType: "application/json", body: JSON.stringify(appointments[0]) });
        return;
      }
      const items = path === "/patients" ? [{ id: "patient-1", name: "Marina Souza" }, { id: "patient-2", name: "Ana Nova" }]
        : path === "/doctors" ? [{ id: "doctor-1", name: "Dra. Luciana Costa" }]
        : path === "/appointment-types" ? [{ id: "type-1", name: "Consulta" }]
        : path === "/appointments" ? appointments : [];
      await route.fulfill({ contentType: "application/json", body: JSON.stringify({ items, page: 1, pageSize: 20, total: items.length }) });
    });
    await page.goto("/");
    const status = page.getByRole("combobox", { name: "Alterar status de Marina Souza" });
    await expect(status).toHaveValue("Scheduled");
    await status.selectOption("NoShow");
    await expect(status).toHaveValue("NoShow");
    await status.selectOption("Scheduled");
    await expect(status).toHaveValue("Scheduled");
    await page.getByRole("button", { name: "Ampliar quadro" }).click();
    const board = page.getByRole("region", { name: "Quadro de atendimentos" });
    await expect(board).toHaveClass(/fixed/);
    await expect(board.getByRole("combobox", { name: "Alterar status de Ana Nova" })).toBeVisible();
    await board.getByRole("button", { name: /^Editar consulta: Marina Souza/ }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${test.info().outputDir}/expanded-board-${width}.png` });
    await status.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${test.info().outputDir}/status-controls-${width}.png` });
    await page.getByRole("button", { name: "Sair da tela ampliada" }).click();
    await expect(board).not.toHaveClass(/fixed/);
    await page.getByRole("button", { name: "Excluir agendamento", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "Excluir agendamento" })).toBeVisible();
    await page.getByRole("button", { name: "Manter agendamento" }).click();
    await expect(status).toHaveCount(1);
    await page.getByRole("button", { name: "Excluir agendamento", exact: true }).first().click();
    await page.getByRole("button", { name: "Confirmar exclusao" }).click();
    await expect(status).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Alterar status de Ana Nova" })).toHaveCount(1);
    await page.getByRole("button", { name: "Agendar consulta", exact: true }).first().click();
    await expect(page.getByRole("checkbox", { name: "Atendimento em grupo" })).toHaveCount(0);
  });
}
