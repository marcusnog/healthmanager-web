import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DefaultService } from "@/services/api";
import type { ReceivableResponse } from "@/generated";
import type { PaymentResponse } from "@/generated";
import { formatCurrency } from "@/lib/formatters";
import {
  StatusBadge,
  resolveReceivableStatus,
} from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";

const schema = z.object({
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

type FormValues = z.infer<typeof schema>;
type FormInput = z.input<typeof schema>;

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
  const [feedback, setFeedback] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const totalPages = Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInput, undefined, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: 50,
      paymentMethod: "Pix",
      paidAt: new Date().toISOString().slice(0, 16),
      notes: "",
    },
  });

  const registerPayment = useMutation({
    mutationFn: async ({
      receivableId,
      values,
    }: {
      receivableId: string;
      values: FormValues;
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
      reset({
        amount: 50,
        paymentMethod: "Pix",
        paidAt: new Date().toISOString().slice(0, 16),
        notes: "",
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["receivables"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
    },
    onError: () => {
      setFeedback("Nao foi possivel registrar o pagamento agora.");
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!activeReceivable?.id) return;
    setFeedback(null);
    await registerPayment.mutateAsync({ receivableId: activeReceivable.id, values });
  });

  return (
    <>
      {activeReceivable ? (
        <Modal title="Registrar pagamento" onClose={() => setActiveReceivable(null)}>
          <div className="mb-4 rounded-md border border-[var(--border)] bg-[var(--bg)] px-4 py-3">
            <p className="text-xs text-[var(--muted)]">Em aberto</p>
            <p className="mt-0.5 text-base font-semibold text-[var(--ink)]">
              {formatCurrency(activeReceivable.outstandingAmount ?? 0)}
            </p>
          </div>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            <Field error={errors.amount?.message} label="Valor recebido">
              <input
                className="input-field"
                max={activeReceivable.outstandingAmount ?? undefined}
                min={0.01}
                step="0.01"
                type="number"
                {...register("amount")}
              />
            </Field>
            <Field error={errors.paymentMethod?.message} label="Forma de pagamento">
              <select className="input-field" {...register("paymentMethod")}>
                <option value="Pix">Pix</option>
                <option value="Cash">Dinheiro</option>
                <option value="CreditCard">Cartao de credito</option>
                <option value="DebitCard">Cartao de debito</option>
                <option value="Insurance">Convenio</option>
              </select>
            </Field>
            <Field error={errors.paidAt?.message} label="Data do pagamento">
              <input
                className="input-field"
                type="datetime-local"
                {...register("paidAt")}
              />
            </Field>
            <Field error={errors.notes?.message} label="Observacoes">
              <input className="input-field" {...register("notes")} />
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
                disabled={registerPayment.isPending}
                type="submit"
              >
                {registerPayment.isPending ? (
                  <span className="spinner" />
                ) : (
                  "Confirmar pagamento"
                )}
              </button>
            </div>
          </form>
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
          <div className="stack-list">
            {payments.length === 0 ? (
              <div className="empty-state">
                <p className="text-sm font-semibold">Nenhum pagamento encontrado.</p>
              </div>
            ) : (
              payments.map((payment) => (
                <div key={payment.id} className="data-card">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{formatCurrency(payment.amount ?? 0)}</p>
                      <div className="meta-row mt-1">
                        <span>{payment.paymentMethod}</span>
                        {payment.paidAt ? (
                          <span>{new Date(payment.paidAt).toLocaleDateString("pt-BR")}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <p className="text-xs text-[var(--muted)]">{payment.id ? `#${payment.id.slice(0, 8)}` : null}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
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
          {feedback ? (
            <p className="text-sm text-[var(--muted)]">{feedback}</p>
          ) : null}
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

        <div className="stack-list mt-5">
          {receivables.length === 0 ? (
            <div className="empty-state">
              <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20M6 15h4" />
              </svg>
              <p className="text-sm font-semibold">Nenhuma conta encontrada para os filtros selecionados.</p>
            </div>
          ) : (
            receivables.map((receivable) => {
              const statusVariant = resolveReceivableStatus(receivable.status);
              const original = receivable.originalAmount ?? 0;
              const received = receivable.receivedAmount ?? 0;
              const percentage =
                original > 0 ? Math.min(100, (received / original) * 100) : 0;

              return (
                <article
                  key={receivable.id ?? receivable.appointmentId ?? receivable.dueDate}
                  className="data-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge variant={statusVariant} />
                        <span className="text-xs text-[var(--muted)]">
                          Venc.{" "}
                          {new Date(
                            receivable.dueDate ?? new Date().toISOString(),
                          ).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <div className="mt-3 flex items-baseline gap-4 flex-wrap">
                        <span className="text-xs text-[var(--muted)]">
                          Original <span className="ml-1 text-sm font-semibold text-[var(--ink)]">{formatCurrency(original)}</span>
                        </span>
                        <span className="text-xs text-[var(--muted)]">
                          Recebido <span className="ml-1 text-sm font-semibold text-[var(--success)]">{formatCurrency(received)}</span>
                        </span>
                        <span className="text-xs text-[var(--muted)]">
                          Em aberto <span className="ml-1 text-sm font-semibold text-[var(--ink)]">{formatCurrency(receivable.outstandingAmount ?? 0)}</span>
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="progress-track flex-1">
                          <div className="progress-fill" style={{ width: `${percentage}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-[var(--muted)] tabular-nums shrink-0">{percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="toolbar-inline shrink-0">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setFeedback(null);
                          onPaymentReceivableIdChange(receivable.id);
                          setShowPayments(true);
                        }}
                        type="button"
                      >
                        Ver pagamentos
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
                  </div>
                </article>
              );
            })
          )}
        </div>

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
