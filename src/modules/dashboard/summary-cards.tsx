import type { DashboardSummaryResponse } from "@/generated";
import { formatCurrency, formatPercent } from "@/lib/formatters";

function CalendarIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
function TrendUpIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

const CARDS = (data: DashboardSummaryResponse) => [
  {
    label: "Consultas hoje",
    value: String(data.appointmentsToday ?? 0),
    sub: `${data.cancelledToday ?? 0} cancelada${(data.cancelledToday ?? 0) === 1 ? "" : "s"}`,
    color: "var(--brand)",
    colorBg: "var(--surface-brand)",
    icon: <CalendarIcon />,
  },
  {
    label: "Confirmadas",
    value: String(data.confirmedToday ?? 0),
    sub: `${formatPercent(data.confirmationRate ?? 0)} de confirmacao`,
    color: "var(--success)",
    colorBg: "var(--surface-success)",
    icon: <CheckIcon />,
  },
  {
    label: "Receita mensal",
    value: formatCurrency(data.monthlyRevenue ?? 0),
    sub: "acumulado no mes",
    color: "var(--accent)",
    colorBg: "var(--accent-soft)",
    icon: <TrendUpIcon />,
  },
  {
    label: "No-show estimado",
    value: formatPercent(data.noShowRate ?? 0),
    sub: "com base no historico",
    color: "var(--danger)",
    colorBg: "var(--surface-danger)",
    icon: <AlertIcon />,
  },
];

export function SummaryCards({ data }: { readonly data: DashboardSummaryResponse }) {
  const cards = CARDS(data);

  return (
    <div className="card-grid">
      {cards.map((card) => (
        <div key={card.label} className="metric-card">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.875rem" }}>
            <p className="label">{card.label}</p>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "1.65rem",
                height: "1.65rem",
                borderRadius: "var(--radius-md)",
                background: card.colorBg,
                color: card.color,
                flexShrink: 0,
              }}
            >
              {card.icon}
            </span>
          </div>
          <p className="metric-value">{card.value}</p>
          <p className="metric-subtitle">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
