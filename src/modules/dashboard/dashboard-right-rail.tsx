import { CalendarPlus, UserPlus, Wallet, ChevronRight, AlertCircle } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/formatters";
import type { PatientResponse, ReceivableResponse } from "@/generated";

const QUICK_ACTIONS = [
  {
    label: "Agendar consulta",
    Icon: CalendarPlus,
    color: "#4F46E5",
    colorBg: "rgba(79,70,229,0.08)",
    key: "agenda" as const,
  },
  {
    label: "Novo paciente",
    Icon: UserPlus,
    color: "#10B981",
    colorBg: "rgba(16,185,129,0.08)",
    key: "paciente" as const,
  },
  {
    label: "Ver financeiro",
    Icon: Wallet,
    color: "#0EA5E9",
    colorBg: "rgba(14,165,233,0.08)",
    key: "financeiro" as const,
  },
];

export function DashboardRightRail({
  patients,
  receivables,
  onNewAppointment,
  onNewPatient,
  onViewFinancial,
}: {
  readonly patients: PatientResponse[];
  readonly receivables: ReceivableResponse[];
  readonly onNewAppointment: () => void;
  readonly onNewPatient: () => void;
  readonly onViewFinancial: () => void;
}) {
  const pendingItems = receivables.filter(
    (r) => r.status === "Pending" || r.status === "Partial",
  );
  const pendingTotal = pendingItems.reduce(
    (sum, r) => sum + (r.outstandingAmount ?? 0),
    0,
  );

  const actionHandlers = {
    agenda: onNewAppointment,
    paciente: onNewPatient,
    financeiro: onViewFinancial,
  };

  return (
    <div className="dashboard-right-col">

      {/* Quick Actions */}
      <div className="rail-card">
        <p className="label rail-section-title">Ações rápidas</p>
        <div style={{ display: "grid", gap: "0.375rem" }}>
          {QUICK_ACTIONS.map(({ label, Icon, color, colorBg, key }) => (
            <button
              key={key}
              className="quick-action-item"
              onClick={actionHandlers[key]}
              type="button"
            >
              <span
                className="quick-action-icon"
                style={{ background: colorBg, color, border: "none" }}
              >
                <Icon size={13} />
              </span>
              <span style={{ flex: 1, textAlign: "left", fontSize: "var(--text-sm)", color: "var(--ink)", fontWeight: 450 }}>
                {label}
              </span>
              <ChevronRight size={12} style={{ color: "var(--muted-light)" }} />
            </button>
          ))}
        </div>
      </div>

      {/* Recent Patients */}
      <div className="rail-card">
        <p className="label rail-section-title">Pacientes recentes</p>
        {patients.length === 0 ? (
          <p className="rail-empty">Nenhum paciente cadastrado.</p>
        ) : (
          <div className="rail-list">
            {patients.slice(0, 4).map((patient) => (
              <div key={patient.id} className="rail-patient-row">
                <Avatar name={patient.name ?? ""} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="rail-patient-name">{patient.name}</p>
                  <p className="rail-patient-meta">
                    <span
                      style={{
                        display: "inline-block",
                        padding: "1px 6px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--brand-wash)",
                        color: "var(--brand-strong)",
                        fontSize: "0.68rem",
                        fontWeight: 500,
                      }}
                    >
                      {patient.healthInsurance ?? "Particular"}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending receivables */}
      {pendingItems.length > 0 && (
        <div
          className="rail-card"
          style={{
            borderColor: "rgba(245,158,11,0.28)",
            background: "rgba(245,158,11,0.035)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
            <AlertCircle
              size={14}
              style={{ color: "#D97706", marginTop: "1px", flexShrink: 0 }}
            />
            <div className="min-w-0 flex-1">
              <p className="label" style={{ color: "#B45309" }}>Pendências</p>
              <p className="rail-pending-count" style={{ marginTop: "0.3rem" }}>
                {pendingItems.length}{" "}
                {pendingItems.length === 1 ? "recebível pendente" : "recebíveis pendentes"}
              </p>
              <p className="rail-pending-amount">{formatCurrency(pendingTotal)} a receber</p>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm rail-footer-action"
            onClick={onViewFinancial}
            type="button"
          >
            Ver recebíveis
          </button>
        </div>
      )}
    </div>
  );
}
