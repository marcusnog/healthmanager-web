import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

describe("login URL protection", () => {
  it("removes repeated and mixed-case credentials while preserving other parameters", () => {
    const response = proxy(new NextRequest("https://example.test/?email=test&password=secret&password=again&Password=secret&view=day"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://example.test/?view=day");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("removes patient portal credentials", () => {
    const response = proxy(new NextRequest("https://example.test/portal?cpf=test&accessToken=secret&refreshToken=secret"));
    expect(response.headers.get("location")).toBe("https://example.test/portal");
  });

  it("keeps clean URLs unchanged", () => {
    const response = proxy(new NextRequest("https://example.test/?view=day"));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("preserves HTTPS behind the production proxy", () => {
    const response = proxy(new NextRequest("http://example.test/?password=secret", {
      headers: { "x-forwarded-proto": "https" },
    }));
    expect(response.headers.get("location")).toBe("https://example.test/");
  });
});

describe("public backend proxy", () => {
  it.each([
    ["GET", "/backend/health"],
    ["POST", "/backend/internal/clinics"],
    ["GET", "/backend/swagger/index.html"],
    ["GET", "/backend/metrics"],
    ["PUT", "/backend/patients"],
    ["GET", "/backend/patients/id%2Fdocuments"],
    ["GET", "/backend/whatsapp/conversations/id%252Fmessages"],
    ["GET", "/backend/webhooks/payments/Stripe"],
    ["POST", "/backend/webhooks/payments/unknown"],
  ])("blocks %s %s before forwarding", (method, path) => {
    const response = proxy(new NextRequest("https://example.test" + path, { method }));
    expect(response.status).toBe(404);
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it.each([
    ["POST", "/auth/login"],
    ["GET", "/patients?page=2"],
    ["POST", "/patients/id/documents/upload"],
    ["GET", "/whatsapp/conversations/%2B5511999998888/messages"],
    ["GET", "/whatsapp/webhook?hub.mode=subscribe&hub.challenge=123"],
    ["POST", "/whatsapp/webhook"],
    ["POST", "/webhooks/payments/stripe"],
    ["POST", "/webhooks/payments/Asaas"],
    ["POST", "/webhooks/payments/MercadoPago"],
  ])("forwards %s %s with its original path and query", (method, path) => {
    const response = proxy(new NextRequest("https://example.test/backend" + path, { method }));
    const target = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8080";
    expect(response.headers.get("x-middleware-rewrite")).toBe(new URL(path, target).href);
  });
});
