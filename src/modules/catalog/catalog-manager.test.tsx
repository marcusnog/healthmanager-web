import { screen } from "@testing-library/react";
import { vi } from "vitest";
import { DefaultService } from "@/generated";
import { renderWithProviders } from "@/test/render";
import { CatalogManager } from "./catalog-manager";

vi.mock("@/generated", async importOriginal => {
  const actual = await importOriginal<typeof import("@/generated")>();
  return { ...actual, DefaultService: { ...actual.DefaultService, productsList: vi.fn(), packagesList: vi.fn() } };
});

describe("CatalogManager", () => {
  it("shows products and packages returned by the catalog API", async () => {
    vi.mocked(DefaultService.productsList).mockResolvedValue({ items: [{ id: "p1", name: "Vitamina D", price: 90, applicationCount: 1, isActive: true }], page: 1, pageSize: 100, total: 1 });
    vi.mocked(DefaultService.packagesList).mockResolvedValue({ items: [{ id: "k1", name: "Plano Vitamina", price: 320, isActive: true, items: [] }], page: 1, pageSize: 100, total: 1 });

    renderWithProviders(<CatalogManager />);

    expect(await screen.findByText("Vitamina D")).toBeVisible();
    expect(await screen.findByText("Plano Vitamina")).toBeVisible();
  });
});
