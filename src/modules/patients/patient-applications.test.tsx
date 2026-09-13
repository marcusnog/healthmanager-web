import { screen } from "@testing-library/react";
import { vi } from "vitest";
import { DefaultService, PatientApplicationsService } from "@/generated";
import { readStoredSessionState } from "@/lib/auth-session";
import { renderWithProviders } from "@/test/render";
import { PatientApplicationsModal } from "./patient-applications";

vi.mock("@/generated", async importOriginal => {
  const actual = await importOriginal<typeof import("@/generated")>();
  return {
    ...actual,
    DefaultService: { ...actual.DefaultService, productsList: vi.fn(), packagesList: vi.fn() },
    PatientApplicationsService: {
      ...actual.PatientApplicationsService,
      patientApplicationBalanceList: vi.fn(),
      patientApplicationsList: vi.fn(),
      patientApplicationBalanceGrant: vi.fn(),
      patientApplicationsCreate: vi.fn(),
    },
  };
});

vi.mock("@/lib/auth-session", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/auth-session")>();
  return { ...actual, readStoredSessionState: vi.fn() };
});

const balance = {
  id: "b1", productId: "p1", productName: "Vitamina D", source: "Package",
  packageId: "k1", packageName: "Plano Vitamina", purchasedUnits: 4, usedUnits: 1, remainingUnits: 3,
};

const productList = { items: [{ id: "p1", name: "Vitamina D", price: 90, applicationCount: 1, isActive: true }], page: 1, pageSize: 100, total: 1 };

function mockData(role: "Doctor" | "Admin") {
  vi.mocked(readStoredSessionState).mockReturnValue({ role, clinicName: "Clinica Aurora" } as never);
  vi.mocked(PatientApplicationsService.patientApplicationBalanceList).mockResolvedValue([balance]);
  vi.mocked(PatientApplicationsService.patientApplicationsList).mockResolvedValue([
    { id: "a1", productId: "p1", productName: "Vitamina D", quantity: 1, appliedAt: "2026-09-01T10:00:00Z", doctorId: "d1", doctorName: "Dr. Henrique Lima", notes: null },
  ]);
  vi.mocked(DefaultService.productsList).mockResolvedValue(productList);
  vi.mocked(DefaultService.packagesList).mockResolvedValue({ items: [{ id: "k1", name: "Plano Vitamina", price: 320, isActive: true, items: [] }], page: 1, pageSize: 100, total: 1 });
}

describe("PatientApplicationsModal", () => {
  it("shows saldo and historico for the patient", async () => {
    mockData("Doctor");

    renderWithProviders(<PatientApplicationsModal patientId="p1" patientName="Ana Martins" onClose={vi.fn()} />);

    expect(await screen.findByText("Saldo disponivel")).toBeVisible();
    expect(await screen.findByText("3 restante(s)")).toBeVisible();
    expect(await screen.findByText("Historico de aplicacoes")).toBeVisible();
    expect(await screen.findByText(/Dr\. Henrique Lima/)).toBeVisible();
  });

  it("doctor can register an application; admin can grant balance", async () => {
    mockData("Doctor");
    const { unmount } = renderWithProviders(<PatientApplicationsModal patientId="p1" patientName="Ana Martins" onClose={vi.fn()} />);
    expect(await screen.findByRole("button", { name: "Registrar aplicacao" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Conceder saldo" })).not.toBeInTheDocument();
    unmount();

    mockData("Admin");
    renderWithProviders(<PatientApplicationsModal patientId="p1" patientName="Ana Martins" onClose={vi.fn()} />);
    expect(await screen.findByRole("button", { name: "Conceder saldo" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Registrar aplicacao" })).not.toBeInTheDocument();
  });
});