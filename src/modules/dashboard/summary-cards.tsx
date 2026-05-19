import type { DashboardSummaryResponse } from "@/generated";
import { formatCurrency, formatPercent } from "@/lib/formatters";

const CARDS = (data: DashboardSummaryResponse) => [
  {
    label: "Consultas hoje",
    value: String(data.appointmentsToday ?? 0),
    sub: `${data.cancelledToday ?? 0} cancelada${(data.cancelledToday ?? 0) === 1 ? "" : "s"}`,
    accent: "var(--brand)",
  },
  {
    label: "Confirmadas",
    value: String(data.confirmedToday ?? 0),
    sub: `${formatPercent(data.confirmationRate ?? 0)} de confirmacao`,
    accent: "var(--success)",
  },
  {
    label: "Receita mensal",
    value: formatCurrency(data.monthlyRevenue ?? 0),
    sub: "acumulado no mes",
    accent: "var(--accent)",
  },
  {
    label: "No-show estimado",
    value: formatPercent(data.noShowRate ?? 0),
    sub: "estimativa com base no historico",
    accent: "var(--danger)",
  },
];

export function SummaryCards({ data }: { readonly data: DashboardSummaryResponse }) {
  const cards = CARDS(data);

  return (
    <div className="card-grid">
      {cards.map((card) => (
        <div key={card.label} className="metric-card">
          <div
            style={{
              width: 3,
              height: "0.9rem",
              borderRadius: 2,
              background: card.accent,
              marginBottom: "0.45rem",
            }}
          />
          <p className="label">{card.label}</p>
          <p className="metric-value">{card.value}</p>
          <p className="metric-subtitle">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
