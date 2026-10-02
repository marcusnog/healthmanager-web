import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`selects a patient found by name and books the correct ID at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => localStorage.setItem("healthmanager.auth", JSON.stringify({
      accessToken: "mock-token", refreshToken: "mock-refresh", expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      clinicId: "clinic-1", userId: "user-1", email: "test@example.test",
      session: { name: "Admin Teste", role: "Admin", clinicName: "Clínica Teste", permissions: [] },
    })));
    await page.route("**/backend/**", async route => {
      const url = new URL(route.request().url());
      const path = url.pathname.replace("/backend", "");
      const items = path === "/patients"
        ? url.searchParams.get("search") === "Ana" ? [{ id: "patient-remote", name: "Ana Nova", cpf: "52998224725" }] : [{ id: "patient-1", name: "Marina Souza" }]
        : path === "/doctors" ? [{ id: "doctor-1", name: "Dra. Luciana Costa" }]
        : path === "/appointment-types" ? [{ id: "type-1", name: "Consulta" }]
        : [];
      await route.fulfill({ status: route.request().method() === "POST" ? 201 : 200, contentType: "application/json", body: JSON.stringify({ items, page: 1, pageSize: 20, total: items.length }) });
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Agendar consulta", exact: true }).first().click();
    const dialog = page.getByRole("dialog", { name: "" });
    const input = dialog.getByRole("combobox", { name: "Paciente" });
    await input.fill("Ana");
    const option = dialog.getByRole("option", { name: /Ana Nova/ });
    await expect(option).toBeVisible();
    await page.screenshot({ path: `${test.info().outputDir}/patient-search.png` });
    await option.getByRole("button").click();
    await expect(input).toHaveValue("Ana Nova");
    await expect(dialog.getByRole("listbox")).toHaveCount(0);
    await dialog.getByRole("combobox", { name: /^Medico/ }).selectOption("doctor-1");
    await dialog.getByRole("combobox", { name: /^Tipo/ }).selectOption("type-1");
    const requestPromise = page.waitForRequest(request => request.method() === "POST" && new URL(request.url()).pathname === "/backend/appointments");
    await dialog.getByRole("button", { name: "Salvar consulta" }).click();
    expect((await requestPromise).postDataJSON()).toMatchObject({ patientId: "patient-remote", doctorId: "doctor-1" });
  });
}
