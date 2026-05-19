import { Avatar } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/formatters";
import type { PatientResponse, ReceivableResponse } from "@/generated";

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

  return (
    <div className="dashboard-right-col">
      <div className="rail-card">
        <p className="label" style={{ marginBottom: "0.6rem" }}>Acoes rapidas</p>
        <div style={{ display: "grid", gap: "0.35rem" }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onNewAppointment}
            style={{ justifyContent: "flex-start", width: "100%" }}
            type="button"
          >
            Agendar consulta
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onNewPatient}
            style={{ justifyContent: "flex-start", width: "100%" }}
            type="button"
          >
            Novo paciente
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onViewFinancial}
            style={{ justifyContent: "flex-start", width: "100%" }}
            type="button"
          >
            Ver financeiro
          </button>
        </div>
      </div>

      <div className="rail-card">
        <p className="label" style={{ marginBottom: "0.6rem" }}>Pacientes recentes</p>
        {patients.length === 0 ? (
          <p className="rail-empty">Nenhum paciente cadastrado.</p>
        ) : (
          <div style={{ display: "grid", gap: "0.55rem" }}>
            {patients.slice(0, 4).map((patient) => (
              <div key={patient.id} className="rail-patient-row">
                <Avatar name={patient.name ?? ""} size="sm" />
                <div style={{ minWidth: 0, flex: 1 }}>
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

      <div className="rail-card">
        <p className="label" style={{ marginBottom: "0.6rem" }}>Pendencias</p>
        {pendingItems.length === 0 ? (
          <p className="rail-empty">Nenhuma pendencia critica.</p>
        ) : (
          <div>
            <p className="rail-pending-count">
              {pendingItems.length}{" "}
              {pendingItems.length === 1 ? "recebivel pendente" : "recebiveis pendentes"}
            </p>
            <p className="rail-pending-amount">{formatCurrency(pendingTotal)} a receber</p>
            <button
              className="btn btn-ghost btn-sm"
              onClick={onViewFinancial}
              style={{ marginTop: "0.6rem", width: "100%", justifyContent: "flex-start" }}
              type="button"
            >
              Ver recebiveis
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
