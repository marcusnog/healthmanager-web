"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { clearAuthSession, logoutAuthSession, readStoredSessionState } from "@/lib/auth-session";
import { LoginPanel } from "@/modules/auth/login-panel";
import { SummaryCards } from "@/modules/dashboard/summary-cards";
import { DoctorRoster } from "@/modules/doctors/doctor-roster";
import { PatientList } from "@/modules/patients/patient-list";
import { AppointmentBoard } from "@/modules/scheduling/appointment-board";
import { FinancialOverview } from "@/modules/financial/financial-overview";
import { SettingsPanel } from "@/modules/settings/settings-panel";
import { Avatar } from "@/components/ui/avatar";
import { DefaultService } from "@/services/api";
import { ApiError } from "@/generated/core/ApiError";
import type {
  DashboardSummaryResponse,
  PagedPatientResponse,
  PagedAppointmentResponse,
  PagedReceivableResponse,
  PatientResponse,
  AppointmentResponse,
  ReceivableResponse,
  DoctorResponse,
} from "@/generated";
import type { SessionState } from "@/types/app";

/* ─── Types ─────────────────────────────────────────────────────── */

type Section =
  | "dashboard"
  | "agenda"
  | "pacientes"
  | "financeiro"
  | "medicos"
  | "configuracoes";

const SECTION_META: Record<
  Section,
  { label: string; title: string; description: string; caption: string }
> = {
  dashboard: {
    label: "Visao geral",
    title: "Operacao do dia",
    description:
      "Acompanhe agenda, recepcao, equipe e receita em uma mesma vista operacional, com foco em clareza e ritmo de atendimento.",
    caption: "Panorama completo do tenant",
  },
  agenda: {
    label: "Agenda inteligente",
    title: "Consultas e confirmacoes",
    description:
      "Navegue por datas, encaixes, confirmacoes e cancelamentos sem perder a leitura do dia de operacao.",
    caption: "Fluxo clinico em tempo real",
  },
  pacientes: {
    label: "Cadastro e historico",
    title: "Pacientes",
    description:
      "Organize cadastro, convenio, observacoes e documentos do paciente em uma experiencia mais direta para a equipe.",
    caption: "Recepcao mais rapida",
  },
  financeiro: {
    label: "Caixa e recebimentos",
    title: "Financeiro",
    description:
      "Visualize o que entrou, o que ainda esta em aberto e registre pagamentos parciais sem perder contexto.",
    caption: "Receita sob controle",
  },
  medicos: {
    label: "Equipe medica",
    title: "Medicos",
    description:
      "Mantenha o quadro medico atualizado e pronto para alimentar agenda, especialidades e disponibilidade.",
    caption: "Base da agenda",
  },
  configuracoes: {
    label: "Operacional",
    title: "Configuracoes",
    description:
      "Revise os pilares de seguranca, canais e estrutura do MVP preparado para crescer com baixo atrito.",
    caption: "Governanca do produto",
  },
};

/* ─── Icons ─────────────────────────────────────────────────────── */

function DashboardIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function AgendaIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function PacientesIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function FinanceiroIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
function MedicosIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function ConfigIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  );
}
function CrossIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

/* ─── Nav items config ───────────────────────────────────────────── */

const NAV: {
  section: Section;
  icon: React.ReactNode;
  label: string;
  caption: string;
}[] = [
  {
    section: "dashboard",
    icon: <DashboardIcon />,
    label: "Dashboard",
    caption: "Visao completa",
  },
  {
    section: "agenda",
    icon: <AgendaIcon />,
    label: "Agenda",
    caption: "Consultas e confirmacoes",
  },
  {
    section: "pacientes",
    icon: <PacientesIcon />,
    label: "Pacientes",
    caption: "Cadastro e documentos",
  },
  {
    section: "financeiro",
    icon: <FinanceiroIcon />,
    label: "Financeiro",
    caption: "Recebiveis e caixa",
  },
  {
    section: "medicos",
    icon: <MedicosIcon />,
    label: "Medicos",
    caption: "Equipe e agenda",
  },
  {
    section: "configuracoes",
    icon: <ConfigIcon />,
    label: "Config",
    caption: "Estrutura operacional",
  },
];

/* ─── Fallback data ──────────────────────────────────────────────── */


function shouldStartBlocked() {
  if (typeof window === "undefined") {
    return false;
  }

  return new URLSearchParams(window.location.search).get("blocked") === "1";
}

