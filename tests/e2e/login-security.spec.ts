import { expect, test } from "@playwright/test";

test("old login links are cleaned before rendering", async ({ page }) => {
  const response = await page.goto("/?email=test%40example.test&password=fake-secret&view=day");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL("http://127.0.0.1:3000/?view=day");
  await expect(page.getByLabel("E-mail")).toHaveValue("");
  await expect(page.getByLabel("Senha")).toHaveValue("");
});

test("login sends credentials in a POST body and leaves the URL clean", async ({ page }) => {
  await page.route("**/backend/auth/login", route => route.fulfill({ status: 401, contentType: "application/json", body: "{}" }));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeEnabled();
  await page.getByLabel("E-mail").fill("test@example.test");
  await page.getByLabel("Senha").fill("fake-secret");
  const requestPromise = page.waitForRequest("**/backend/auth/login");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  const request = await requestPromise;
  expect(request.method()).toBe("POST");
  expect(new URL(request.url()).search).toBe("");
  expect(request.postDataJSON()).toEqual({ email: "test@example.test", password: "fake-secret" });
  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
  expect(new URL(page.url()).search).toBe("");
});

test("without JavaScript, login forms cannot leak credentials through GET", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const path of ["/", "/portal"]) {
    await page.goto(`http://127.0.0.1:3000${path}?password=fake-secret&accessToken=fake-token`);
    expect(new URL(page.url()).search).toBe("");
    await expect(page.locator("form")).toHaveAttribute("method", "post");
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  }
  await context.close();
});
