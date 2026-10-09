import { expect, test } from "@playwright/test";

test.use({ timezoneId: "America/Sao_Paulo" });

for (const width of [1280, 390]) {
  test(`corrects status and expands simultaneous appointments at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1280 ? 720 : 900 });
    await page.addInitScript(() => localStorage.setItem("healthmanager.auth", JSON.stringify({
      accessToken: "mock-token", refreshToken: "mock-refresh", expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      clinicId: "clinic-1", userId: "user-1", email: "test@example.test",
      session: { name: "Admin Teste", role: "Admin", clinicName: "Clinica Teste", permissions: [] },
    })));
    const appointments = [
      { id: "appointment-1", patientId: "patient-1", doctorId: "doctor-1", startAt: "2026-10-03T15:00:00Z", endAt: "2026-10-03T15:30:00Z", status: "Scheduled", type: "Consulta", amount: 180 },
      { id: "appointment-2", patientId: "patient-2", doctorId: "doctor-1", startAt: "2026-10-03T15:00:00Z", endAt: "2026-10-03T15:30:00Z", status: "Scheduled", type: "Consulta", amount: 180 },
      { id: "appointment-3", patientId: "patient-3", doctorId: "doctor-2", startAt: "2026-10-03T10:00:00Z", endAt: "2026-10-03T10:30:00Z", status: "Confirmed", type: "Consulta", amount: 180 },
      { id: "appointment-4", patientId: "patient-4", doctorId: "doctor-4", startAt: "2026-10-03T21:00:00Z", endAt: "2026-10-03T22:00:00Z", status: "Confirmed", type: "Consulta", amount: 180 },
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
      const items = path === "/patients" ? [{ id: "patient-1", name: "Marina Souza" }, { id: "patient-2", name: "Ana Nova" }, { id: "patient-3", name: "Primeira Consulta" }, { id: "patient-4", name: "Ultima Consulta" }]
        : path === "/doctors" ? [{ id: "doctor-1", name: "Dra. Luciana Costa" }, { id: "doctor-2", name: "Dr. Paulo Silva" }, { id: "doctor-3", name: "Dra. Geovana Matos" }, { id: "doctor-4", name: "Dr. Ivo Francisco Rocha" }]
        : path === "/appointment-types" ? [{ id: "type-1", name: "Consulta" }]
        : path === "/appointments" ? appointments : [];
      await route.fulfill({ contentType: "application/json", body: JSON.stringify({ items, page: 1, pageSize: 20, total: items.length }) });
    });
    await page.goto("/");
    await page.getByLabel("Data da agenda").fill("2026-10-03");
    await page.getByRole("button", { name: "Semana", exact: true }).click();
    for (const section of ["dashboard", "agenda"]) {
      if (section === "agenda") {
        if (width === 390) await page.getByRole("button", { name: "Menu", exact: true }).click();
        await page.locator(".nav-item").filter({ hasText: /^Agenda$/ }).click();
      }
      const week = page.getByLabel("Agenda semanal");
      await expect(week.getByRole("button", { name: "Editar consulta de Marina Souza", exact: true })).toHaveCount(1);
      expect(await week.evaluate(element => {
        const columns = Array.from(element.children);
        return columns.length === 7 && columns.every(column => {
          const bounds = column.getBoundingClientRect();
          return bounds.width >= 180 && Array.from(column.querySelectorAll("button, .status-badge")).every(item => {
            const card = item.getBoundingClientRect();
            return card.left >= bounds.left && card.right <= bounds.right + 1;
          });
        });
      })).toBe(true);
      const first = await week.getByRole("button", { name: "Editar consulta de Marina Souza", exact: true }).locator("../..").boundingBox();
      const second = await week.getByRole("button", { name: "Editar consulta de Ana Nova", exact: true }).locator("../..").boundingBox();
      expect(first!.y).toBe(second!.y);
      expect(first!.x + first!.width).toBeLessThanOrEqual(second!.x);
      expect(first!.width).toBeCloseTo(second!.width, 0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await week.getByRole("button", { name: "Editar consulta de Marina Souza", exact: true }).scrollIntoViewIfNeeded();
      await week.screenshot({ path: `${test.info().outputDir}/week-${section}-${width}.png`, animations: "disabled" });
      await week.getByRole("button", { name: "Editar consulta de Marina Souza", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Editar consulta" })).toBeVisible();
      await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    }
    await page.getByRole("button", { name: "Dia", exact: true }).click();
    const status = page.getByRole("combobox", { name: "Alterar status de Marina Souza" });
    await expect(status).toHaveValue("Scheduled");
    const ruler = page.getByLabel("Regua de horarios do dia");
    await ruler.scrollIntoViewIfNeeded();
    expect(await ruler.evaluate(element => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
    expect(await ruler.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    await expect(ruler.getByText("07:00", { exact: true }).first()).toBeVisible();
    await expect(ruler.getByText("19:00", { exact: true }).first()).toBeVisible();
    const bounds = await ruler.boundingBox();
    const lastAppointment = await ruler.getByRole("button", { name: /^Editar consulta: Ultima Consulta/ }).boundingBox();
    expect(lastAppointment!.x).toBeGreaterThanOrEqual(bounds!.x);
    expect(lastAppointment!.x + lastAppointment!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width);
    expect(lastAppointment!.y + lastAppointment!.height).toBeLessThanOrEqual(bounds!.y + bounds!.height);
    await page.screenshot({ path: `${test.info().outputDir}/whole-day-${width}.png` });
    await ruler.getByRole("button", { name: /^Editar consulta: Ultima Consulta/ }).click();
    await expect(page.getByRole("heading", { name: "Editar consulta" })).toBeVisible();
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
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
