import { expect, test } from "@playwright/test";

test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });

for (const closeWith of ["button", "Escape"] as const) {
  test(`reopens the same patient record and prescription after closing with ${closeWith}`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("healthmanager.auth", JSON.stringify({
      accessToken: "mock-token", refreshToken: "mock-refresh", expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      clinicId: "clinic-1", userId: "user-1", email: "doctor@example.test",
      session: { name: "Medico", role: "Doctor", clinicName: "Clinica", permissions: ["screen.restricted", "screen.pacientes"] },
    })));
    const record = { id: "record-1", appointmentId: "appointment-1", patientId: "patient-1", doctorId: "doctor-1", status: "Draft", content: "Evolução salva", prescription: "Receita salva" };
    const entry = { id: "entry-1", appointmentId: "appointment-1", kind: "Document", title: "Receita registrada", content: "Orientações salvas", createdAt: "2026-10-22T12:00:00Z" };
    await page.route("**/backend/**", async route => {
      const path = new URL(route.request().url()).pathname.replace("/backend", "");
      const data = path === "/patients" ? { items: [{ id: "patient-1", name: "Paciente teste" }], total: 1 }
        : path.endsWith("/clinical-records") ? [record] : path.endsWith("/clinical-record") ? record
        : path.includes("clinical-history") || path.includes("clinical-entries") ? { items: [entry], total: 1 }
        : { items: [], total: 0 };
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(data) });
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Prontuarios", exact: true }).click();
    for (let attempt = 0; attempt < 2; attempt++) {
      await page.getByRole("button", { name: "Abrir prontuário", exact: true }).click();
      await page.getByRole("button", { name: "Visualizar / imprimir", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Documento registrado" })).toBeVisible();
      if (closeWith === "Escape") await page.keyboard.press("Escape");
      else await page.getByRole("dialog").last().getByRole("button", { name: "Fechar", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Paciente teste · Atendimento" })).toBeVisible();
      await page.getByRole("button", { name: "Visualizar / imprimir", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Documento registrado" })).toBeVisible();
      await page.getByRole("dialog").last().getByRole("button", { name: "Fechar", exact: true }).click();
      await page.getByRole("button", { name: "Fechar", exact: true }).click();
      await expect(page.getByRole("button", { name: "Abrir prontuário", exact: true })).toBeVisible();
    }
  });
}


