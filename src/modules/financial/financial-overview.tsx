import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DefaultService } from "@/services/api";
import type { ReceivableResponse, PaymentResponse, PatientResponse, CreateManualReceivableRequest } from "@/generated";
import { formatCurrency } from "@/lib/formatters";
import {
  StatusBadge,
  resolveReceivableStatus,
} from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";

const paymentSchema = z.object({
  amount: z.coerce.number().positive("Informe um valor valido."),
  paymentMethod: z.enum([
    "Cash",
    "Pix",
    "CreditCard",
    "DebitCard",
    "Insurance",
  ]),
  paidAt: z.string().min(1, "Informe a data do pagamento."),
  notes: z.string().optional(),
});

const expenseSchema = z.object({
  description: z.string().min(1, "Informe a descricao da despesa."),
  amount: z.coerce.number().positive("Informe um valor valido."),
  paymentMethod: z.enum([
    "Cash",
    "Pix",
    "CreditCard",
    "DebitCard",
    "Insurance",
  ]),
  paidAt: z.string().min(1, "Informe a data do pagamento."),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;
type PaymentFormInput = z.input<typeof paymentSchema>;
type ExpenseFormValues = z.infer<typeof expenseSchema>;
type ExpenseFormInput = z.input<typeof expenseSchema>;

const STATUS_FILTERS = [
  { key: undefined, label: "Todos" },
  { key: "Pending" as const, label: "Pendente" },
  { key: "Partial" as const, label: "Parcial" },
  { key: "Paid" as const, label: "Pago" },
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
}) {
  const [activeReceivable, setActiveReceivable] = useState<ReceivableResponse | null>(null);
  const [showPayments, setShowPayments] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [registerMode, setRegisterMode] = useState<"patient" | "expense">("patient");
  const [selectedPatientId, setSelectedPatientId] = useState<string | undefined>(undefined);
  const [selectedPatientReceivable, setSelectedPatientReceivable] = useState<ReceivableResponse | undefined>(undefined);
  const [feedback, setFeedback] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const totalPages = Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));

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
    defaultValues: {
      amount: 50,
      paymentMethod: "Pix",
      paidAt: new Date().toISOString().slice(0, 16),
      notes: "",
    },
  });

  const {
    register: registerExpense,
    handleSubmit: handleExpenseSubmit,
    reset: resetExpense,
    formState: { errors: expenseErrors },
  } = useForm<ExpenseFormInput, undefined, ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: "",
      amount: 50,
      paymentMethod: "Pix",
      paidAt: new Date().toISOString().slice(0, 16),
      notes: "",
    },
  });

  const invalidateFinancial = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["receivables"] }),
    queryClient.invalidateQueries({ queryKey: ["payments"] }),
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
  ]);

  const registerPaymentMutation = useMutation({
    mutationFn: async ({
      receivableId,
      values,
    }: {
      receivableId: string;
      values: PaymentFormValues;
    }) =>
      DefaultService.paymentsCreate({
        receivableId,
        amount: values.amount,
        paymentMethod: values.paymentMethod,
        paidAt: new Date(values.paidAt).toISOString(),
        notes: values.notes || undefined,
      }),
    onSuccess: async () => {
      setFeedback("Pagamento registrado com sucesso.");
      setActiveReceivable(null);
      setShowRegister(false);
      resetPayment({
        amount: 50,
        paymentMethod: "Pix",
        paidAt: new Date().toISOString().slice(0, 16),
        notes: "",
      });
      await invalidateFinancial();
    },
    onError: () => {
      setFeedback("Nao foi possivel registrar o pagamento agora.");
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (values: ExpenseFormValues) => {
      const body: CreateManualReceivableRequest = {
        amount: values.amount,
        description: values.description,
        paymentMethod: values.paymentMethod,
        paidAt: new Date(values.paidAt).toISOString(),
        notes: values.notes || undefined,
      };
      return DefaultService.receivablesManual(body);
    },
    onSuccess: async () => {
      setFeedback("Despesa registrada com sucesso.");
      setShowRegister(false);
      resetExpense({
        description: "",
        amount: 50,
        paymentMethod: "Pix",
        paidAt: new Date().toISOString().slice(0, 16),
        notes: "",
      });
      await invalidateFinancial();
    },
    onError: () => {
      setFeedback("Nao foi possivel registrar a despesa.");
    },
  });

  const onPaymentFormSubmit = handlePaymentSubmit(async (values) => {
    if (!activeReceivable?.id) return;
    setFeedback(null);
    await registerPaymentMutation.mutateAsync({ receivableId: activeReceivable.id, values });
  });

  const onExpenseFormSubmit = handleExpenseSubmit(async (values) => {
    setFeedback(null);
    await createExpenseMutation.mutateAsync(values);
  });

  const clearRegisterModal = () => {
    setShowRegister(false);
    setSelectedPatientId(undefined);
    setSelectedPatientReceivable(undefined);
    setActiveReceivable(null);
  };

  return (
    <>
      {activeReceivable ? (
        <Modal title="Registrar pagamento" onClose={() => setActiveReceivable(null)}>
          <div className="mb-4 rounded-md border border-[var(--border)] bg-[var(--bg)] px-4 py-3">
            {activeReceivable.patientName ? (
              <p className="text-sm font-semibold text-[var(--ink)]">{activeReceivable.patientName}</p>
            ) : null}
            <p className="text-xs text-[var(--muted)]">Em aberto</p>
            <p className="mt-0.5 text-base font-semibold text-[var(--ink)]">
              {formatCurrency(activeReceivable.outstandingAmount ?? 0)}
            </p>
          </div>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onPaymentFormSubmit}>
            <Field error={paymentErrors.amount?.message} label="Valor recebido">
              <input
                className="input-field"
                max={activeReceivable.outstandingAmount ?? undefined}
                min={0.01}
                step="0.01"
                type="number"
                {...registerPayment("amount")}
              />
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
            <Field error={paymentErrors.paidAt?.message} label="Data do pagamento">
              <input
                className="input-field"
                type="datetime-local"
                {...registerPayment("paidAt")}
              />
            </Field>
            <Field error={paymentErrors.notes?.message} label="Observacoes">
              <input className="input-field" {...registerPayment("notes")} />
            </Field>
            <div className="md:col-span-2 flex justify-end gap-3">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setActiveReceivable(null)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                disabled={registerPaymentMutation.isPending}
                type="submit"
              >
                {registerPaymentMutation.isPending ? (
                  <span className="spinner" />
                ) : (
                  "Confirmar pagamento"
                )}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {showRegister ? (
        <Modal title="Registrar pagamento" onClose={clearRegisterModal}>
          <div className="toolbar-inline mb-4">
            <button
              className={cn("btn btn-sm", registerMode === "patient" ? "btn-brand-outline" : "btn-ghost")}
              onClick={() => { setRegisterMode("patient"); setSelectedPatientReceivable(undefined); }}
              type="button"
            >
              Paciente
            </button>
            <button
              className={cn("btn btn-sm", registerMode === "expense" ? "btn-brand-outline" : "btn-ghost")}
              onClick={() => { setRegisterMode("expense"); setSelectedPatientReceivable(undefined); }}
              type="button"
            >
              Despesa da clinica
            </button>
          </div>

          {registerMode === "patient" ? (
            <div className="grid gap-4">
              <Field label="Selecione o paciente">
                <select
                  className="input-field"
                  value={selectedPatientId ?? ""}
                  onChange={(e) => { setSelectedPatientId(e.target.value || undefined); setSelectedPatientReceivable(undefined); }}
                >
                  <option value="">Selecione...</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
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
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => { setSelectedPatientReceivable(r); setActiveReceivable(r); }}
                                type="button"
                              >
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
                  <input type="hidden" value={selectedPatientReceivable.id} />
                  <Field error={paymentErrors.amount?.message} label="Valor">
                    <input
                      className="input-field"
                      max={selectedPatientReceivable.outstandingAmount ?? undefined}
                      min={0.01}
                      step="0.01"
                      type="number"
                      {...registerPayment("amount")}
                    />
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
                    <input
                      className="input-field"
                      type="datetime-local"
                      {...registerPayment("paidAt")}
                    />
                  </Field>
                  <Field error={paymentErrors.notes?.message} label="Observacoes">
                    <input className="input-field" {...registerPayment("notes")} />
                  </Field>
                  <div className="md:col-span-2 flex justify-end gap-3">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={clearRegisterModal}
                      type="button"
                    >
                      Cancelar
                    </button>
                    <button
                      className="btn btn-primary"
                      disabled={registerPaymentMutation.isPending}
                      type="submit"
                    >
                      {registerPaymentMutation.isPending ? <span className="spinner" /> : "Confirmar pagamento"}
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          ) : (
            <form className="grid gap-4 md:grid-cols-2" onSubmit={onExpenseFormSubmit}>
              <div className="md:col-span-2">
                <Field error={expenseErrors.description?.message} label="Descricao">
                  <input className="input-field" {...registerExpense("description")} />
                </Field>
              </div>
              <Field error={expenseErrors.amount?.message} label="Valor">
                <input
                  className="input-field"
                  min={0.01}
                  step="0.01"
                  type="number"
                  {...registerExpense("amount")}
                />
              </Field>
              <Field error={expenseErrors.paymentMethod?.message} label="Forma de pagamento">
                <select className="input-field" {...registerExpense("paymentMethod")}>
                  <option value="Pix">Pix</option>
                  <option value="Cash">Dinheiro</option>
                  <option value="CreditCard">Cartao de credito</option>
                  <option value="DebitCard">Cartao de debito</option>
                  <option value="Insurance">Convenio</option>
                </select>
              </Field>
              <Field error={expenseErrors.paidAt?.message} label="Data">
                <input
                  className="input-field"
                  type="datetime-local"
                  {...registerExpense("paidAt")}
                />
              </Field>
              <Field error={expenseErrors.notes?.message} label="Observacoes">
                <input className="input-field" {...registerExpense("notes")} />
              </Field>
              <div className="md:col-span-2 flex justify-end gap-3">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={clearRegisterModal}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  disabled={createExpenseMutation.isPending}
                  type="submit"
                >
                  {createExpenseMutation.isPending ? <span className="spinner" /> : "Registrar despesa"}
                </button>
              </div>
            </form>
          )}
        </Modal>
      ) : null}

      {showPayments ? (
        <Modal title="Historico de pagamentos" onClose={() => { setShowPayments(false); onPaymentReceivableIdChange(undefined); }}>
          <div className="toolbar-inline flex-wrap gap-3 mb-4">
            <label className="min-w-0 flex-1">
              <span className="mb-2 block text-sm font-semibold">Data de</span>
              <input
                className="input-field"
                type="date"
                value={paymentDateFrom ?? ""}
                onChange={(e) => onPaymentDateFromChange(e.target.value || undefined)}
              />
            </label>
            <label className="min-w-0 flex-1">
              <span className="mb-2 block text-sm font-semibold">Data ate</span>
              <input
                className="input-field"
                type="date"
                value={paymentDateTo ?? ""}
                onChange={(e) => onPaymentDateToChange(e.target.value || undefined)}
              />
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
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.patientName ?? "-"}</td>
                      <td className="numeric">{formatCurrency(payment.amount ?? 0)}</td>
                      <td>{payment.paymentMethod}</td>
                      <td>{payment.paidAt ? new Date(payment.paidAt).toLocaleDateString("pt-BR") : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      ) : null}

      <section className="panel rounded-lg p-5 md:p-6">
        <div className="section-heading">
          <div>
            <h3 className="text-base font-semibold text-[var(--ink)]">Contas a receber</h3>
            <p className="text-sm text-[var(--muted)]">
              {total} registro{total === 1 ? "" : "s"} · filtro: {status ?? "Todos"}
            </p>
          </div>
          <div className="toolbar-inline">
            {feedback ? (
              <p className="text-sm text-[var(--muted)]">{feedback}</p>
            ) : null}
            <button
              className="btn btn-primary btn-sm"
              onClick={() => { setFeedback(null); setShowRegister(true); }}
              type="button"
            >
              + Registrar pagamento
            </button>
          </div>
        </div>

        <div className="toolbar flex flex-col gap-3">
          <div className="toolbar-inline flex-wrap">
            {STATUS_FILTERS.map(({ key, label }) => (
              <button
                key={label}
                className={cn(
                  "btn btn-sm",
                  status === key ? "btn-brand-outline" : "btn-ghost",
                )}
                onClick={() => onStatusChange(key)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="toolbar-inline flex-wrap gap-3">
            <label className="min-w-0 flex-1">
              <span className="mb-2 block text-sm font-semibold">Vencimento de</span>
              <input
                className="input-field"
                type="date"
                value={dateFrom ?? ""}
                onChange={(e) => onDateFromChange(e.target.value || undefined)}
              />
            </label>
            <label className="min-w-0 flex-1">
              <span className="mb-2 block text-sm font-semibold">Vencimento ate</span>
              <input
                className="input-field"
                type="date"
                value={dateTo ?? ""}
                onChange={(e) => onDateToChange(e.target.value || undefined)}
              />
            </label>
            {(dateFrom ?? dateTo) ? (
              <button
                className="btn btn-ghost btn-sm self-end"
                type="button"
                onClick={() => { onDateFromChange(undefined); onDateToChange(undefined); }}
              >
                Limpar datas
              </button>
            ) : null}
          </div>
        </div>

        {receivables.length === 0 ? (
          <div className="empty-state mt-5">
            <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20M6 15h4" />
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
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setFeedback(null);
                              onPaymentReceivableIdChange(receivable.id);
                              setShowPayments(true);
                            }}
                            type="button"
                          >
                            Pagamentos
                          </button>
                          {receivable.status !== "Paid" ? (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => {
                                setFeedback(null);
                                setActiveReceivable(receivable);
                              }}
                              type="button"
                            >
                              Registrar pagamento
                            </button>
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
          <button
            className="btn btn-ghost btn-sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            type="button"
          >
            Pagina anterior
          </button>
          <span className="text-sm font-medium text-[var(--muted)]">
            Pagina {page} de {totalPages}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            type="button"
          >
            Proxima pagina
          </button>
        </div>
      </section>
    </>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      {children}
      {error ? (
        <span className="mt-2 block text-sm text-[var(--danger)]">{error}</span>
      ) : null}
    </label>
  );
}
