import { afterEach, expect, it, vi } from "vitest";
import { DefaultService } from "@/generated";

afterEach(() => vi.unstubAllGlobals());

it("sends doctor updates with PUT and preserves an empty specialty selection", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "doctor-1" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }));
  vi.stubGlobal("fetch", fetchMock);
  const request = { name: "Dr. Henrique Lima", isActive: true, specialtyIds: [] };

  await DefaultService.doctorsUpdate("doctor-1", request);

  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringMatching(/\/doctors\/doctor-1$/),
    expect.objectContaining({ method: "PUT", body: JSON.stringify(request) }),
  );
});
