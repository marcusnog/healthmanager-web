import { expect, test } from "@playwright/test";

for (const width of [1130, 390]) {
  test(`keeps long catalog names and attach buttons inside the clinical editor at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem("healthmanager.auth", JSON.stringify({
      accessToken: "mock-token", refreshToken: "mock-refresh", expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      clinicId: "clinic-1", userId: "user-1", email: "doctor@example.test",
      session: { name: "Medico", role: "Doctor", clinicName: "Clinica", permissions: ["screen.restricted", "screen.pacientes"] },
    })));
    const record = { id: "record-1", appointmentId: "appointment-1", patientId: "patient-1", doctorId: "doctor-1", status: "Draft", content: "Evolução" };
    await page.route("**/backend/**", async route => {
      const path = new URL(route.request().url()).pathname.replace("/backend", "");
      const items = path === "/patients" ? [{ id: "patient-1", name: "Paciente teste" }]
        : path === "/products" ? Array.from({ length: 30 }, (_, i) => ({ id: `product-${i}`, name: `PRODUTO(NOMEEXTREMAMENTELONGOSEMESPACOS) ${i} 10MG`, isActive: true, applicationCount: 1, price: 120 })) : [];
      const data = path.endsWith("/clinical-records") ? [record] : path.endsWith("/clinical-record") ? record
        : path === "/clinical-catalog" ? [] : { items, total: items.length, page: 1, pageSize: 100 };
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(data) });
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Prontuarios", exact: true }).click();
    await page.getByRole("button", { name: "Abrir prontuário", exact: true }).click();
    await page.getByRole("button", { name: "Digitar evolução", exact: true }).click();
    await page.getByRole("button", { name: "Editar", exact: true }).click();
    const catalog = page.getByRole("group", { name: "Anexar produtos e pacotes ao receituário" });
    await expect(catalog.getByRole("button", { name: "Anexar" })).toHaveCount(30);
    expect(await catalog.evaluate(element => {
      const list = element.querySelector(".grid")!;
      return element.scrollWidth <= element.clientWidth + 1 && list.scrollWidth <= list.clientWidth + 1 &&
        list.clientHeight <= 320 && Array.from(list.children).every(card => {
          const box = card.getBoundingClientRect();
          const button = card.querySelector("button")!.getBoundingClientRect();
          const text = card.firstElementChild!.getBoundingClientRect();
          return button.right <= box.right && button.left >= text.right && card.scrollWidth <= card.clientWidth + 1;
        });
    })).toBe(true);
    expect(await page.getByRole("dialog").evaluate(element => {
      const body = element.querySelector(".modal-body")!;
      return body.scrollWidth <= body.clientWidth + 1;
    })).toBe(true);
    await catalog.getByRole("button", { name: "Anexar" }).first().click();
    await expect(page.getByLabel("Receituário", { exact: true })).toHaveValue(/PRODUTO/);
    await catalog.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`catalog-${width}.png`) });
  });
}