const fallbackSummary: DashboardSummaryResponse = {
  appointmentsToday: 21,
  cancelledToday: 1,
  confirmedToday: 16,
  monthlyRevenue: 45120.5,
  noShowRate: 0.05,
  confirmationRate: 0.81,
};

const fallbackPatients: PatientResponse[] = [
  { id: "fallback-patient-1", name: "Marina Souza", cpf: "12345678901", phone: "(11) 98888-0000", email: "marina@email.com", healthInsurance: "Particular", notes: "Paciente novo" },
];

const fallbackDoctors: DoctorResponse[] = [
  { id: "fallback-doctor-1", name: "Dra. Luciana Costa", specialty: "Dermatologia", crm: "CRM-SP-987654", phone: "11997776655", email: "luciana@clinica.com", isActive: true },
];

const fallbackAppointments: AppointmentResponse[] = [
  { id: "fallback-appointment-1", patientId: "fallback-patient-1", doctorId: "fallback-doctor-1", startAt: "2026-05-07T11:00:00Z", endAt: "2026-05-07T11:30:00Z", status: "Scheduled", confirmationStatus: "Pending", type: "Primeira consulta", amount: 250, notes: "Paciente novo" },
];

const fallbackReceivables: ReceivableResponse[] = [
  { id: "fallback-receivable-1", appointmentId: "fallback-appointment-1", originalAmount: 250, receivedAmount: 100, outstandingAmount: 150, status: "Partial", dueDate: "2026-05-07T00:00:00Z" },
];

const PATIENTS_PAGE_SIZE = 3;
const APPOINTMENTS_PAGE_SIZE = 10;
const RECEIVABLES_PAGE_SIZE = 5;

const fallbackPatientsPage: PagedPatientResponse = { items: fallbackPatients, page: 1, pageSize: PATIENTS_PAGE_SIZE, total: fallbackPatients.length };
const fallbackAppointmentsPage: PagedAppointmentResponse = { items: fallbackAppointments, page: 1, pageSize: APPOINTMENTS_PAGE_SIZE, total: fallbackAppointments.length };
const fallbackReceivablesPage: PagedReceivableResponse = { items: fallbackReceivables, page: 1, pageSize: RECEIVABLES_PAGE_SIZE, total: fallbackReceivables.length };

function filterAppointmentsForDate(appointments: AppointmentResponse[], date: string) {
  return appointments.filter((a) => a.startAt?.slice(0, 10) === date);
}

async function guardedQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) throw e;
    return fallback;
  }
}

/* ─── Dashboard insight strip ───────────────────────────────────── */

