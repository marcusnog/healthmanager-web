import { expect, test } from "@playwright/test";

test.use({ timezoneId: "America/Sao_Paulo", channel: process.env.PLAYWRIGHT_CHANNEL });
for (const width of [1280, 390]) {
  test(`human inbox sends and shows delivery state at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem("healthmanager.auth", JSON.stringify({
      accessToken: "mock-token", refreshToken: "mock-refresh", expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      clinicId: "clinic-1", userId: "user-1", email: "test@example.test",
      session: { name: "Recepção Teste", role: "Secretary", clinicName: "Clínica Teste", permissions: [] },
    })));
    const now = new Date().toISOString();
    const messages = [{ id: "inbound", phone: "5511999998888", message: "Olá, preciso reagendar minha consulta.", status: "Delivered", direction: "Inbound", createdAt: now }];
    await page.route("**/backend/**", async route => {
      const path = new URL(route.request().url()).pathname.replace("/backend", "");
      if (path.endsWith("/messages") && route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        expect(body.clientRequestId).toMatch(/^[0-9a-f-]{36}$/);
        const sent = { ...messages[0], id: "outbound", message: body.message, direction: "Outbound", status: "Read" };
        messages.unshift(sent);
        await route.fulfill({ json: sent });
        return;
      }
      const items = path === "/whatsapp/conversations" ? [{ phone: "5511999998888", patientName: "Ana Martins", lastMessage: messages[0].message, lastMessageAt: now, lastInboundAt: now, lastDirection: messages[0].direction }]
        : path.endsWith("/messages") ? messages : [];
      await route.fulfill({ json: { items, page: 1, pageSize: 50, total: items.length } });
    });
    await page.goto("/");
    if (width < 1024) await page.getByRole("button", { name: "Menu", exact: true }).click();
    await page.locator(".nav-item").filter({ hasText: /^Atendimento$/ }).click();
    await page.getByRole("button", { name: /Ana Martins/ }).click();
    await expect(page.getByText("Olá, preciso reagendar minha consulta.", { exact: true }).last()).toBeVisible();
    await page.getByRole("textbox", { name: "Mensagem", exact: true }).fill("Claro, qual horário você prefere?");
    await page.getByRole("button", { name: "Enviar mensagem", exact: true }).click();
    await expect(page.getByText("Lida", { exact: true })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Mensagem", exact: true })).toHaveValue("");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `${test.info().outputDir}/atendimento-${width}.png`, fullPage: true });
    if (width < 768) {
      await page.getByRole("button", { name: "Voltar para conversas" }).click();
      await expect(page.getByRole("heading", { name: "Conversas", exact: true })).toBeVisible();
    }
  });
}
