import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { FinancialOverview } from "./financial-overview";
import { DefaultService, professionalSettlementsList } from "@/services/api";
import { Permissions, type Permission } from "@/lib/permissions";

vi.mock("@/services/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/services/api")>(),
  professionalSettlementsList: vi.fn().mockResolvedValue([]),
}));

beforeEach(() => vi.mocked(professionalSettlementsList).mockResolvedValue([]));

const initialPatients = Array.from({ length: 100 }, (_, index) => ({
  id: `patient-${index + 1}`, name: `Paciente ${String(index + 1).padStart(3, "0")}`,
}));
const lastPatient = { id: "patient-101", name: "Zélia Teste" };

afterEach(() => vi.restoreAllMocks());

it("busca a 101ª paciente pelo nome e registra o pagamento avulso no cadastro dela", async () => {
  const clinicPatients = [...initialPatients, lastPatient];
  const searchTerm = "Zélia";
  const patientsList = vi.spyOn(DefaultService, "patientsList").mockResolvedValue({
    items: clinicPatients.filter(patient => patient.name.includes(searchTerm)), total: 1,
  });
  const manual = vi.spyOn(DefaultService, "receivablesManual").mockResolvedValue({});
  const linked = vi.spyOn(DefaultService, "paymentsCreate");
  renderOverview();
  fireEvent.click(screen.getByRole("button", { name: "+ Registrar pagamento" }));
  const input = screen.getByRole("combobox", { name: "Paciente" });
  fireEvent.change(input, { target: { value: searchTerm } });
  expect(await screen.findByRole("option", { name: /Zélia Teste/ })).toBeVisible();
  expect(patientsList).toHaveBeenCalledWith(1, 20, searchTerm, "name", "asc");
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(input).toHaveValue(lastPatient.name);
  expect(screen.getByText("Pagamento sem consulta")).toBeVisible();
  fireEvent.change(screen.getByLabelText("Valor"), { target: { value: "75" } });
  fireEvent.click(screen.getByRole("button", { name: "Confirmar pagamento" }));
  await waitFor(() => expect(manual).toHaveBeenCalledWith(expect.objectContaining({ patientId: lastPatient.id, amount: 75, paymentMethod: "Pix" })));
  expect(linked).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.getByText("Pagamento registrado com sucesso.")).toBeVisible());
});

it("identifica a paciente fora do catálogo ao abrir pela cobrança e limpa o vínculo ao trocar o nome", () => {
  renderOverview([], undefined, [{ id: "receivable-1", patientId: lastPatient.id, patientName: lastPatient.name, status: "Pending", outstandingAmount: 75 }]);
  fireEvent.click(screen.getByRole("button", { name: "Registrar pagamento" }));
  const input = screen.getByRole("combobox", { name: "Paciente" });
  expect(input).toHaveValue(lastPatient.name);
  expect(screen.getByText(/Pagamento: Zélia Teste/)).toBeVisible();
  fireEvent.change(input, { target: { value: "Paciente 001" } });
  expect(screen.queryByRole("button", { name: "Confirmar pagamento" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Paciente 001/ }));
  expect(screen.getByText("Pagamento sem consulta")).toBeVisible();
});

function renderOverview(payments: import("@/generated").PaymentResponse[] = [], permissions: Permission[] = [Permissions.FinanceReceivablesView, Permissions.FinanceReceivablesManage], receivables: import("@/generated").ReceivableResponse[] = []) {
  const noop = () => {};
  renderWithProviders(<FinancialOverview
    receivables={receivables} patients={initialPatients} payments={payments}
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
  vi.spyOn(DefaultService, "usersList").mockResolvedValue([]);
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