function DashboardInsight({ summary, doctorCount }: { summary: DashboardSummaryResponse; doctorCount: number }) {
  const confirmationRate = Math.round((summary.confirmationRate ?? 0) * 100);
  const noShowRate = Math.round((summary.noShowRate ?? 0) * 100);

  const chips = [
    { label: "Atendimento", value: `${summary.appointmentsToday ?? 0} previstos` },
    { label: "Confirmadas", value: `${summary.confirmedToday ?? 0} · ${confirmationRate}%` },
    { label: "Canceladas", value: String(summary.cancelledToday ?? 0) },
    { label: "No-show est.", value: `${noShowRate}%` },
    { label: "Receita mensal", value: `R$ ${(summary.monthlyRevenue ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
    { label: "Equipe", value: `${doctorCount} medico${doctorCount !== 1 ? "s" : ""}` },
  ];

  return (
    <div className="insight-strip">
      {chips.map((chip) => (
        <div key={chip.label} className="insight-chip">
          <p className="label" style={{ fontSize: "0.6rem" }}>{chip.label}</p>
          <p style={{ marginTop: "0.3rem", fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)" }}>
            {chip.value}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ─── Component ──────────────────────────────────────────────────── */

export function CrmWorkspace() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<SessionState | null>(
    () => (shouldStartBlocked() ? null : readStoredSessionState()),
  );
  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientPage, setPatientPage] = useState(1);
  const [appointmentDate, setAppointmentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [appointmentPage, setAppointmentPage] = useState(1);
  const [appointmentDoctorId, setAppointmentDoctorId] = useState<string | undefined>(undefined);
  const [receivablePage, setReceivablePage] = useState(1);
  const [receivableStatus, setReceivableStatus] = useState<"Pending" | "Partial" | "Paid" | undefined>(undefined);
  const [receivableDateFrom, setReceivableDateFrom] = useState<string | undefined>(undefined);
  const [receivableDateTo, setReceivableDateTo] = useState<string | undefined>(undefined);

  /* Detect mobile to apply correct position to sidebar.
     Inline style overrides .panel { position: relative } from globals.css
     so the sidebar correctly overlays on small screens. */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (shouldStartBlocked()) {
        setSession(null);
        return;
      }

      const storedSession = readStoredSessionState();
      if (storedSession) {
        setSession(storedSession);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const authenticated = !!session;

  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => guardedQuery(() => DefaultService.dashboardSummary(), fallbackSummary),
    placeholderData: fallbackSummary,
    enabled: authenticated,
  });
  const patientsListQuery = useQuery({
    queryKey: ["patients-list", patientSearch, patientPage],
    queryFn: () => guardedQuery(() => DefaultService.patientsList(patientPage, PATIENTS_PAGE_SIZE, patientSearch || undefined), fallbackPatientsPage),
    placeholderData: fallbackPatientsPage,
    enabled: authenticated,
  });
  const patientsCatalogQuery = useQuery({
    queryKey: ["patients-catalog"],
    queryFn: () => guardedQuery(async () => { const r = await DefaultService.patientsList(1, 100, ""); return r.items ?? []; }, fallbackPatients),
    placeholderData: fallbackPatients,
    enabled: authenticated,
  });
  const doctorsQuery = useQuery({
    queryKey: ["doctors"],
    queryFn: () => guardedQuery(() => DefaultService.doctorsList(), fallbackDoctors),
    placeholderData: fallbackDoctors,
    enabled: authenticated,
  });
  const appointmentsQuery = useQuery({
    queryKey: ["appointments", appointmentDate, appointmentPage, appointmentDoctorId],
    queryFn: () => guardedQuery(() => DefaultService.appointmentsList(appointmentPage, APPOINTMENTS_PAGE_SIZE, appointmentDate, appointmentDoctorId), { ...fallbackAppointmentsPage, items: filterAppointmentsForDate(fallbackAppointments, appointmentDate) }),
    placeholderData: { ...fallbackAppointmentsPage, items: filterAppointmentsForDate(fallbackAppointments, appointmentDate) },
    enabled: authenticated,
  });
  const receivablesQuery = useQuery({
    queryKey: ["receivables", receivablePage, receivableStatus, receivableDateFrom, receivableDateTo],
    queryFn: () => guardedQuery(() => DefaultService.receivablesList(receivablePage, RECEIVABLES_PAGE_SIZE, receivableStatus, receivableDateFrom, receivableDateTo), fallbackReceivablesPage),
    placeholderData: fallbackReceivablesPage,
    enabled: authenticated,
  });

  useEffect(() => {
    const handler = () => {
      clearAuthSession();
      setSession(null);
      void queryClient.cancelQueries();
      queryClient.removeQueries();
    };
    window.addEventListener("auth:unauthorized", handler);
    return () => window.removeEventListener("auth:unauthorized", handler);
  }, [queryClient]);

  async function handleLogin(nextSession: SessionState) {
    setSession(nextSession);
    await queryClient.invalidateQueries();
  }
  function handleLogout() {
    setSession(null);
    queryClient.clear();
    void logoutAuthSession();
  }
  function handlePatientSearchChange(value: string) { setPatientSearch(value); setPatientPage(1); }
  function handleAppointmentDateChange(value: string) { setAppointmentDate(value); setAppointmentPage(1); }
  function handleAppointmentDoctorChange(value: string | undefined) { setAppointmentDoctorId(value); setAppointmentPage(1); }
  function handleReceivableStatusChange(value: "Pending" | "Partial" | "Paid" | undefined) { setReceivableStatus(value); setReceivablePage(1); }
  function handleReceivableDateFromChange(value: string | undefined) { setReceivableDateFrom(value); setReceivablePage(1); }
  function handleReceivableDateToChange(value: string | undefined) { setReceivableDateTo(value); setReceivablePage(1); }

  const today = useMemo(() => new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }), []);
  const summary = summaryQuery.data ?? fallbackSummary;

  /* Shared component props */
  const patientListProps = {
    isLoading: patientsListQuery.isLoading,
    onPageChange: setPatientPage,
    onSearchChange: handlePatientSearchChange,
    page: patientsListQuery.data?.page ?? 1,
    pageSize: patientsListQuery.data?.pageSize ?? PATIENTS_PAGE_SIZE,
    patients: patientsListQuery.data?.items ?? fallbackPatients,
    search: patientSearch,
    total: patientsListQuery.data?.total ?? fallbackPatients.length,
  };
  const appointmentBoardProps = {
    appointmentDate,
    appointmentDoctorId,
    appointments: appointmentsQuery.data?.items ?? fallbackAppointments,
    doctors: doctorsQuery.data ?? fallbackDoctors,
    isLoading: appointmentsQuery.isLoading,
    onAppointmentDateChange: handleAppointmentDateChange,
    onDoctorChange: handleAppointmentDoctorChange,
    onPageChange: setAppointmentPage,
    page: appointmentsQuery.data?.page ?? 1,
    pageSize: appointmentsQuery.data?.pageSize ?? APPOINTMENTS_PAGE_SIZE,
    patients: patientsCatalogQuery.data ?? fallbackPatients,
    total: appointmentsQuery.data?.total ?? fallbackAppointmentsPage.total ?? 0,
  };
  const financialOverviewProps = {
    dateFrom: receivableDateFrom,
    dateTo: receivableDateTo,
    onDateFromChange: handleReceivableDateFromChange,
    onDateToChange: handleReceivableDateToChange,
    onPageChange: setReceivablePage,
    onStatusChange: handleReceivableStatusChange,
    page: receivablesQuery.data?.page ?? 1,
    pageSize: receivablesQuery.data?.pageSize ?? RECEIVABLES_PAGE_SIZE,
    receivables: receivablesQuery.data?.items ?? fallbackReceivables,
    status: receivableStatus,
    total: receivablesQuery.data?.total ?? fallbackReceivablesPage.total ?? 0,
  };

  /* ─── Login screen ──────────────────────────────────────────── */

  if (!session) {
    return (
      <div className="login-shell">
        <section className="login-story">
          <div className="eyebrow-row">
            <span className="pill">
              <span className="label">HealthManager</span>
            </span>
            <span className="pill">
              <span className="label">Brasil-first SaaS</span>
            </span>
          </div>
          <div className="mt-8 max-w-xl">
            <p className="label">CRM medico para operacao real</p>
            <h1 className="hero-title">
              Atendimento, agenda e financeiro desenhados para clinicas.
            </h1>
            <p className="hero-description text-white/80">
              O MVP ja nasce com tenant por clinica, trilha de auditoria,
              documentos, fluxo de agenda, financeiro operacional e costura com
              WhatsApp.
            </p>
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <div className="sidebar-stat">
              <div className="label">Agenda</div>
              <div className="mt-2 text-2xl font-semibold">30 min</div>
              <div className="mt-1 text-sm text-white/70">
                slot padrao com bloqueio de conflito
              </div>
            </div>
            <div className="sidebar-stat">
              <div className="label">Financeiro</div>
              <div className="mt-2 text-2xl font-semibold">Parcial</div>
              <div className="mt-1 text-sm text-white/70">
                recebiveis e pagamentos desacoplados
              </div>
            </div>
            <div className="sidebar-stat">
              <div className="label">Mensageria</div>
              <div className="mt-2 text-2xl font-semibold">Outbox</div>
              <div className="mt-1 text-sm text-white/70">
                worker interno pronto para notificacoes
              </div>
            </div>
          </div>
        </section>

        <div className="panel login-card">
          <div className="login-grid">
            <div>
              <p className="label">Acesso ao CRM</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                Sessao bloqueada
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                Entre com suas credenciais para voltar ao painel operacional da
                clinica.
              </p>
            </div>
            <LoginPanel
              session={null}
              onLogin={handleLogin}
              onLogout={handleLogout}
            />
          </div>
        </div>
      </div>
    );
  }

  /* ─── Section content ───────────────────────────────────────── */

  function renderSection() {
    switch (activeSection) {
      case "dashboard":
        return (
          <div className="space-y-3 md:space-y-4">
            <DashboardInsight summary={summary} doctorCount={(doctorsQuery.data ?? fallbackDoctors).length} />
            <SummaryCards data={summary} />
            <div className="dashboard-grid-main">
              <PatientList {...patientListProps} />
              <AppointmentBoard {...appointmentBoardProps} />
            </div>
            <div className="dashboard-grid-halves">
              <FinancialOverview {...financialOverviewProps} />
              <DoctorRoster doctors={doctorsQuery.data ?? fallbackDoctors} />
            </div>
          </div>
        );
      case "agenda":
        return <AppointmentBoard {...appointmentBoardProps} />;
      case "pacientes":
        return <PatientList {...patientListProps} />;
      case "financeiro":
        return <FinancialOverview {...financialOverviewProps} />;
      case "medicos":
        return <DoctorRoster doctors={doctorsQuery.data ?? fallbackDoctors} />;
      case "configuracoes":
        return <SettingsPanel />;
    }
  }

  const meta = SECTION_META[activeSection];
  const topbarTitle = activeSection === "dashboard" ? "Painel operacional" : meta.title;
  const topbarDescription = activeSection === "dashboard" ? meta.caption : meta.description;

  /* ─── Main CRM layout ───────────────────────────────────────── */

  return (
    <div className="app-shell">
      {/* ── Mobile overlay ── */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 z-20 bg-black/40"
          style={{ backdropFilter: "blur(2px)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ──
          Desktop: position:relative from .panel — normal flex child, always visible.
          Mobile: inline style forces position:fixed, overriding .panel { position:relative }
          which would otherwise win the CSS cascade over Tailwind utilities. */}
      <aside
        className="panel sidebar-panel flex shrink-0 flex-col gap-4 overflow-hidden z-30 transition-transform duration-200"
        style={isMobile ? {
          position: "fixed",
          top: "1rem",
          bottom: "1rem",
          left: "1rem",
          transform: sidebarOpen ? "translateX(0)" : "translateX(calc(-100% - 2rem))",
        } : undefined}
      >
        {/* Clinic brand section */}
        <div className="sidebar-brand">
          <div className="flex items-center gap-3">
            <div className="sidebar-brand-badge">HM</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{session.clinicName}</p>
              <p style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.58)" }}>
                CRM Medico
              </p>
            </div>
          </div>
          <div className="sidebar-stats">
            <div className="sidebar-stat">
              <p style={{ fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.52)" }}>Hoje</p>
              <p className="mt-1 text-xl font-bold text-white">
                {summary.appointmentsToday ?? 0}
                <span style={{ fontSize: "0.65rem", fontWeight: 500, opacity: 0.6, marginLeft: "0.25rem" }}>ag.</span>
              </p>
              <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", marginTop: "0.1rem" }}>consultas</p>
            </div>
            <div className="sidebar-stat">
              <p style={{ fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.52)" }}>Confirmadas</p>
              <p className="mt-1 text-xl font-bold text-white">
                {summary.confirmedToday ?? 0}
                <span style={{ fontSize: "0.65rem", fontWeight: 500, opacity: 0.6, marginLeft: "0.25rem" }}>conf.</span>
              </p>
              <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", marginTop: "0.1rem" }}>confirmadas</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 scrollbar-hide">
          {NAV.map(({ section, icon, label, caption }) => (
            <button
              key={section}
              className={`nav-item ${activeSection === section ? "active" : ""}`}
              onClick={() => { setActiveSection(section); setSidebarOpen(false); }}
              type="button"
            >
              {icon}
              <span className="nav-item-label">
                <span className="text-sm font-medium">{label}</span>
                <span className="nav-item-caption">{caption}</span>
              </span>
            </button>
          ))}
        </nav>

        {/* User profile */}
        <div className="sidebar-user">
          <div className="flex items-center gap-3">
            <Avatar name={session.name} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{session.name}</p>
              <p className="label truncate">{session.role}</p>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm mt-3 w-full"
            onClick={handleLogout}
            type="button"
          >
            Encerrar sessao
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="main-shell">
        {/* Top header */}
        <header className="panel-sm topbar shrink-0">
          <div className="flex items-center gap-4">
            <button
              className="btn btn-ghost btn-sm lg:hidden"
              onClick={() => setSidebarOpen((v) => !v)}
              type="button"
              aria-label="Menu"
            >
              {sidebarOpen ? <CrossIcon /> : <MenuIcon />}
            </button>
            <div>
              <p className="label">{meta.label}</p>
              <h1 className="text-base font-semibold leading-tight">{topbarTitle}</h1>
              <p className="mt-1 hidden text-sm text-[var(--muted)] xl:block">
                {topbarDescription}
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <span className="pill">
              <span className="label">Modulo</span>
              <span className="ml-1 text-xs font-semibold">{meta.title}</span>
            </span>
            <span className="pill">
              <span className="label">Tenant</span>
              <span className="ml-1 text-xs font-semibold">{session.clinicName}</span>
            </span>
            <span className="pill">
              <span className="text-xs capitalize text-[var(--muted)]">{today}</span>
            </span>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 min-h-0 p-3 pb-8 md:p-4">
          {renderSection()}
        </main>
      </div>
    </div>
  );
}
