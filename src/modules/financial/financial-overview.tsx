import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DefaultService } from "@/services/api";
import type { ReceivableResponse } from "@/generated";
import { formatCurrency } from "@/lib/formatters";
import {
  StatusBadge,
  resolveReceivableStatus,
} from "@/components/ui/status-badge";
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
  onPageChange,
  onStatusChange,
  onDateFromChange,
  onDateToChange,
}: {
  receivables: ReceivableResponse[];
  page: number;
  pageSize: number;
  total: number;
  status: "Pending" | "Partial" | "Paid" | undefined;
  dateFrom: string | undefined;
  dateTo: string | undefined;
  onPageChange: (page: number) => void;
  onStatusChange: (status: "Pending" | "Partial" | "Paid" | undefined) => void;
  onDateFromChange: (value: string | undefined) => void;
  onDateToChange: (value: string | undefined) => void;
}) {
  const [activeReceivableId, setActiveReceivableId] = useState<string | null>(
    null,
  );
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
      paidAt: "2026-05-07T13:30",
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
      setActiveReceivableId(null);
      reset({
        amount: 50,
        paymentMethod: "Pix",
        paidAt: "2026-05-07T13:30",
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

  const onSubmit = (receivableId: string) =>
    handleSubmit(async (values) => {
      setFeedback(null);
      await registerPayment.mutateAsync({ receivableId, values });
    });

  return (
    <section className="panel rounded-[2rem] p-6">
      <div className="section-heading">
        <div>
          <p className="label">Financeiro</p>
          <h3 className="mt-2 text-2xl font-semibold">Contas a receber</h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Acompanhe o caixa diario com clareza visual, recebimento parcial e
            status de cada recebivel sem sair da tela operacional.
          </p>
        </div>
        <div className="highlight-card max-w-sm">
          <p className="label">Resumo</p>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {total} registro{total !== 1 ? "s" : ""} listado{total !== 1 ? "s" : ""} com filtro{" "}
            {status ?? "Todos"}.
          </p>
          {feedback ? (
            <p className="mt-4 text-sm text-[var(--muted)]">{feedback}</p>
          ) : null}
        </div>
      </div>

      <div className="toolbar mt-5 flex flex-col gap-3">
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
            <span className="text-2xl">R</span>
            <p className="text-sm font-semibold">Nenhuma conta encontrada</p>
          </div>
        ) : (
          receivables.map((receivable) => {
            const statusVariant = resolveReceivableStatus(receivable.status);
            const original = receivable.originalAmount ?? 0;
            const received = receivable.receivedAmount ?? 0;
            const percentage =
              original > 0 ? Math.min(100, (received / original) * 100) : 0;
            const isActive = activeReceivableId === receivable.id;

            return (
              <article
                key={receivable.id ?? receivable.appointmentId ?? receivable.dueDate}
                className="data-card"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <StatusBadge
                      label={receivable.status ?? "Pending"}
                      variant={statusVariant}
                    />
                    <div className="meta-row mt-3">
                      <span>
                        Venc.{" "}
                        {new Date(
                          receivable.dueDate ?? new Date().toISOString(),
                        ).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setFeedback(null);
                      setActiveReceivableId((value) =>
                        value === receivable.id ? null : (receivable.id ?? null),
                      );
                    }}
                    type="button"
                  >
                    {isActive ? "Fechar" : "Registrar pagamento"}
                  </button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <Metric label="Original" value={formatCurrency(original)} />
                  <Metric
                    highlight
                    label="Recebido"
                    value={formatCurrency(received)}
                  />
                  <Metric
                    label="Em aberto"
                    value={formatCurrency(receivable.outstandingAmount ?? 0)}
                  />
                </div>

                <div className="mt-4 rounded-[1.25rem] border border-[var(--line)] bg-white/60 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="label">Progresso de recebimento</p>
                    <span className="text-sm font-semibold">
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="progress-track mt-3">
                    <div
                      className="progress-fill"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                {isActive && receivable.id ? (
                  <form
                    className="section-card mt-4 grid gap-4 p-5 md:grid-cols-2"
                    onSubmit={onSubmit(receivable.id)}
                  >
                    <Field error={errors.amount?.message} label="Valor recebido">
                      <input
                        className="input-field"
                        max={receivable.outstandingAmount ?? undefined}
                        min={0.01}
                        step="0.01"
                        type="number"
                        {...register("amount")}
                      />
                    </Field>
                    <Field
                      error={errors.paymentMethod?.message}
                      label="Forma de pagamento"
                    >
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
                    <div className="md:col-span-2 flex justify-end">
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
                ) : null}
              </article>
            );
          })
        )}
      </div>

      {totalPages > 1 ? (
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
      ) : null}
    </section>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-[1.25rem] bg-[var(--surface-neutral)] px-4 py-4">
      <div className="label">{label}</div>
      <div
        className={cn(
          "mt-2 text-lg font-semibold",
          highlight ? "text-[var(--success)]" : "text-[var(--ink)]",
        )}
      >
        {value}
      </div>
    </div>
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
