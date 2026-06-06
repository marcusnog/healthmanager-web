"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { clearAuthSession, logoutAuthSession, readStoredSessionState } from "@/lib/auth-session";
import { LoginPanel } from "@/modules/auth/login-panel";
import { SummaryCards } from "@/modules/dashboard/summary-cards";
import { DashboardRightRail } from "@/modules/dashboard/dashboard-right-rail";
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

/* ─── Icons ─────────────────────────────────────────────────────── */

function DashboardIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function AgendaIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function PacientesIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function FinanceiroIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}
function MedicosIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function ConfigIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  );
}
function CrossIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

/* ─── Nav config ─────────────────────────────────────────────────── */

const NAV: { section: Section; icon: React.ReactNode; label: string }[] = [
  { section: "dashboard",     icon: <DashboardIcon />,  label: "Dashboard" },
  { section: "agenda",        icon: <AgendaIcon />,     label: "Agenda" },
  { section: "pacientes",     icon: <PacientesIcon />,  label: "Pacientes" },
  { section: "financeiro",    icon: <FinanceiroIcon />, label: "Financeiro" },
  { section: "medicos",       icon: <MedicosIcon />,    label: "Médicos" },
  { section: "configuracoes", icon: <ConfigIcon />,     label: "Config" },
];

const SECTION_TITLE: Record<Section, { title: string; subtitle: string }> = {
  dashboard:     { title: "Dashboard",      subtitle: "Resumo da operação de hoje" },
  agenda:        { title: "Agenda",         subtitle: "Consultas, confirmações e cancelamentos" },
  pacientes:     { title: "Pacientes",      subtitle: "Cadastro, busca e documentos" },
  financeiro:    { title: "Financeiro",     subtitle: "Contas a receber e pagamentos" },
  medicos:       { title: "Médicos",        subtitle: "Equipe médica e disponibilidade" },
  configuracoes: { title: "Configurações",  subtitle: "Configurações operacionais" },
};

/* ─── Fallback data ──────────────────────────────────────────────── */

function shouldStartBlocked() {
  if (typeof window === "undefined") return false;
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

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1025);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (shouldStartBlocked()) { setSession(null); return; }
      const storedSession = readStoredSessionState();
      if (storedSession) setSession(storedSession);
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
          <div className="login-story-brand">
            <div className="login-story-badge">HM</div>
            <span className="login-story-brand-name">Health Manager</span>
          </div>
          <div className="login-story-hero">
            <p className="label-inverse">CRM médico</p>
            <h1 className="hero-title">
              Gerencie sua clínica com clareza e controle.
            </h1>
            <p className="hero-description">
              Agenda inteligente, prontuários, financeiro e comunicação — tudo integrado para clínicas que querem crescer sem perder a qualidade do atendimento.
            </p>
          </div>
          <div className="login-features">
            {[
              { icon: "📅", label: "Agenda", value: "Sem conflitos", sub: "Bloqueio automático de horários sobrepostos" },
              { icon: "💰", label: "Financeiro", value: "Recebíveis", sub: "Pagamentos parciais e controle de pendências" },
              { icon: "📁", label: "Documentos", value: "Seguros", sub: "Upload, download e acesso controlado por papel" },
            ].map((s) => (
              <div key={s.label} className="login-stat-card">
                <p className="login-stat-label">{s.label}</p>
                <p className="login-stat-value">{s.value}</p>
                <p className="login-stat-sub">{s.sub}</p>
              </div>
            ))}
          </div>
          <p className="login-story-footer">
            Multi-tenant · Multi-perfil · Brasil-first
          </p>
        </section>

        <div className="login-card">
          <div className="login-card-inner">
            <div className="login-card-header">
              <div className="login-card-logo">HM</div>
              <div>
                <h2 className="login-card-title">Bem-vindo de volta</h2>
                <p className="login-card-subtitle">Acesse o painel da sua clínica</p>
              </div>
            </div>
            <LoginPanel session={null} onLogin={handleLogin} onLogout={handleLogout} />
          </div>
        </div>
      </div>
    );
  }

  /* ─── Section content ───────────────────────────────────────── */

  const meta = SECTION_TITLE[activeSection];

  function renderSection() {
    switch (activeSection) {
      case "dashboard":
        return (
          <div className="dashboard-layout">
            <SummaryCards data={summary} />
            <div className="dashboard-grid-main">
              <AppointmentBoard {...appointmentBoardProps} />
              <DashboardRightRail
                patients={patientsListQuery.data?.items ?? fallbackPatients}
                receivables={receivablesQuery.data?.items ?? fallbackReceivables}
                onNewAppointment={() => setActiveSection("agenda")}
                onNewPatient={() => setActiveSection("pacientes")}
                onViewFinancial={() => setActiveSection("financeiro")}
              />
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

  /* ─── Main CRM layout ───────────────────────────────────────── */

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 z-20 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className="sidebar-panel z-30 transition-transform duration-200"
        style={isMobile ? {
          position: "fixed",
          top: 0,
          bottom: 0,
          left: 0,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        } : undefined}
      >
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-badge">HM</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{session.clinicName}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 scrollbar-hide">
          {NAV.map(({ section, icon, label }) => (
            <button
              key={section}
              className={`nav-item ${activeSection === section ? "active" : ""}`}
              onClick={() => { setActiveSection(section); setSidebarOpen(false); }}
              type="button"
            >
              {icon}
              <span className="nav-item-label">{label}</span>
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="sidebar-user-section">
          <div className="sidebar-user-row">
            <Avatar name={session.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="sidebar-user-name">{session.name}</p>
              <p className="sidebar-user-role">{session.role}</p>
            </div>
          </div>
          <button
            className="sidebar-logout-btn"
            onClick={handleLogout}
            type="button"
          >
            Encerrar sessão
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="main-shell">
        <main className="flex-1 bg-slate-50">
          <div className="mx-auto w-full max-w-[1440px] px-6 pb-8">
        {/* Topbar — mobile hamburger + section label */}
        <header className="topbar">
          <div className="topbar-copy">
            {isMobile ? (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setSidebarOpen((v) => !v)}
                type="button"
                aria-label="Menu"
              >
                {sidebarOpen ? <CrossIcon /> : <MenuIcon />}
              </button>
            ) : null}
            <div className="topbar-title-group">
              <p className="topbar-title">{meta.title}</p>
              <p className="topbar-subtitle">{meta.subtitle}</p>
            </div>
          </div>
          <div className="topbar-right">
            <span className="topbar-date">{today}</span>
            {activeSection === "dashboard" && (
              <div className="topbar-actions">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setActiveSection("pacientes")}
                  type="button"
                >
                  Novo paciente
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setActiveSection("agenda")}
                  type="button"
                >
                  Nova consulta
                </button>
              </div>
            )}
          </div>
        </header>

          {renderSection()}
          </div>
        </main>
      </div>
    </div>
  );
}
