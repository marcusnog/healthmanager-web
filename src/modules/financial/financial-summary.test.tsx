import { fireEvent, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { FinancialOverview } from "./financial-overview";
import { professionalSettlementsList } from "@/services/api";
import { Permissions } from "@/lib/permissions";

vi.mock("@/services/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/services/api")>(),
  professionalSettlementsList: vi.fn().mockResolvedValue([]),
}));

it("separa despesas e resultado mensal dos indicadores de repasses", async () => {
  vi.mocked(professionalSettlementsList).mockResolvedValue([
    { professionalId: "doctor-1", professionalName: "Medico", accrued: 300, paid: 100, outstanding: 200, items: [], settledItems: [] },
  ]);
  const noop = () => {};
  const view = (totalExpenses: number) => <FinancialOverview
    receivables={[]} patients={[{ id: "patient-1", name: "Paciente avulso" }]} payments={[]}
    page={1} pageSize={20} total={0} status={undefined} dateFrom={undefined} dateTo={undefined}
    paymentPage={1} paymentDateFrom={undefined} paymentDateTo={undefined} paymentReceivableId={undefined} paymentDestinationBank={undefined}
    onPageChange={noop} onStatusChange={noop} onDateFromChange={noop} onDateToChange={noop}
    onPaymentPageChange={noop} onPaymentReceivableIdChange={noop} onPaymentDateFromChange={noop} onPaymentDateToChange={noop} onPaymentDestinationBankChange={noop}
    expenses={[]} expensePage={1} expenseTotal={0} expenseCategory={undefined} expenseStatus={undefined} expenseDateFrom={undefined} expenseDateTo={undefined}
    onExpensePageChange={noop} onExpenseCategoryChange={noop} onExpenseStatusChange={noop} onExpenseDateFromChange={noop} onExpenseDateToChange={noop}
    summary={{ totalReceived: 100, totalExpenses, balance: 100 - totalExpenses, grossReceived: 300, professionalLiability: 200, ownerReceivable: 0 }}
    expenseCategories={[]} onManageExpenseCategories={noop} paymentIntents={[]} paymentIntentPage={1} paymentIntentTotal={0} paymentIntentStatus={undefined}
    onPaymentIntentPageChange={noop} onPaymentIntentStatusChange={noop}
    permissions={[Permissions.FinanceReceivablesView, Permissions.FinanceReceivablesManage, Permissions.FinanceSettlements]}
  />;
  const { rerender } = renderWithProviders(view(0));
  expect(screen.getByText("Resultado do mes")).toBeVisible();
  expect(screen.queryByText("Saldo a repassar")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Repasses" }));
  await waitFor(() => expect(screen.getByText("Acumulado").parentElement).toHaveTextContent("300,00"));
  expect(screen.getByText("Pendente").parentElement).toHaveTextContent("200,00");
  rerender(view(311.47));
  expect(screen.queryByText("Resultado do mes")).not.toBeInTheDocument();
  expect(screen.queryByText("Despesas pagas no mes")).not.toBeInTheDocument();
  expect(screen.getByText("Acumulado").parentElement).toHaveTextContent("300,00");
  expect(screen.getByText("Ja repassado").parentElement).toHaveTextContent("100,00");
  expect(screen.getByText("Pendente").parentElement).toHaveTextContent("200,00");
  fireEvent.click(screen.getByRole("button", { name: "Contas a receber" }));
  expect(screen.getByText("Despesas pagas no mes").parentElement).toHaveTextContent("311,47");
  expect(screen.getByText("Resultado do mes").parentElement).toHaveTextContent("-R$ 211,47");
});
