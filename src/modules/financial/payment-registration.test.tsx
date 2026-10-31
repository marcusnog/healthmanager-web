import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { FinancialOverview } from "./financial-overview";
import { DefaultService, professionalSettlementsList } from "@/services/api";
import { Permissions } from "@/lib/permissions";

vi.mock("@/services/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/services/api")>(),
  professionalSettlementsList: vi.fn().mockResolvedValue([]),
}));

beforeEach(() => vi.mocked(professionalSettlementsList).mockResolvedValue([]));

it("registra um pagamento para paciente sem recebível ou consulta", async () => {
  const manual = vi.spyOn(DefaultService, "receivablesManual").mockResolvedValue({});
  const linked = vi.spyOn(DefaultService, "paymentsCreate");
  renderOverview();
  fireEvent.click(screen.getByRole("button", { name: "+ Registrar pagamento" }));
  fireEvent.change(screen.getByLabelText("Selecione o paciente"), { target: { value: "patient-1" } });
  expect(screen.getByText("Pagamento sem consulta")).toBeVisible();
  fireEvent.change(screen.getByLabelText("Valor"), { target: { value: "75" } });
  fireEvent.click(screen.getByRole("button", { name: "Confirmar pagamento" }));
  await waitFor(() => expect(manual).toHaveBeenCalledWith(expect.objectContaining({ patientId: "patient-1", amount: 75, paymentMethod: "Pix" })));
  expect(linked).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.getByText("Pagamento registrado com sucesso.")).toBeVisible());
  vi.restoreAllMocks();
});

function renderOverview(payments: import("@/generated").PaymentResponse[] = [], permissions = [Permissions.FinanceReceivablesView, Permissions.FinanceReceivablesManage]) {
  const noop = () => {};
  renderWithProviders(<FinancialOverview
    receivables={[]} patients={[{ id: "patient-1", name: "Paciente avulso" }]} payments={payments}
    page={1} pageSize={20} total={0} status={undefined} dateFrom={undefined} dateTo={undefined}
    paymentPage={1} paymentDateFrom={undefined} paymentDateTo={undefined} paymentReceivableId={undefined} paymentDestinationBank={undefined}
    onPageChange={noop} onStatusChange={noop} onDateFromChange={noop} onDateToChange={noop}
    onPaymentPageChange={noop} onPaymentReceivableIdChange={noop} onPaymentDateFromChange={noop} onPaymentDateToChange={noop} onPaymentDestinationBankChange={noop}
    expenses={[]} expensePage={1} expenseTotal={0} expenseCategory={undefined} expenseStatus={undefined} expenseDateFrom={undefined} expenseDateTo={undefined}
    onExpensePageChange={noop} onExpenseCategoryChange={noop} onExpenseStatusChange={noop} onExpenseDateFromChange={noop} onExpenseDateToChange={noop}
    summary={{ totalReceived: 0, totalExpenses: 0, balance: 0, grossReceived: 0, professionalLiability: 0, ownerReceivable: 0 }}
    expenseCategories={[]} onManageExpenseCategories={noop} paymentIntents={[]} paymentIntentPage={1} paymentIntentTotal={0} paymentIntentStatus={undefined}
    onPaymentIntentPageChange={noop} onPaymentIntentStatusChange={noop}
    permissions={permissions}
  />);
}

it("confirms payment deletion and reports protected settlements", async () => {
  const remove = vi.spyOn(DefaultService, "paymentsDelete").mockRejectedValueOnce({ body: { detail: "Pagamento com repasse realizado." } }).mockResolvedValueOnce(undefined);
  const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValue(true);
  renderOverview([{ id: "payment-1", amount: 100, patientName: "Paciente" }]);
  fireEvent.click(screen.getByRole("button", { name: "Pagamentos" }));
  fireEvent.click(screen.getByRole("button", { name: "Excluir pagamento" }));
  expect(remove).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Excluir pagamento" }));
  expect(await screen.findByText("Pagamento com repasse realizado.")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Excluir pagamento" }));
  expect(await screen.findByText("Pagamento excluido. Saldo atualizado.")).toBeVisible();
  expect(remove).toHaveBeenCalledWith("payment-1");
  confirm.mockRestore();
  vi.restoreAllMocks();
});

it("hides payment deletion for read-only finance users", () => {
  renderOverview([{ id: "payment-1", amount: 100 }], [Permissions.FinanceReceivablesView]);
  fireEvent.click(screen.getByRole("button", { name: "Pagamentos" }));
  expect(screen.queryByRole("button", { name: "Excluir pagamento" })).not.toBeInTheDocument();
});


it("opens commissions inside settlements and preserves professional settlements", async () => {
  vi.spyOn(DefaultService, "commissionSettingsGet").mockResolvedValue({
    appointmentSale: { enabled: false, mode: "Fixed", value: 0, basis: "Deposit" },
    completedAppointment: { enabled: false, mode: "Fixed", value: 0, basis: "Consultation" },
    productReferral: { enabled: false, mode: "Percentage", value: 10, basis: "ProductReceived" },
  } as import("@/generated").CommissionSettings);
  renderOverview([], [Permissions.FinanceSettlements]);
  expect(screen.getByText("Repasses aos profissionais")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Comissões" }));
  expect(screen.getByRole("button", { name: "Comissões" })).toHaveAttribute("aria-pressed", "true");
  expect(await screen.findByText("Venda de consulta")).toBeVisible();
  expect(screen.getByText("Consulta realizada")).toBeVisible();
  expect(screen.getByText("Indicação de produtos")).toBeVisible();
  expect(screen.queryByText("Repasses aos profissionais")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Profissionais" }));
  expect(screen.getByText("Repasses aos profissionais")).toBeVisible();
});

it("hides settlements and commissions without settlement permission", () => {
  renderOverview();
  expect(screen.queryByRole("button", { name: "Repasses" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Comissões" })).not.toBeInTheDocument();
});
