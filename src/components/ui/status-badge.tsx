import { cn } from "@/lib/cn";

export type StatusVariant =
  | "confirmed"
  | "scheduled"
  | "pending"
  | "cancelled"
  | "completed"
  | "noshow"
  | "inprogress"
  | "paid"
  | "partial"
  | "active"
  | "inactive";

const VARIANT_STYLES: Record<StatusVariant, string> = {
  confirmed:  "bg-[var(--status-confirmed-bg)] text-[var(--status-confirmed-color)]",
  scheduled:  "bg-[var(--status-scheduled-bg)] text-[var(--status-scheduled-color)]",
  pending:    "bg-[var(--status-pending-bg)]   text-[var(--status-pending-color)]",
  cancelled:  "bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled-color)]",
  completed:  "bg-[var(--status-paid-bg)]      text-[var(--status-paid-color)]",
  noshow:     "bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled-color)]",
  inprogress: "bg-[var(--status-partial-bg)]   text-[var(--status-partial-color)]",
  paid:       "bg-[var(--status-paid-bg)]      text-[var(--status-paid-color)]",
  partial:    "bg-[var(--status-partial-bg)]   text-[var(--status-partial-color)]",
  active:     "bg-[var(--status-active-bg)]    text-[var(--status-active-color)]",
  inactive:   "bg-[var(--status-inactive-bg)]  text-[var(--status-inactive-color)]",
};

const LABELS: Record<StatusVariant, string> = {
  confirmed:  "Confirmado",
  scheduled:  "Agendado",
  pending:    "Pendente",
  cancelled:  "Cancelado",
  completed:  "Concluido",
  noshow:     "Faltou",
  inprogress: "Em atendimento",
  paid:       "Pago",
  partial:    "Parcial",
  active:     "Ativo",
  inactive:   "Inativo",
};

export function resolveAppointmentStatus(status?: string): StatusVariant {
  switch (status?.toLowerCase()) {
    case "confirmed":   return "confirmed";
    case "cancelled":   return "cancelled";
    case "completed":   return "completed";
    case "noshow":      return "noshow";
    case "inprogress":  return "inprogress";
    default:            return "scheduled";
  }
}

export function resolveReceivableStatus(status?: string): StatusVariant {
  switch (status?.toLowerCase()) {
    case "paid":    return "paid";
    case "partial": return "partial";
    default:        return "pending";
  }
}

export function resolveExpenseStatus(status?: string): StatusVariant {
  switch (status?.toLowerCase()) {
    case "paid":      return "paid";
    case "cancelled": return "cancelled";
    default:          return "pending";
  }
}

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  Supplies: "Insumos",
  Equipment: "Equipamentos",
  Salary: "Salarios",
  Marketing: "Marketing",
  Utilities: "Contas",
  Rent: "Aluguel",
  Other: "Outros",
};

export function StatusBadge({
  variant,
  label,
  className,
}: {
  variant: StatusVariant;
  label?: string;
  className?: string;
}) {
  return (
    <span className={cn("status-badge", VARIANT_STYLES[variant], className)}>
      {label ?? LABELS[variant]}
    </span>
  );
}
