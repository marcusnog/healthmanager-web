import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DefaultService, expenseSave, expenseDelete } from "@/services/api";
import type { ReceivableResponse, PaymentResponse, PatientResponse, CreateManualReceivableRequest } from "@/generated";
import { formatCurrency } from "@/lib/formatters";
import {
  StatusBadge,
  resolveReceivableStatus,
  resolveExpenseStatus,
  EXPENSE_CATEGORY_LABELS,
} from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";

type Tab = "receivables" | "expenses" | "payments";

const paymentSchema = z.object({
  amount: z.coerce.number().positive("Informe um valor valido."),
  paymentMethod: z.enum(["Cash", "Pix", "CreditCard", "DebitCard", "Insurance"]),
  paidAt: z.string().min(1, "Informe a data do pagamento."),
  notes: z.string().optional(),
});

const expenseFormSchema = z.object({
  description: z.string().min(1, "Informe a descricao."),
  amount: z.coerce.number().positive("Informe um valor valido."),
  category: z.enum(["Supplies", "Equipment", "Salary", "Marketing", "Utilities", "Rent", "Other"]),
  paymentMethod: z.enum(["Cash", "Pix", "CreditCard", "DebitCard", "Insurance"]),
  paidAt: z.string().min(1, "Informe a data."),
  status: z.enum(["Paid", "Pending", "Cancelled"]),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;
type PaymentFormInput = z.input<typeof paymentSchema>;
type ExpenseFormValues = z.infer<typeof expenseFormSchema>;
type ExpenseFormInput = z.input<typeof expenseFormSchema>;

interface ExpenseResponse {
  id: string;
  description: string;
  amount: number;
  category: string;
  paymentMethod: string;
  paidAt: string;
  status: string;
  notes?: string;
}

interface FinancialSummary {
  totalReceived: number;
  totalExpenses: number;
  balance: number;
}

const RECEIVABLE_STATUS_FILTERS = [
  { key: undefined, label: "Todos" },
  { key: "Pending" as const, label: "Pendente" },
  { key: "Partial" as const, label: "Parcial" },
  { key: "Paid" as const, label: "Pago" },
];

const EXPENSE_STATUS_FILTERS = [
  { key: undefined, label: "Todos" },
  { key: "Paid" as const, label: "Pago" },
  { key: "Pending" as const, label: "Pendente" },
  { key: "Cancelled" as const, label: "Cancelado" },
];

const EXPENSE_CATEGORY_FILTERS = [
  { key: undefined, label: "Todas" },
  { key: "Supplies", label: "Insumos" },
  { key: "Equipment", label: "Equipamentos" },
  { key: "Salary", label: "Salarios" },
  { key: "Marketing", label: "Marketing" },
  { key: "Utilities", label: "Contas" },
  { key: "Rent", label: "Aluguel" },
  { key: "Other", label: "Outros" },
];

export function FinancialOverview({
  receivables,
  page,
  pageSize,
  total,
  status,
  dateFrom,
  dateTo,
  patients,
  payments,
  paymentPage,
  paymentDateFrom,
  paymentDateTo,
  paymentReceivableId,
  onPageChange,
  onStatusChange,
  onDateFromChange,
  onDateToChange,
  onPaymentPageChange,
  onPaymentReceivableIdChange,
  onPaymentDateFromChange,
  onPaymentDateToChange,
  expenses,
  expensePage,
  expenseTotal,
  expenseCategory,
  expenseStatus,
  expenseDateFrom,
  expenseDateTo,
  onExpensePageChange,
  onExpenseCategoryChange,
  onExpenseStatusChange,
  onExpenseDateFromChange,
  onExpenseDateToChange,
  summary,
}: {
  receivables: ReceivableResponse[];
  page: number;
  pageSize: number;
  total: number;
  status: "Pending" | "Partial" | "Paid" | undefined;
  dateFrom: string | undefined;
  dateTo: string | undefined;
  patients: PatientResponse[];
  payments: PaymentResponse[];
  paymentPage: number;
  paymentDateFrom: string | undefined;
  paymentDateTo: string | undefined;
  paymentReceivableId: string | undefined;
  onPageChange: (page: number) => void;
  onStatusChange: (status: "Pending" | "Partial" | "Paid" | undefined) => void;
  onDateFromChange: (value: string | undefined) => void;
  onDateToChange: (value: string | undefined) => void;
  onPaymentPageChange: (page: number) => void;
  onPaymentReceivableIdChange: (value: string | undefined) => void;
  onPaymentDateFromChange: (value: string | undefined) => void;
  onPaymentDateToChange: (value: string | undefined) => void;
  expenses: ExpenseResponse[];
  expensePage: number;
  expenseTotal: number;
  expenseCategory: string | undefined;
  expenseStatus: string | undefined;
  expenseDateFrom: string | undefined;
  expenseDateTo: string | undefined;
  onExpensePageChange: (page: number) => void;
  onExpenseCategoryChange: (value: string | undefined) => void;
  onExpenseStatusChange: (value: string | undefined) => void;
  onExpenseDateFromChange: (value: string | undefined) => void;
  onExpenseDateToChange: (value: string | undefined) => void;
  summary: FinancialSummary;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("receivables");
  const [showPayments, setShowPayments] = useState(false);
  const [showReceivableRegister, setShowReceivableRegister] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseResponse | null>(null);
  const [registerMode, setRegisterMode] = useState<"patient" | "expense">("patient");
  const [selectedPatientId, setSelectedPatientId] = useState<string | undefined>(undefined);
  const [selectedPatientReceivable, setSelectedPatientReceivable] = useState<ReceivableResponse | undefined>(undefined);
  const [feedback, setFeedback] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const totalPages = Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));
  const expenseTotalPages = Math.max(1, Math.ceil(expenseTotal / Math.max(20, 1)));

  const patientReceivables = selectedPatientId
    ? receivables.filter((r) => r.patientId === selectedPatientId && r.status !== "Paid")
    : [];

  const {
    register: registerPayment,
    handleSubmit: handlePaymentSubmit,
    reset: resetPayment,
    formState: { errors: paymentErrors },
  } = useForm<PaymentFormInput, undefined, PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: 50, paymentMethod: "Pix", paidAt: new Date().toISOString().slice(0, 16), notes: "" },
  });

  const {
    register: registerExpenseForm,
    handleSubmit: handleExpenseFormSubmit,
    reset: resetExpenseForm,
    setValue: setExpenseFormValue,
    formState: { errors: expenseFormErrors },
  } = useForm<ExpenseFormInput, undefined, ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      description: "", amount: 50, category: "Other",
      paymentMethod: "Pix", paidAt: new Date().toISOString().slice(0, 16),
      status: "Paid", notes: "",
    },
  });

  const invalidateFinancial = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["receivables"] }),
    queryClient.invalidateQueries({ queryKey: ["payments"] }),
    queryClient.invalidateQueries({ queryKey: ["expenses"] }),
    queryClient.invalidateQueries({ queryKey: ["financial-summary"] }),
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
  ]);

  const registerPaymentMutation = useMutation({
    mutationFn: async ({ receivableId, values }: { receivableId: string; values: PaymentFormValues }) =>
      DefaultService.paymentsCreate({
        receivableId, amount: values.amount, paymentMethod: values.paymentMethod,
        paidAt: new Date(values.paidAt).toISOString(), notes: values.notes || undefined,
      }),
    onSuccess: async () => {
      setFeedback("Pagamento registrado com sucesso.");
      setShowReceivableRegister(false);
      setSelectedPatientReceivable(undefined);
      setSelectedPatientId(undefined);
      resetPayment({ amount: 50, paymentMethod: "Pix", paidAt: new Date().toISOString().slice(0, 16), notes: "" });
      await invalidateFinancial();
    },
    onError: () => setFeedback("Nao foi possivel registrar o pagamento agora."),
  });

  const onPaymentFormSubmit = handlePaymentSubmit(async (values) => {
    if (!selectedPatientReceivable?.id) return;
    setFeedback(null);
    await registerPaymentMutation.mutateAsync({ receivableId: selectedPatientReceivable.id, values });
  });

  const saveExpenseMutation = useMutation({
    mutationFn: async (values: ExpenseFormValues & { id?: string }) => {
      const body = {
        description: values.description, amount: values.amount, category: values.category,
        paymentMethod: values.paymentMethod, paidAt: new Date(values.paidAt).toISOString(),
        status: values.status, notes: values.notes || undefined,
      };
      return expenseSave(values.id, body);
    },
    onSuccess: async () => {
      setFeedback(editingExpense ? "Despesa atualizada." : "Despesa registrada.");
      setShowExpenseForm(false);
      setEditingExpense(null);
      resetExpenseForm();
      await invalidateFinancial();
    },
    onError: () => setFeedback("Nao foi possivel salvar a despesa."),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) => expenseDelete(id),
    onSuccess: async () => {
      setFeedback("Despesa excluida.");
      await invalidateFinancial();
    },
    onError: () => setFeedback("Nao foi possivel excluir a despesa."),
  });

  const onExpenseFormSubmit = handleExpenseFormSubmit(async (values) => {
    setFeedback(null);
    await saveExpenseMutation.mutateAsync(values);
  });

  const startQuickPayment = (receivable: ReceivableResponse) => {
    setFeedback(null);
    setRegisterMode("patient");
    setSelectedPatientId(receivable.patientId ?? undefined);
    setSelectedPatientReceivable(receivable);
    setShowReceivableRegister(true);
  };

  const openNewExpense = () => {
    setEditingExpense(null);
    resetExpenseForm({
      description: "", amount: 50, category: "Other",
      paymentMethod: "Pix", paidAt: new Date().toISOString().slice(0, 16),
      status: "Paid", notes: "",
    });
    setShowExpenseForm(true);
  };

  const openEditExpense = (expense: ExpenseResponse) => {
    setEditingExpense(expense);
    setExpenseFormValue("description", expense.description);
    setExpenseFormValue("amount", expense.amount);
    setExpenseFormValue("category", expense.category as any);
    setExpenseFormValue("paymentMethod", expense.paymentMethod as any);
    setExpenseFormValue("paidAt", expense.paidAt ? new Date(expense.paidAt).toISOString().slice(0, 16) : "");
    setExpenseFormValue("status", expense.status as any);
    setExpenseFormValue("notes", expense.notes ?? "");
    setShowExpenseForm(true);
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "receivables", label: "Recebiveis" },
    { key: "expenses", label: "Despesas" },
    { key: "payments", label: "Pagamentos" },
  ];

  return (
    <>
      {/* Summary cards */}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-[var(--border)] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Receitas do mes</p>
          <p className="mt-1 text-xl font-bold text-green-600">{formatCurrency(summary.totalReceived)}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Despesas do mes</p>
          <p className="mt-1 text-xl font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Saldo do mes</p>
          <p className={cn("mt-1 text-xl font-bold", summary.balance >= 0 ? "text-green-600" : "text-red-600")}>
            {formatCurrency(summary.balance)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="toolbar-inline mb-4 border-b border-[var(--border)] pb-2">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            className={cn("btn btn-sm", activeTab === key ? "btn-brand-outline" : "btn-ghost")}
            onClick={() => setActiveTab(key)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Expense form modal */}
      {showExpenseForm ? (
        <Modal title={editingExpense ? "Editar despesa" : "Nova despesa"} onClose={() => { setShowExpenseForm(false); setEditingExpense(null); }}>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onExpenseFormSubmit}>
            <div className="md:col-span-2">
              <Field error={expenseFormErrors.description?.message} label="Descricao">
                <input className="input-field" {...registerExpenseForm("description")} />
              </Field>
            </div>
            <Field error={expenseFormErrors.amount?.message} label="Valor">
              <input className="input-field" min={0.01} step="0.01" type="number" {...registerExpenseForm("amount")} />
            </Field>
            <Field error={expenseFormErrors.category?.message} label="Categoria">
              <select className="input-field" {...registerExpenseForm("category")}>
                <option value="Supplies">Insumos</option>
                <option value="Equipment">Equipamentos</option>
                <option value="Salary">Salarios</option>
                <option value="Marketing">Marketing</option>
                <option value="Utilities">Contas (agua, luz, internet)</option>
                <option value="Rent">Aluguel</option>
                <option value="Other">Outros</option>
              </select>
            </Field>
            <Field error={expenseFormErrors.paymentMethod?.message} label="Forma de pagamento">
              <select className="input-field" {...registerExpenseForm("paymentMethod")}>
                <option value="Pix">Pix</option>
                <option value="Cash">Dinheiro</option>
                <option value="CreditCard">Cartao de credito</option>
                <option value="DebitCard">Cartao de debito</option>
                <option value="Insurance">Convenio</option>
              </select>
            </Field>
            <Field error={expenseFormErrors.paidAt?.message} label="Data">
              <input className="input-field" type="datetime-local" {...registerExpenseForm("paidAt")} />
            </Field>
            <Field error={expenseFormErrors.status?.message} label="Status">
              <select className="input-field" {...registerExpenseForm("status")}>
                <option value="Paid">Pago</option>
                <option value="Pending">Pendente</option>
                <option value="Cancelled">Cancelado</option>
              </select>
            </Field>
            <Field error={expenseFormErrors.notes?.message} label="Observacoes">
              <input className="input-field" {...registerExpenseForm("notes")} />
            </Field>
            <div className="md:col-span-2 flex justify-end gap-3">
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowExpenseForm(false); setEditingExpense(null); }} type="button">Cancelar</button>
              <button className="btn btn-primary" disabled={saveExpenseMutation.isPending} type="submit">
                {saveExpenseMutation.isPending ? <span className="spinner" /> : editingExpense ? "Atualizar" : "Registrar despesa"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {/* Receivable register modal */}
      {showReceivableRegister ? (
        <Modal title="Registrar pagamento" onClose={() => { setShowReceivableRegister(false); setSelectedPatientId(undefined); setSelectedPatientReceivable(undefined); }}>
          <div className="toolbar-inline mb-4">
            <button className={cn("btn btn-sm", registerMode === "patient" ? "btn-brand-outline" : "btn-ghost")} onClick={() => { setRegisterMode("patient"); setSelectedPatientReceivable(undefined); }} type="button">Paciente</button>
            <button className={cn("btn btn-sm", registerMode === "expense" ? "btn-brand-outline" : "btn-ghost")} onClick={() => { setRegisterMode("expense"); openNewExpense(); }} type="button">Despesa da clinica</button>
          </div>
          {registerMode === "patient" ? (
            <div className="grid gap-4">
              <Field label="Selecione o paciente">
                <select className="input-field" value={selectedPatientId ?? ""} onChange={(e) => { setSelectedPatientId(e.target.value || undefined); setSelectedPatientReceivable(undefined); }}>
                  <option value="">Selecione...</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              {selectedPatientId && patientReceivables.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Nenhum recebivel pendente para este paciente.</p>
              ) : null}
              {patientReceivables.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-semibold">Recebiveis em aberto</p>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Descricao</th>
                          <th className="numeric">Original</th>
                          <th className="numeric">Em aberto</th>
                          <th>Vencimento</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {patientReceivables.map((r) => (
                          <tr key={r.id} className={cn(r.id === selectedPatientReceivable?.id ? "bg-[var(--bg)]" : "")}>
                            <td>{r.id ? `#${r.id.slice(0, 8)}` : "-"}</td>
                            <td className="numeric">{formatCurrency(r.originalAmount ?? 0)}</td>
                            <td className="numeric">{formatCurrency(r.outstandingAmount ?? 0)}</td>
                            <td>{r.dueDate ? new Date(r.dueDate).toLocaleDateString("pt-BR") : "-"}</td>
                            <td>
                              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedPatientReceivable(r)} type="button">
                                {r.id === selectedPatientReceivable?.id ? "Selecionado" : "Selecionar"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
              {selectedPatientReceivable ? (
                <form className="grid gap-4 md:grid-cols-2 border-t border-[var(--border)] pt-4" onSubmit={onPaymentFormSubmit}>
                  <div className="md:col-span-2">
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      Pagamento: {selectedPatientReceivable.patientName} — {formatCurrency(selectedPatientReceivable.outstandingAmount ?? 0)} em aberto
                    </p>
                  </div>
                  <Field error={paymentErrors.amount?.message} label="Valor">
                    <input className="input-field" max={selectedPatientReceivable.outstandingAmount ?? undefined} min={0.01} step="0.01" type="number" {...registerPayment("amount")} />
                  </Field>
                  <Field error={paymentErrors.paymentMethod?.message} label="Forma de pagamento">
                    <select className="input-field" {...registerPayment("paymentMethod")}>
                      <option value="Pix">Pix</option>
                      <option value="Cash">Dinheiro</option>
                      <option value="CreditCard">Cartao de credito</option>
                      <option value="DebitCard">Cartao de debito</option>
                      <option value="Insurance">Convenio</option>
                    </select>
                  </Field>
                  <Field error={paymentErrors.paidAt?.message} label="Data">
                    <input className="input-field" type="datetime-local" {...registerPayment("paidAt")} />
                  </Field>
                  <Field error={paymentErrors.notes?.message} label="Observacoes">
                    <input className="input-field" {...registerPayment("notes")} />
                  </Field>
                  <div className="md:col-span-2 flex justify-end gap-3">
                    <button className="btn btn-ghost btn-sm" onClick={() => { setShowReceivableRegister(false); }} type="button">Cancelar</button>
                    <button className="btn btn-primary" disabled={registerPaymentMutation.isPending} type="submit">
                      {registerPaymentMutation.isPending ? <span className="spinner" /> : "Confirmar pagamento"}
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          ) : null}
        </Modal>
      ) : null}

      {/* Payments modal */}
      {showPayments ? (
        <Modal title="Historico de pagamentos" onClose={() => { setShowPayments(false); onPaymentReceivableIdChange(undefined); }}>
          <div className="toolbar-inline flex-wrap gap-3 mb-4">
            <label className="min-w-0 flex-1">
              <span className="mb-2 block text-sm font-semibold">Data de</span>
              <input className="input-field" type="date" value={paymentDateFrom ?? ""} onChange={(e) => onPaymentDateFromChange(e.target.value || undefined)} />
            </label>
            <label className="min-w-0 flex-1">
              <span className="mb-2 block text-sm font-semibold">Data ate</span>
              <input className="input-field" type="date" value={paymentDateTo ?? ""} onChange={(e) => onPaymentDateToChange(e.target.value || undefined)} />
            </label>
          </div>
          {payments.length === 0 ? (
            <div className="empty-state">
              <p className="text-sm font-semibold">Nenhum pagamento encontrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th className="numeric">Valor</th>
                    <th>Metodo</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>{p.patientName ?? "-"}</td>
                      <td className="numeric">{formatCurrency(p.amount ?? 0)}</td>
                      <td>{p.paymentMethod}</td>
                      <td>{p.paidAt ? new Date(p.paidAt).toLocaleDateString("pt-BR") : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      ) : null}

      {/* Tab content: Receivables */}
      {activeTab === "receivables" ? (
        <section className="panel rounded-lg p-5 md:p-6">
          <div className="section-heading">
            <div>
              <h3 className="text-base font-semibold text-[var(--ink)]">Contas a receber</h3>
              <p className="text-sm text-[var(--muted)]">
                {total} registro{total === 1 ? "" : "s"} · filtro: {status ?? "Todos"}
              </p>
            </div>
            <div className="toolbar-inline">
              {feedback ? <p className="text-sm text-[var(--muted)]">{feedback}</p> : null}
              <button className="btn btn-primary btn-sm" onClick={() => { setFeedback(null); setShowReceivableRegister(true); }} type="button">+ Registrar pagamento</button>
            </div>
          </div>

          <div className="toolbar flex flex-col gap-3">
            <div className="toolbar-inline flex-wrap">
              {RECEIVABLE_STATUS_FILTERS.map(({ key, label }) => (
                <button key={label} className={cn("btn btn-sm", status === key ? "btn-brand-outline" : "btn-ghost")} onClick={() => onStatusChange(key)} type="button">{label}</button>
              ))}
            </div>
            <div className="toolbar-inline flex-wrap gap-3">
              <label className="min-w-0 flex-1">
                <span className="mb-2 block text-sm font-semibold">Vencimento de</span>
                <input className="input-field" type="date" value={dateFrom ?? ""} onChange={(e) => onDateFromChange(e.target.value || undefined)} />
              </label>
              <label className="min-w-0 flex-1">
                <span className="mb-2 block text-sm font-semibold">Vencimento ate</span>
                <input className="input-field" type="date" value={dateTo ?? ""} onChange={(e) => onDateToChange(e.target.value || undefined)} />
              </label>
              {(dateFrom ?? dateTo) ? (
                <button className="btn btn-ghost btn-sm self-end" type="button" onClick={() => { onDateFromChange(undefined); onDateToChange(undefined); }}>Limpar datas</button>
              ) : null}
            </div>
          </div>

          {receivables.length === 0 ? (
            <div className="empty-state mt-5">
              <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" />
              </svg>
              <p className="text-sm font-semibold">Nenhuma conta encontrada para os filtros selecionados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto mt-5">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th className="numeric">Original</th>
                    <th className="numeric">Recebido</th>
                    <th className="numeric">Em aberto</th>
                    <th>Vencimento</th>
                    <th>Status</th>
                    <th className="numeric">%</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {receivables.map((receivable) => {
                    const statusVariant = resolveReceivableStatus(receivable.status);
                    const original = receivable.originalAmount ?? 0;
                    const received = receivable.receivedAmount ?? 0;
                    const outstanding = receivable.outstandingAmount ?? 0;
                    const percentage = original > 0 ? Math.min(100, (received / original) * 100) : 0;
                    return (
                      <tr key={receivable.id ?? receivable.appointmentId ?? receivable.dueDate}>
                        <td>{receivable.patientName ?? "-"}</td>
                        <td className="numeric">{formatCurrency(original)}</td>
                        <td className="numeric">{formatCurrency(received)}</td>
                        <td className="numeric">{formatCurrency(outstanding)}</td>
                        <td>{new Date(receivable.dueDate ?? new Date().toISOString()).toLocaleDateString("pt-BR")}</td>
                        <td><StatusBadge variant={statusVariant} /></td>
                        <td className="numeric">{percentage.toFixed(0)}%</td>
                        <td>
                          <div className="toolbar-inline" style={{ gap: "0.25rem" }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => { setFeedback(null); onPaymentReceivableIdChange(receivable.id); setShowPayments(true); }} type="button">Pagamentos</button>
                            {receivable.status !== "Paid" ? (
                              <button className="btn btn-ghost btn-sm" onClick={() => startQuickPayment(receivable)} type="button">Registrar pagamento</button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td className="numeric">{formatCurrency(receivables.reduce((s, r) => s + (r.originalAmount ?? 0), 0))}</td>
                    <td className="numeric">{formatCurrency(receivables.reduce((s, r) => s + (r.receivedAmount ?? 0), 0))}</td>
                    <td className="numeric">{formatCurrency(receivables.reduce((s, r) => s + (r.outstandingAmount ?? 0), 0))}</td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div className="toolbar-inline mt-5 justify-between">
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} type="button">Pagina anterior</button>
            <span className="text-sm font-medium text-[var(--muted)]">Pagina {page} de {totalPages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} type="button">Proxima pagina</button>
          </div>
        </section>
      ) : null}

      {/* Tab content: Expenses */}
      {activeTab === "expenses" ? (
        <section className="panel rounded-lg p-5 md:p-6">
          <div className="section-heading">
            <div>
              <h3 className="text-base font-semibold text-[var(--ink)]">Despesas</h3>
              <p className="text-sm text-[var(--muted)]">
                {expenseTotal} registro{expenseTotal === 1 ? "" : "s"} · total: {formatCurrency(expenses.reduce((s, e) => s + e.amount, 0))}
              </p>
            </div>
            <div className="toolbar-inline">
              {feedback ? <p className="text-sm text-[var(--muted)]">{feedback}</p> : null}
              <button className="btn btn-primary btn-sm" onClick={() => { setFeedback(null); openNewExpense(); }} type="button">+ Nova despesa</button>
            </div>
          </div>

          <div className="toolbar flex flex-col gap-3">
            <div className="toolbar-inline flex-wrap">
              {EXPENSE_CATEGORY_FILTERS.map(({ key, label }) => (
                <button key={label} className={cn("btn btn-sm", expenseCategory === key ? "btn-brand-outline" : "btn-ghost")} onClick={() => onExpenseCategoryChange(key)} type="button">{label}</button>
              ))}
            </div>
            <div className="toolbar-inline flex-wrap">
              {EXPENSE_STATUS_FILTERS.map(({ key, label }) => (
                <button key={label} className={cn("btn btn-sm", expenseStatus === key ? "btn-brand-outline" : "btn-ghost")} onClick={() => onExpenseStatusChange(key)} type="button">{label}</button>
              ))}
            </div>
            <div className="toolbar-inline flex-wrap gap-3">
              <label className="min-w-0 flex-1">
                <span className="mb-2 block text-sm font-semibold">Data de</span>
                <input className="input-field" type="date" value={expenseDateFrom ?? ""} onChange={(e) => onExpenseDateFromChange(e.target.value || undefined)} />
              </label>
              <label className="min-w-0 flex-1">
                <span className="mb-2 block text-sm font-semibold">Data ate</span>
                <input className="input-field" type="date" value={expenseDateTo ?? ""} onChange={(e) => onExpenseDateToChange(e.target.value || undefined)} />
              </label>
              {(expenseDateFrom ?? expenseDateTo) ? (
                <button className="btn btn-ghost btn-sm self-end" type="button" onClick={() => { onExpenseDateFromChange(undefined); onExpenseDateToChange(undefined); }}>Limpar datas</button>
              ) : null}
            </div>
          </div>

          {expenses.length === 0 ? (
            <div className="empty-state mt-5">
              <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <p className="text-sm font-semibold">Nenhuma despesa encontrada.</p>
            </div>
          ) : (
            <div className="overflow-x-auto mt-5">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Descricao</th>
                    <th>Categoria</th>
                    <th className="numeric">Valor</th>
                    <th>Metodo</th>
                    <th>Data</th>
                    <th>Status</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td className="max-w-[200px] truncate" title={expense.description}>
                        {expense.description}
                      </td>
                      <td>{EXPENSE_CATEGORY_LABELS[expense.category] ?? expense.category}</td>
                      <td className="numeric">{formatCurrency(expense.amount)}</td>
                      <td>{expense.paymentMethod}</td>
                      <td>{new Date(expense.paidAt).toLocaleDateString("pt-BR")}</td>
                      <td><StatusBadge variant={resolveExpenseStatus(expense.status)} /></td>
                      <td>
                        <div className="toolbar-inline" style={{ gap: "0.25rem" }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEditExpense(expense)} type="button">Editar</button>
                          <button className="btn btn-ghost btn-sm text-[var(--danger)]" onClick={() => { if (confirm("Excluir esta despesa?")) deleteExpenseMutation.mutate(expense.id); }} type="button">Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="toolbar-inline mt-5 justify-between">
            <button className="btn btn-ghost btn-sm" disabled={expensePage <= 1} onClick={() => onExpensePageChange(expensePage - 1)} type="button">Pagina anterior</button>
            <span className="text-sm font-medium text-[var(--muted)]">Pagina {expensePage} de {expenseTotalPages}</span>
            <button className="btn btn-ghost btn-sm" disabled={expensePage >= expenseTotalPages} onClick={() => onExpensePageChange(expensePage + 1)} type="button">Proxima pagina</button>
          </div>
        </section>
      ) : null}

      {/* Tab content: Payments */}
      {activeTab === "payments" ? (
        <section className="panel rounded-lg p-5 md:p-6">
          <div className="section-heading">
            <div>
              <h3 className="text-base font-semibold text-[var(--ink)]">Historico de pagamentos</h3>
              <p className="text-sm text-[var(--muted)]">{payments.length} registro(s)</p>
            </div>
          </div>

          <div className="toolbar-inline flex-wrap gap-3 mb-4">
            <label className="min-w-0 flex-1">
              <span className="mb-2 block text-sm font-semibold">Data de</span>
              <input className="input-field" type="date" value={paymentDateFrom ?? ""} onChange={(e) => onPaymentDateFromChange(e.target.value || undefined)} />
            </label>
            <label className="min-w-0 flex-1">
              <span className="mb-2 block text-sm font-semibold">Data ate</span>
              <input className="input-field" type="date" value={paymentDateTo ?? ""} onChange={(e) => onPaymentDateToChange(e.target.value || undefined)} />
            </label>
            {payments.length > 0 ? (
              <button className="btn btn-ghost btn-sm" onClick={() => setShowPayments(true)} type="button">Ver todos</button>
            ) : null}
          </div>

          {payments.length === 0 ? (
            <div className="empty-state">
              <p className="text-sm font-semibold">Nenhum pagamento encontrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th className="numeric">Valor</th>
                    <th>Metodo</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>{p.patientName ?? "-"}</td>
                      <td className="numeric">{formatCurrency(p.amount ?? 0)}</td>
                      <td>{p.paymentMethod}</td>
                      <td>{p.paidAt ? new Date(p.paidAt).toLocaleDateString("pt-BR") : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      {children}
      {error ? <span className="mt-2 block text-sm text-[var(--danger)]">{error}</span> : null}
    </label>
  );
}
