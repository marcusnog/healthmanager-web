import { screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { ReportsPanel } from "./reports-panel";

vi.mock("@/lib/auth-session", () => ({ readAuthSession: () => ({ clinicId: "clinic", email: "admin" }) }));
vi.mock("@/services/api", () => ({}));
vi.mock("./evidence-search", () => ({ EvidenceSearch: () => null }));
vi.mock("@/generated", () => ({ ReportsService: {
  reportsDirectory: vi.fn().mockResolvedValue({ today: "2026-11-26", sources: [], reports: [{ id: "novos-agendamentos", group: "Agenda", title: "Novos agendamentos", purpose: "Reservas", calculation: "Sinais" }] }),
  reportsRun: vi.fn().mockResolvedValue({ rows: [
    { label: "Total", metrics: [{ label: "Pacientes", value: 1, unit: "numero" }, { label: "Reservas pagas", value: 60, unit: "brl" }] },
    { label: "Maria · 26/11/2026", metrics: [{ label: "Pacientes", value: 1, unit: "numero" }, { label: "Reservas pagas", value: 60, unit: "brl" }] },
  ] }),
} }));

it("mostra o paciente e oferece exportação do relatório", async () => {
  renderWithProviders(<ReportsPanel />);
  expect(await screen.findByText("Maria · 26/11/2026")).toBeVisible();
  expect(screen.getByRole("button", { name: "Exportar PDF" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Exportar Excel" })).toBeEnabled();
});
