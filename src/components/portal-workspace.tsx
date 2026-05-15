"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PortalService } from "@/services/portal-api";
import {
  readPortalSession,
  savePortalSession,
  clearPortalSession,
} from "@/lib/portal-session";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import type {
  PatientPortalProfileResponse,
  PatientPortalAppointmentResponse,
  PatientPortalReceivableResponse,
} from "@/generated";

/* ─── Login ──────────────────────────────────────────────────────── */

const loginSchema = z.object({
  cpf: z.string().min(11, "Informe o CPF completo."),
  accessToken: z.string().min(1, "Informe o token de acesso."),
});

type LoginValues = z.infer<typeof loginSchema>;

function createPortalFallbackExpiry() {
  return new Date(Date.now() + 7 * 864e5).toISOString();
}

function PortalLogin({ onLogin }: { onLogin: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await PortalService.login(values.cpf, values.accessToken);
      savePortalSession({
        accessToken: result.accessToken ?? "",
        expiresAt: result.expiresAt ?? createPortalFallbackExpiry(),
        patient: result.patient ?? ({} as PatientPortalProfileResponse),
      });
      onLogin();
    } catch {
      setError("CPF ou token invalido. Verifique seus dados e tente novamente.");
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <div className="login-shell">
      {/* Branding panel */}
      <section className="login-story">
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "3rem",
              height: "3rem",
              borderRadius: "1rem",
              background: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.22)",
              fontWeight: 700,
              fontSize: "1rem",
              color: "white",
              marginBottom: "1.5rem",
            }}
          >
            HM
          </div>
          <p className="label" style={{ color: "rgba(255,255,255,0.6)" }}>
            HealthManager
          </p>
          <h1
            className="hero-title"
            style={{ color: "white", marginTop: "0.75rem" }}
          >
            Portal do Paciente
          </h1>
          <p
            className="hero-description"
            style={{ color: "rgba(255,255,255,0.72)", marginTop: "0.75rem" }}
          >
            Acesse seu historico de consultas, documentos clinicos e situacao
            financeira de forma segura e privada.
          </p>
        </div>

        <div className="sidebar-stats" style={{ marginTop: "auto" }}>
          <div className="sidebar-stat">
            <p
              style={{
                fontSize: "0.68rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.52)",
              }}
            >
              Acesso
            </p>
            <p className="mt-2 text-lg font-semibold text-white">Seguro</p>
            <p
              style={{
                fontSize: "0.72rem",
                color: "rgba(255,255,255,0.5)",
                marginTop: "0.2rem",
              }}
            >
              token com expiracao
            </p>
          </div>
          <div className="sidebar-stat">
            <p
              style={{
                fontSize: "0.68rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.52)",
              }}
            >
              Dados
            </p>
            <p className="mt-2 text-lg font-semibold text-white">LGPD</p>
            <p
              style={{
                fontSize: "0.72rem",
                color: "rgba(255,255,255,0.5)",
                marginTop: "0.2rem",
              }}
            >
              isolamento por clinica
            </p>
          </div>
        </div>

        <p
          style={{
            fontSize: "0.75rem",
            color: "rgba(255,255,255,0.38)",
            marginTop: "1rem",
          }}
        >
          O token de acesso e fornecido pela clinica. Em caso de duvidas,
          entre em contato com a recepcao.
        </p>
      </section>

      {/* Login form */}
      <div className="panel login-card">
        <div className="login-grid">
          <div>
            <p className="label">Acesso ao portal</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Entre com seus dados
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Use o CPF cadastrado e o token enviado pela clinica.
            </p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <label>
              <span className="mb-2 block text-sm font-medium">CPF</span>
              <input
                className="input-field"
                placeholder="000.000.000-00"
                type="text"
                {...register("cpf")}
              />
              {errors.cpf && (
                <span className="mt-1.5 block text-xs text-[var(--danger)]">
                  {errors.cpf.message}
                </span>
              )}
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium">
                Token de acesso
              </span>
              <input
                className="input-field font-mono text-sm"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                type="text"
                {...register("accessToken")}
              />
              {errors.accessToken && (
                <span className="mt-1.5 block text-xs text-[var(--danger)]">
                  {errors.accessToken.message}
                </span>
              )}
            </label>

            {error && (
              <div
                style={{
                  borderRadius: "1rem",
                  border: "1px solid rgba(176,77,67,0.25)",
                  background: "rgba(176,77,67,0.07)",
                  padding: "0.75rem 1rem",
                  fontSize: "0.875rem",
                  color: "var(--danger)",
                }}
              >
                {error}
              </div>
            )}

            <button
              className="btn btn-primary mt-1"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? <span className="spinner" /> : "Acessar portal"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ─── Portal dashboard ───────────────────────────────────────────── */

