import { Avatar } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/formatters";
import type { PatientResponse, ReceivableResponse } from "@/generated";

function CalendarPlusIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4" />
    </svg>
  );
}
function UserPlusIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="17" y1="11" x2="23" y2="11" />
    </svg>
  );
}
function WalletIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <circle cx="16" cy="15" r="1" fill="currentColor" />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

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

  const quickActions = [
    { label: "Agendar consulta", icon: <CalendarPlusIcon />, onClick: onNewAppointment },
    { label: "Novo paciente", icon: <UserPlusIcon />, onClick: onNewPatient },
    { label: "Ver financeiro", icon: <WalletIcon />, onClick: onViewFinancial },
  ];

  return (
    <div className="dashboard-right-col">
      <div className="rail-card">
        <p className="label rail-section-title">Ações rápidas</p>
        <div className="grid gap-1">
          {quickActions.map((action) => (
            <button
              key={action.label}
              className="quick-action-item"
              onClick={action.onClick}
              type="button"
            >
              <span className="quick-action-icon">{action.icon}</span>
              <span className="nav-item-label">{action.label}</span>
              <span className="text-muted-light">
                <ChevronRightIcon />
              </span>
            </button>
          ))}
        </div>
      </div>

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
                    {patient.healthInsurance ?? "Particular"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pendingItems.length > 0 && (
        <div className="rail-card">
          <p className="label rail-section-title">Pendências</p>
          <p className="rail-pending-count">
            {pendingItems.length}{" "}
            {pendingItems.length === 1 ? "recebível pendente" : "recebíveis pendentes"}
          </p>
          <p className="rail-pending-amount">{formatCurrency(pendingTotal)} a receber</p>
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
