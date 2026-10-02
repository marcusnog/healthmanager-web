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