type PortalSection = "consultas" | "financeiro" | "documentos";

const PORTAL_NAV: { key: PortalSection; label: string; icon: React.ReactNode }[] = [
  {
    key: "consultas",
    label: "Consultas",
    icon: (
      <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    key: "financeiro",
    label: "Financeiro",
    icon: (
      <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </svg>
    ),
  },
  {
    key: "documentos",
    label: "Documentos",
    icon: (
      <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="13" y2="17" />
      </svg>
    ),
  },
];

function PortalDashboard({
  session,
  onLogout,
}: {
  session: ReturnType<typeof readPortalSession>;
  onLogout: () => void;
}) {
  const [section, setSection] = useState<PortalSection>("consultas");
  const queryClient = useQueryClient();

  const appointmentsQuery = useQuery({
    queryKey: ["portal-appointments"],
    queryFn: () => PortalService.getAppointments(),
  });
  const receivablesQuery = useQuery({
    queryKey: ["portal-receivables"],
    queryFn: () => PortalService.getReceivables(),
  });
  const documentsQuery = useQuery({
    queryKey: ["portal-documents"],
    queryFn: () => PortalService.getDocuments(),
  });

  function handleLogout() {
    clearPortalSession();
    queryClient.clear();
    onLogout();
  }

  const patient = session?.patient;
  const totalOutstanding =
    receivablesQuery.data?.reduce(
      (acc, r) => acc + (r.outstandingAmount ?? 0),
      0,
    ) ?? 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        maxWidth: "780px",
        margin: "0 auto",
      }}
    >
      {/* Patient header */}
      <header className="panel rounded-[var(--radius-xl)] overflow-hidden">
        {/* Teal accent strip */}
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(14,107,102,0.92), rgba(11,79,75,0.96))",
            padding: "1.25rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "2.5rem",
                height: "2.5rem",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.24)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.9rem",
                color: "white",
                flexShrink: 0,
              }}
            >
              {getInitials(patient?.name ?? "P")}
            </div>
            <div>
              <p
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "0.65rem",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                Portal do Paciente
              </p>
              <p
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "white",
                  marginTop: "0.1rem",
                }}
              >
                {patient?.name ?? "Paciente"}
              </p>
            </div>
          </div>
          <button
            className="btn btn-sm"
            onClick={handleLogout}
            type="button"
            style={{
              background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "white",
              flexShrink: 0,
            }}
          >
            Sair
          </button>
        </div>

        {/* Patient meta */}
        <div
          style={{
            padding: "0.9rem 1.5rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem 1.5rem",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
            CPF{" "}
            <strong style={{ color: "var(--ink)" }}>
              {patient?.cpf ? formatCpf(patient.cpf) : "—"}
            </strong>
          </span>
          {patient?.healthInsurance && (
            <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
              Convenio{" "}
              <strong style={{ color: "var(--ink)" }}>
                {patient.healthInsurance}
              </strong>
            </span>
          )}
        </div>

        {/* Quick stat row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            padding: "0.1rem 0",
          }}
        >
          <PortalStat
            label="Consultas"
            value={String(appointmentsQuery.data?.length ?? "—")}
            loading={appointmentsQuery.isLoading}
          />
          <PortalStat
            label="Em aberto"
            value={formatCurrency(totalOutstanding)}
            loading={receivablesQuery.isLoading}
            highlight={totalOutstanding > 0}
          />
          <PortalStat
            label="Documentos"
            value={String(documentsQuery.data?.length ?? "—")}
            loading={documentsQuery.isLoading}
          />
        </div>
      </header>

      {/* Section nav */}
      <nav style={{ display: "flex", gap: "0.5rem", overflowX: "auto" }}>
        {PORTAL_NAV.map(({ key, label, icon }) => (
          <button
            key={key}
            className={`btn btn-sm ${section === key ? "btn-brand-outline" : "btn-ghost"}`}
            onClick={() => setSection(key)}
            type="button"
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", whiteSpace: "nowrap" }}
          >
            {icon}
            {label}
          </button>
        ))}
      </nav>

      {/* Section content */}
      {section === "consultas" && (
        <AppointmentSection
          appointments={appointmentsQuery.data ?? []}
          isLoading={appointmentsQuery.isLoading}
        />
      )}
      {section === "financeiro" && (
        <FinancialSection
          isLoading={receivablesQuery.isLoading}
          receivables={receivablesQuery.data ?? []}
        />
      )}
      {section === "documentos" && (
        <DocumentSection
          documents={documentsQuery.data ?? []}
          isLoading={documentsQuery.isLoading}
        />
      )}

      <p
        style={{
          textAlign: "center",
          fontSize: "0.72rem",
          color: "var(--muted)",
          paddingBottom: "1rem",
          opacity: 0.6,
        }}
      >
        HealthManager · Dados protegidos conforme LGPD
      </p>
    </div>
  );
}

