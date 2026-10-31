import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { CommissionRule, type CommissionSettings } from "@/generated";
import { DefaultService } from "@/services/api";
import { CommissionSettingsPanel } from "./commission-settings";

const settings: CommissionSettings = {
  appointmentSale: { enabled: false, mode: CommissionRule.mode.FIXED, value: 0, basis: CommissionRule.basis.DEPOSIT },
  completedAppointment: { enabled: false, mode: CommissionRule.mode.FIXED, value: 0, basis: CommissionRule.basis.CONSULTATION },
  productReferral: { enabled: false, mode: CommissionRule.mode.PERCENTAGE, value: 10, basis: CommissionRule.basis.PRODUCT_RECEIVED },
};
beforeEach(() => { vi.restoreAllMocks(); vi.spyOn(DefaultService, "commissionSettingsGet").mockResolvedValue(settings); });

it("saves custom rules, preserves them on reload and allows disabling a rule", async () => {
  const save = vi.spyOn(DefaultService, "commissionSettingsUpdate").mockResolvedValue({
    ...settings,
    appointmentSale: { ...settings.appointmentSale, enabled: true, value: 25.5 },
    productReferral: { ...settings.productReferral, enabled: true, value: 12, basis: CommissionRule.basis.PRODUCT_SALE },
  });
  const view = renderWithProviders(<CommissionSettingsPanel />);
  const sale = within(await screen.findByRole("group", { name: "Venda de consulta" }));
  fireEvent.click(sale.getByRole("checkbox"));
  fireEvent.change(sale.getByLabelText("Valor por ocorrência (R$)"), { target: { value: "25.50" } });
  const referral = within(screen.getByRole("group", { name: "Indicação de produtos" }));
  fireEvent.click(referral.getByRole("checkbox"));
  fireEvent.change(referral.getByLabelText("Percentual (%)"), { target: { value: "12" } });
  fireEvent.change(referral.getByLabelText("Base de cálculo"), { target: { value: "ProductSale" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar regras" }));
  expect(await screen.findByText("Regras de comissão salvas.")).toBeVisible();
  const saved = save.mock.calls[0][0];
  expect(saved.appointmentSale).toEqual({ ...settings.appointmentSale, enabled: true, value: 25.5 });
  expect(saved.productReferral).toEqual({ ...settings.productReferral, enabled: true, value: 12, basis: "ProductSale" });
  expect(saved.completedAppointment).toEqual(settings.completedAppointment);
  view.unmount();
  vi.mocked(DefaultService.commissionSettingsGet).mockResolvedValue(saved);
  renderWithProviders(<CommissionSettingsPanel />);
  const reloaded = within(await screen.findByRole("group", { name: "Venda de consulta" }));
  expect(reloaded.getByLabelText("Valor por ocorrência (R$)")).toHaveValue(25.5);
  fireEvent.click(reloaded.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Salvar regras" }));
  await waitFor(() => expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ appointmentSale: { ...saved.appointmentSale, enabled: false } })));
});

it("keeps edits after a save error and supports retry", async () => {
  const save = vi.spyOn(DefaultService, "commissionSettingsUpdate").mockRejectedValueOnce({ body: { detail: "Falha ao salvar." } }).mockResolvedValue(settings);
  renderWithProviders(<CommissionSettingsPanel />);
  fireEvent.click(await screen.findByRole("checkbox", { name: "Ativar indicação de produtos" }));
  fireEvent.click(screen.getByRole("button", { name: "Salvar regras" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Falha ao salvar.");
  expect(screen.getByRole("checkbox", { name: "Ativar indicação de produtos" })).toBeChecked();
  fireEvent.click(screen.getByRole("button", { name: "Salvar regras" }));
  expect(await screen.findByText("Regras de comissão salvas.")).toBeVisible();
  expect(save).toHaveBeenCalledTimes(2);
});

it("does not offer a save when loading fails", async () => {
  vi.mocked(DefaultService.commissionSettingsGet).mockRejectedValue(new Error("offline"));
  renderWithProviders(<CommissionSettingsPanel />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar");
  expect(screen.queryByRole("button", { name: "Salvar regras" })).not.toBeInTheDocument();
  vi.mocked(DefaultService.commissionSettingsGet).mockResolvedValue(settings);
  fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
  expect(await screen.findByRole("group", { name: "Venda de consulta" })).toBeVisible();
});
