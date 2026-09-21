import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { CatalogManager } from "./catalog-manager";

const { packagesList, packagesUpdate, productsList, productsUpdate } = vi.hoisted(() => ({
  packagesList: vi.fn(),
  packagesUpdate: vi.fn(),
  productsList: vi.fn(),
  productsUpdate: vi.fn(),
}));

vi.mock("@/services/api", () => ({
  DefaultService: {
    packagesCreate: vi.fn(),
    packagesDelete: vi.fn(),
    packagesList,
    packagesUpdate,
    productsCreate: vi.fn(),
    productsDelete: vi.fn(),
    productsList,
    productsUpdate,
  },
}));

const product = { id: "p1", name: "Vitamina D", price: 90, applicationCount: 1, isActive: true };
const packageItem = { productId: "p1", productName: "Vitamina D", applicationCount: 1 };
const catalogPackage = { id: "k1", name: "Plano Vitamina", price: 320, isActive: true, items: [packageItem] };

function mockCatalog() {
  productsList.mockResolvedValue({ items: [product], page: 1, pageSize: 100, total: 1 });
  packagesList.mockResolvedValue({ items: [catalogPackage], page: 1, pageSize: 100, total: 1 });
}

describe("CatalogManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCatalog();
  });

  it("shows products and packages returned by the catalog API", async () => {
    renderWithProviders(<CatalogManager />);

    expect(await screen.findByText("Vitamina D")).toBeVisible();
    expect(await screen.findByText("Plano Vitamina")).toBeVisible();
  });

  it("updates products and packages through the authenticated API client", async () => {
    productsUpdate.mockResolvedValue({ ...product, name: "Vitamina D Plus" });
    packagesUpdate.mockResolvedValue({ ...catalogPackage, name: "Plano Premium" });

    renderWithProviders(<CatalogManager />);
    await screen.findByText("Vitamina D");

    fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[0]);
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Vitamina D Plus" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(productsUpdate).toHaveBeenCalledWith("p1", {
      applicationCount: 1,
      isActive: true,
      name: "Vitamina D Plus",
      price: 90,
    }));

    fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[1]);
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Plano Premium" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(packagesUpdate).toHaveBeenCalledWith("k1", {
      isActive: true,
      items: [{ applicationCount: 1, productId: "p1" }],
      name: "Plano Premium",
      price: 320,
    }));
  });

  it("shows the backend detail when an update fails", async () => {
    productsUpdate.mockRejectedValue({ body: { detail: "Produto duplicado nesta clinica." } });

    renderWithProviders(<CatalogManager />);
    await screen.findByText("Vitamina D");

    fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Produto duplicado nesta clinica.")).toBeVisible();
  });

  it("shows the backend detail when a package update fails", async () => {
    packagesUpdate.mockRejectedValue({ body: { detail: "Produto inativo no pacote." } });

    renderWithProviders(<CatalogManager />);
    await screen.findByText("Plano Vitamina");

    fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[1]);
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Produto inativo no pacote.")).toBeVisible();
  });
});
