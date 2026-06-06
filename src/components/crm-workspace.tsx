"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  Users,
  CreditCard,
  Stethoscope,
  Settings,
  ChevronDown,
  Menu,
  X,
  LogOut,
  Plus,
} from "lucide-react";
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

/* ─── Nav config ─────────────────────────────────────────────────── */

const NAV: { section: Section; icon: React.ReactNode; label: string }[] = [
  { section: "dashboard",     icon: <LayoutDashboard size={15} />, label: "Dashboard" },
  { section: "agenda",        icon: <Calendar size={15} />,        label: "Agenda" },
  { section: "pacientes",     icon: <Users size={15} />,           label: "Pacientes" },
  { section: "financeiro",    icon: <CreditCard size={15} />,      label: "Financeiro" },
  { section: "medicos",       icon: <Stethoscope size={15} />,     label: "Médicos" },
  { section: "configuracoes", icon: <Settings size={15} />,        label: "Config" },
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

/* ─── Sidebar content (shared desktop + mobile) ──────────────────── */

function SidebarContent({
  session,
  activeSection,
  onSectionChange,
  onLogout,
}: {
  session: SessionState;
  activeSection: Section;
  onSectionChange: (s: Section) => void;
  onLogout: () => void;
}) {
  return (
    <>
      {/* Product brand */}
      <div
        className="flex items-center gap-2.5 px-4 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--brand)" }}
        >
          <span className="text-white font-bold text-xs tracking-tight">HM</span>
        </div>
        <div className="min-w-0">
          <p
            className="text-white font-semibold text-sm truncate leading-tight"
            style={{ letterSpacing: "-0.02em" }}
          >
            Health Manager
          </p>
          <p
            className="truncate"
            style={{ fontSize: "0.625rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}
          >
            CRM Médico
          </p>
        </div>
      </div>

      {/* Workspace switcher */}
      <div
        className="px-3 py-2.5 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <button
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.09)",
          }}
          type="button"
        >
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: "#10B981" }}
          >
            <span className="text-white font-bold" style={{ fontSize: "0.6rem" }}>CA</span>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p
              className="truncate leading-tight font-medium"
              style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.88)" }}
            >
              Clínica Aurora
            </p>
            <p
              className="truncate"
              style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)" }}
            >
              Workspace ativo
            </p>
          </div>
          <ChevronDown size={11} style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5 scrollbar-hide">
        {NAV.map(({ section, icon, label }) => {
          const isActive = activeSection === section;
          return (
            <button
              key={section}
              className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer"
              style={{
                background: isActive ? "rgba(99,102,241,0.2)" : "transparent",
                color: isActive ? "#a5b4fc" : "rgba(255,255,255,0.55)",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.88)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.55)";
                }
              }}
              onClick={() => onSectionChange(section)}
              type="button"
            >
              <span style={{ color: isActive ? "#a5b4fc" : "rgba(255,255,255,0.38)", flexShrink: 0 }}>
                {icon}
              </span>
              <span className="nav-item-label flex-1 text-left">{label}</span>
              {isActive && (
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: "#818cf8" }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* User profile */}
      <div
        className="px-3 py-3 flex-shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center gap-2.5 px-2 py-1.5 mb-1.5">
          <Avatar name={session.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p
              className="truncate leading-tight font-medium"
              style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.9)" }}
            >
              {session.name}
            </p>
            <p
              className="truncate"
              style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)" }}
            >
              {session.role}
            </p>
          </div>
        </div>
        <button
          className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
          style={{ color: "rgba(255,255,255,0.38)", fontSize: "0.75rem" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.65)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.38)";
          }}
          onClick={onLogout}
          type="button"
        >
          <LogOut size={12} />
          <span>Encerrar sessão</span>
        </button>
      </div>
    </>
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
          <div className="eyebrow-row">
            <span className="pill" style={{ background: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}>
              Health Manager
            </span>
            <span className="pill" style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
              Brasil-first SaaS
            </span>
          </div>
          <div className="mt-8 max-w-xl">
            <p className="label" style={{ color: "rgba(255,255,255,0.45)" }}>CRM médico</p>
            <h1 className="hero-title">
              Agenda, pacientes e financeiro em um só painel.
            </h1>
            <p className="hero-description">
              Multi-tenant, auditoria, documentos, agenda, financeiro operacional e integrações prontas.
            </p>
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {[
              { label: "Agenda", value: "30 min", sub: "slot padrão com bloqueio de conflito" },
              { label: "Financeiro", value: "Parcial", sub: "recebíveis e pagamentos desacoplados" },
              { label: "Mensageria", value: "Outbox", sub: "worker para notificações" },
            ].map((s) => (
              <div key={s.label} style={{ borderRadius: 8, padding: "0.875rem", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>{s.label}</div>
                <div style={{ marginTop: "0.35rem", fontSize: "1.15rem", fontWeight: 700, color: "white", fontFamily: "var(--font-heading), var(--font-display), system-ui" }}>{s.value}</div>
                <div style={{ marginTop: "0.2rem", fontSize: "0.78rem", color: "rgba(255,255,255,0.5)" }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="login-card">
          <div className="login-grid">
            <div>
              <p className="label">Acesso ao CRM</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-heading), var(--font-display), system-ui" }}>
                Bem-vindo de volta
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Entre com suas credenciais para acessar o painel.
              </p>
            </div>
            <LoginPanel session={null} onLogin={handleLogin} onLogout={handleLogout} />
          </div>
        </div>
      </div>
    );
  }

  /* ─── Section content ───────────────────────────────────────── */

  const meta = SECTION_TITLE[activeSection];

  function handleSectionChange(section: Section) {
    setActiveSection(section);
    setSidebarOpen(false);
  }

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
      <AnimatePresence>
        {sidebarOpen && isMobile && (
          <motion.div
            className="fixed inset-0 z-20 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className="sidebar-panel z-30"
        style={isMobile ? {
          position: "fixed",
          top: 0,
          bottom: 0,
          left: 0,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 200ms cubic-bezier(0.4,0,0.2,1)",
        } : undefined}
      >
        <SidebarContent
          session={session}
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          onLogout={handleLogout}
        />
      </aside>

      {/* Main area */}
      <div className="main-shell">
        <main className="flex-1" style={{ background: "var(--bg)" }}>
          <div className="mx-auto w-full max-w-[1440px] px-8 pb-10">

            {/* Topbar */}
            <header className="topbar">
              <div className="topbar-copy">
                {isMobile ? (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setSidebarOpen((v) => !v)}
                    type="button"
                    aria-label="Menu"
                  >
                    {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
                  </button>
                ) : null}
                <div className="topbar-title-group">
                  <p
                    className="text-xl font-semibold"
                    style={{
                      color: "var(--ink)",
                      letterSpacing: "-0.025em",
                      lineHeight: 1.2,
                      fontFamily: "var(--font-heading), var(--font-display), system-ui",
                    }}
                  >
                    {meta.title}
                  </p>
                  <p className="text-sm" style={{ color: "var(--muted)", lineHeight: 1.4 }}>
                    {meta.subtitle}
                  </p>
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
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                    >
                      <Plus size={14} />
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
