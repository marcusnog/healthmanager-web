"use client";

import { motion } from "framer-motion";
import { Calendar, CheckCircle2, TrendingUp, AlertTriangle } from "lucide-react";
import type { DashboardSummaryResponse } from "@/generated";
import { formatCurrency, formatPercent } from "@/lib/formatters";

/* ─── Animation variants ─────────────────────────────────────────── */

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

/* ─── Card definitions ───────────────────────────────────────────── */

const CARDS = (data: DashboardSummaryResponse) => [
  {
    label: "Consultas Hoje",
    value: String(data.appointmentsToday ?? 0),
    sub: `${data.cancelledToday ?? 0} cancelada${(data.cancelledToday ?? 0) === 1 ? "" : "s"}`,
    accentColor: "#4F46E5",
    iconBg: "rgba(79,70,229,0.08)",
    Icon: Calendar,
  },
  {
    label: "Confirmadas",
    value: String(data.confirmedToday ?? 0),
    sub: `${formatPercent(data.confirmationRate ?? 0)} de confirmação`,
    accentColor: "#10B981",
    iconBg: "rgba(16,185,129,0.08)",
    Icon: CheckCircle2,
  },
  {
    label: "Receita Mensal",
    value: formatCurrency(data.monthlyRevenue ?? 0),
    sub: "acumulado no mês",
    accentColor: "#0EA5E9",
    iconBg: "rgba(14,165,233,0.08)",
    Icon: TrendingUp,
  },
  {
    label: "No-show Estimado",
    value: formatPercent(data.noShowRate ?? 0),
    sub: "com base no histórico",
    accentColor: "#F59E0B",
    iconBg: "rgba(245,158,11,0.08)",
    Icon: AlertTriangle,
  },
];

/* ─── Component ──────────────────────────────────────────────────── */

export function SummaryCards({ data }: { readonly data: DashboardSummaryResponse }) {
  const cards = CARDS(data);

  return (
    <motion.div
      className="card-grid"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {cards.map((card) => (
        <motion.div
          key={card.label}
          variants={cardVariant}
          className="metric-card"
          style={{ borderLeft: `3px solid ${card.accentColor}` }}
          whileHover={{ y: -2, boxShadow: "0 8px 28px rgba(0,0,0,0.09)", transition: { duration: 0.15 } }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.875rem" }}>
            <p className="label">{card.label}</p>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "1.75rem",
                height: "1.75rem",
                borderRadius: "var(--radius-md)",
                background: card.iconBg,
                color: card.accentColor,
                flexShrink: 0,
              }}
            >
              <card.Icon size={14} />
            </span>
          </div>
          <p className="metric-value">{card.value}</p>
          <p className="metric-subtitle">{card.sub}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}
