import type { DashboardSummaryResponse } from "@/generated";
import { formatCurrency, formatPercent } from "@/lib/formatters";

const CARDS = (data: DashboardSummaryResponse) => [
  {
    label: "Consultas do dia",
    value: String(data.appointmentsToday ?? 0),
    sub: `${data.cancelledToday ?? 0} canceladas`,
    bg: "linear-gradient(135deg, rgba(14,107,102,0.14) 0%, rgba(14,107,102,0.06) 100%)",
    iconBg: "rgba(14,107,102,0.16)",
    iconColor: "var(--brand)",
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    label: "Confirmadas",
    value: String(data.confirmedToday ?? 0),
    sub: formatPercent(data.confirmationRate ?? 0) + " de confirmacao",
    bg: "linear-gradient(135deg, rgba(32,120,78,0.12) 0%, rgba(32,120,78,0.05) 100%)",
    iconBg: "rgba(32,120,78,0.16)",
    iconColor: "var(--success)",
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  {
    label: "Faturamento mensal",
    value: formatCurrency(data.monthlyRevenue ?? 0),
    sub: "receita acumulada",
    bg: "linear-gradient(135deg, rgba(201,115,61,0.14) 0%, rgba(201,115,61,0.06) 100%)",
    iconBg: "rgba(201,115,61,0.18)",
    iconColor: "var(--accent)",
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    label: "Taxa de confirmacao",
    value: formatPercent(data.confirmationRate ?? 0),
    sub: "engajamento da agenda",
    bg: "linear-gradient(135deg, rgba(20,54,59,0.12) 0%, rgba(255,255,255,0.92) 100%)",
    iconBg: "rgba(20,54,59,0.12)",
    iconColor: "var(--brand-strong)",
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M4 19h16" />
        <path d="M7 15.5 11 11l3 3 5-6.5" />
        <path d="M19 7.5V11h-3.5" />
      </svg>
    ),
  },
];

export function SummaryCards({ data }: { data: DashboardSummaryResponse }) {
  const cards = CARDS(data);

  return (
    <div className="card-grid">
      {cards.map((card) => (
        <div
          key={card.label}
          className="metric-card"
          style={{ background: card.bg }}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="label">{card.label}</p>
            <span
              aria-hidden
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "2rem",
                height: "2rem",
                borderRadius: "50%",
                background: card.iconBg,
                color: card.iconColor,
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
