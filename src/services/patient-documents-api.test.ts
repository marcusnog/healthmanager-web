// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getValidAccessToken } from "@/lib/auth-session";
import { patientsDocumentsDownload } from "./api";

vi.mock("@/lib/auth-session", () => ({
  getValidAccessToken: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(getValidAccessToken).mockResolvedValue("document-token");
  vi.stubGlobal("window", { dispatchEvent: vi.fn() });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it.each(["application/pdf", "image/png", "application/octet-stream"])("downloads %s without converting binary bytes to text", async (contentType) => {
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0, 0xff, 0x80]);
  const fetchMock = vi.fn().mockResolvedValue(new Response(bytes, { headers: { "Content-Type": contentType } }));
  vi.stubGlobal("fetch", fetchMock);

  const file = await patientsDocumentsDownload("patient-1", "document-1");

  expect(file.type).toBe(contentType);
  expect(file).toBeInstanceOf(Blob);
  expect(new Uint8Array(await file.arrayBuffer())).toEqual(bytes);
  expect(fetchMock).toHaveBeenCalledWith("/backend/patients/patient-1/documents/document-1/download", expect.objectContaining({
    headers: expect.objectContaining({ Authorization: "Bearer document-token" }),
  }));
});

it.each([403, 404, 500])("rejects HTTP %s instead of downloading an error as a file", async (status) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Download unavailable", { status })));
  const dispatch = vi.spyOn(window, "dispatchEvent");

  await expect(patientsDocumentsDownload("patient-1", "document-1")).rejects.toThrow("Download unavailable");
  expect(dispatch).not.toHaveBeenCalled();
});

it("reports an expired session on HTTP 401", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
  const dispatch = vi.spyOn(window, "dispatchEvent");

  await expect(patientsDocumentsDownload("patient-1", "document-1")).rejects.toThrow();
  expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "auth:unauthorized" }));
});