/* ─── Sections ───────────────────────────────────────────────────── */

function AppointmentSection({
  appointments,
  isLoading,
}: {
  appointments: PatientPortalAppointmentResponse[];
  isLoading: boolean;
}) {
  return (
    <section className="panel rounded-[var(--radius-xl)] p-5">
      <div style={{ marginBottom: "1rem" }}>
        <p className="label">Historico</p>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 600, marginTop: "0.25rem" }}>
          Consultas realizadas
        </h2>
      </div>

      {isLoading ? (
        <PortalSkeleton rows={3} />
      ) : appointments.length === 0 ? (
        <EmptyState icon="🗓" text="Nenhuma consulta encontrada." />
      ) : (
        <div className="stack-list">
          {appointments.map((a) => (
            <article key={a.id} className="data-card">
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span className="meta-chip">{a.type ?? "Consulta"}</span>
                </div>
                <AppointmentStatusBadge status={a.status} />
              </div>

              <p
                style={{
                  marginTop: "0.75rem",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                }}
              >
                {formatDateTime(a.startAt ?? "")}
              </p>

              <div className="meta-row" style={{ marginTop: "0.4rem" }}>
                <span>{a.doctorName ?? "Medico"}</span>
                {a.doctorSpecialty && <span>{a.doctorSpecialty}</span>}
              </div>

              {a.notes && (
                <p
                  style={{
                    marginTop: "0.5rem",
                    fontSize: "0.8rem",
                    color: "var(--muted)",
                    lineHeight: 1.5,
                  }}
                >
                  {a.notes}
                </p>
              )}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  marginTop: "0.75rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    color: "var(--brand-strong)",
                  }}
                >
                  {formatCurrency(a.amount ?? 0)}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function FinancialSection({
  receivables,
  isLoading,
}: {
  receivables: PatientPortalReceivableResponse[];
  isLoading: boolean;
}) {
  return (
    <section className="panel rounded-[var(--radius-xl)] p-5">
      <div style={{ marginBottom: "1rem" }}>
        <p className="label">Financeiro</p>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 600, marginTop: "0.25rem" }}>
          Contas e pagamentos
        </h2>
      </div>

      {isLoading ? (
        <PortalSkeleton rows={2} />
      ) : receivables.length === 0 ? (
        <EmptyState icon="💳" text="Nenhuma conta encontrada." />
      ) : (
        <div className="stack-list">
          {receivables.map((r) => {
            const original = r.originalAmount ?? 0;
            const received = r.receivedAmount ?? 0;
            const pct = original > 0 ? Math.min(100, (received / original) * 100) : 0;
            const isPaid = r.status === "Paid";

            return (
              <article key={r.id} className="data-card">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    flexWrap: "wrap",
                  }}
                >
                  <ReceivableStatusBadge status={r.status} />
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                    Venc.{" "}
                    {new Date(r.dueDate ?? "").toLocaleDateString("pt-BR")}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "0.75rem",
                    marginTop: "0.9rem",
                  }}
                >
                  <div>
                    <p className="label" style={{ fontSize: "0.65rem" }}>Original</p>
                    <p style={{ marginTop: "0.25rem", fontSize: "0.85rem", fontWeight: 600 }}>
                      {formatCurrency(original)}
                    </p>
                  </div>
                  <div>
                    <p className="label" style={{ fontSize: "0.65rem" }}>Pago</p>
                    <p
                      style={{
                        marginTop: "0.25rem",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--success)",
                      }}
                    >
                      {formatCurrency(received)}
                    </p>
                  </div>
                  <div>
                    <p className="label" style={{ fontSize: "0.65rem" }}>Em aberto</p>
                    <p
                      style={{
                        marginTop: "0.25rem",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: isPaid ? "var(--muted)" : "var(--accent)",
                      }}
                    >
                      {formatCurrency(r.outstandingAmount ?? 0)}
                    </p>
                  </div>
                </div>

                <div style={{ marginTop: "0.75rem" }}>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <p
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--muted)",
                      marginTop: "0.3rem",
                    }}
                  >
                    {pct.toFixed(0)}% quitado
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function DocumentSection({
  documents,
  isLoading,
}: {
  documents: {
    id?: string;
    fileName?: string;
    contentType?: string;
    sizeInBytes?: number;
  }[];
  isLoading: boolean;
}) {
  return (
    <section className="panel rounded-[var(--radius-xl)] p-5">
      <div style={{ marginBottom: "1rem" }}>
        <p className="label">Documentos</p>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 600, marginTop: "0.25rem" }}>
          Laudos e arquivos
        </h2>
      </div>

      {isLoading ? (
        <PortalSkeleton rows={2} />
      ) : documents.length === 0 ? (
        <EmptyState icon="📄" text="Nenhum documento disponivel." />
      ) : (
        <div className="stack-list">
          {documents.map((d) => (
            <div key={d.id} className="data-card" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                style={{
                  width: "2.25rem",
                  height: "2.25rem",
                  borderRadius: "0.75rem",
                  background: "rgba(14,107,102,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: "var(--brand)",
                }}
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {d.fileName ?? "Documento"}
                </p>
                <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.1rem" }}>
                  {d.contentType ?? "arquivo"}
                  {d.sizeInBytes
                    ? ` · ${(d.sizeInBytes / 1024).toFixed(0)} KB`
                    : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function PortalStat({
  label,
  value,
  loading,
  highlight,
}: {
  label: string;
  value: string;
  loading?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        padding: "0.85rem 1rem",
        borderRight: "1px solid var(--line)",
        textAlign: "center",
      }}
    >
      <p className="label" style={{ fontSize: "0.65rem" }}>
        {label}
      </p>
      {loading ? (
        <div
          className="skeleton"
          style={{
            height: "1.25rem",
            width: "3rem",
            borderRadius: "0.5rem",
            margin: "0.35rem auto 0",
          }}
        />
      ) : (
        <p
          style={{
            marginTop: "0.3rem",
            fontSize: "1rem",
            fontWeight: 700,
            color: highlight ? "var(--accent)" : "var(--ink)",
          }}
        >
          {value}
        </p>
      )}
    </div>
  );
}

function AppointmentStatusBadge({ status }: { status?: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    Confirmed:  { bg: "var(--status-confirmed-bg)",  color: "var(--status-confirmed-color)",  label: "Confirmada" },
    Scheduled:  { bg: "var(--status-scheduled-bg)",  color: "var(--status-scheduled-color)",  label: "Agendada" },
    Cancelled:  { bg: "var(--status-cancelled-bg)",  color: "var(--status-cancelled-color)",  label: "Cancelada" },
  };
  const style = map[status ?? ""] ?? { bg: "rgba(96,114,118,0.1)", color: "var(--muted)", label: status ?? "—" };

  return (
    <span
      className="status-badge"
      style={{ background: style.bg, color: style.color }}
    >
      {style.label}
    </span>
  );
}

function ReceivableStatusBadge({ status }: { status?: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    Paid:    { bg: "var(--status-paid-bg)",    color: "var(--status-paid-color)",    label: "Pago" },
    Partial: { bg: "var(--status-partial-bg)", color: "var(--status-partial-color)", label: "Parcial" },
    Pending: { bg: "var(--status-pending-bg)", color: "var(--status-pending-color)", label: "Pendente" },
  };
  const style = map[status ?? ""] ?? { bg: "rgba(96,114,118,0.1)", color: "var(--muted)", label: status ?? "—" };

  return (
    <span
      className="status-badge"
      style={{ background: style.bg, color: style.color }}
    >
      {style.label}
    </span>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="empty-state">
      <span style={{ fontSize: "1.75rem" }}>{icon}</span>
      <p style={{ fontSize: "0.875rem", fontWeight: 500 }}>{text}</p>
    </div>
  );
}

function PortalSkeleton({ rows }: { rows: number }) {
  return (
    <div className="stack-list">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--line)",
            padding: "1rem",
          }}
        >
          <div className="skeleton" style={{ height: "1rem", width: "40%", borderRadius: "0.5rem" }} />
          <div className="skeleton" style={{ height: "0.8rem", width: "65%", borderRadius: "0.5rem", marginTop: "0.6rem" }} />
        </div>
      ))}
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function formatCpf(cpf: string) {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/* ─── Root ───────────────────────────────────────────────────────── */

export function PortalWorkspace() {
  const [session, setSession] = useState(() => readPortalSession());

  if (!session) {
    return <PortalLogin onLogin={() => setSession(readPortalSession())} />;
  }

  return (
    <PortalDashboard session={session} onLogout={() => setSession(null)} />
  );
}
