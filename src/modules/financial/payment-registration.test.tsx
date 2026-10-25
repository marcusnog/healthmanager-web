import { fireEvent, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { FinancialOverview } from "./financial-overview";
import { DefaultService } from "@/services/api";
import { Permissions } from "@/lib/permissions";

vi.mock("@/services/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/services/api")>(),
  professionalSettlementsList: vi.fn().mockResolvedValue([]),
}));

it("registra um pagamento para paciente sem recebível ou consulta", async () => {
  const manual = vi.spyOn(DefaultService, "receivablesManual").mockResolvedValue({});
  const linked = vi.spyOn(DefaultService, "paymentsCreate");
  const noop = () => {};
  renderWithProviders(<FinancialOverview
    receivables={[]} patients={[{ id: "patient-1", name: "Paciente avulso" }]} payments={[]}
    page={1} pageSize={20} total={0} status={undefined} dateFrom={undefined} dateTo={undefined}
    paymentPage={1} paymentDateFrom={undefined} paymentDateTo={undefined} paymentReceivableId={undefined} paymentDestinationBank={undefined}
    onPageChange={noop} onStatusChange={noop} onDateFromChange={noop} onDateToChange={noop}
    onPaymentPageChange={noop} onPaymentReceivableIdChange={noop} onPaymentDateFromChange={noop} onPaymentDateToChange={noop} onPaymentDestinationBankChange={noop}
    expenses={[]} expensePage={1} expenseTotal={0} expenseCategory={undefined} expenseStatus={undefined} expenseDateFrom={undefined} expenseDateTo={undefined}
    onExpensePageChange={noop} onExpenseCategoryChange={noop} onExpenseStatusChange={noop} onExpenseDateFromChange={noop} onExpenseDateToChange={noop}
    summary={{ totalReceived: 0, totalExpenses: 0, balance: 0, grossReceived: 0, professionalLiability: 0, ownerReceivable: 0 }}
    expenseCategories={[]} onManageExpenseCategories={noop} paymentIntents={[]} paymentIntentPage={1} paymentIntentTotal={0} paymentIntentStatus={undefined}
    onPaymentIntentPageChange={noop} onPaymentIntentStatusChange={noop}
    permissions={[Permissions.FinanceReceivablesView, Permissions.FinanceReceivablesManage]}
  />);
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
