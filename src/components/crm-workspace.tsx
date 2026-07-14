"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { clearAuthSession, getValidAccessToken, logoutAuthSession, readStoredSessionState } from "@/lib/auth-session";
import { LoginPanel } from "@/modules/auth/login-panel";
import { SummaryCards } from "@/modules/dashboard/summary-cards";
import { DashboardRightRail } from "@/modules/dashboard/dashboard-right-rail";
import { DoctorRoster } from "@/modules/doctors/doctor-roster";
import { PatientList } from "@/modules/patients/patient-list";
import { AppointmentBoard } from "@/modules/scheduling/appointment-board";
import { FinancialOverview } from "@/modules/financial/financial-overview";
import { SettingsPanel } from "@/modules/settings/settings-panel";
import { HealthInsuranceList } from "@/modules/health-insurances/health-insurance-list";
import { SpecialtyList } from "@/modules/specialties/specialty-list";
import { AvailabilityList } from "@/modules/availabilities/availability-list";
import { Avatar } from "@/components/ui/avatar";
import { DefaultService, expensesList, financialSummary, healthInsurancesList, specialtiesList, availabilitiesList } from "@/services/api";
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
  | "convenios"
  | "especialidades"
  | "agenda-medicos"
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
function HealthIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
function TagIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <path d="M7 7h.01" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
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
  { section: "convenios",     icon: <HealthIcon />,     label: "Convênios" },
  { section: "especialidades",icon: <TagIcon />,        label: "Especialidades" },
  { section: "agenda-medicos",icon: <ClockIcon />,      label: "Agenda Médicos" },
  { section: "configuracoes", icon: <ConfigIcon />,     label: "Config" },
];

const DOCTOR_NAV = NAV.filter((n) =>
  ["dashboard", "agenda", "pacientes", "agenda-medicos"].includes(n.section),
);

const SECTION_TITLE: Record<Section, { title: string; subtitle: string }> = {
  dashboard:      { title: "Dashboard",        subtitle: "Resumo da operação de hoje" },
  agenda:         { title: "Agenda",           subtitle: "Consultas, confirmações e cancelamentos" },
  pacientes:      { title: "Pacientes",        subtitle: "Cadastro, busca e documentos" },
  financeiro:     { title: "Financeiro",       subtitle: "Receitas, despesas e saldo" },
  medicos:        { title: "Médicos",          subtitle: "Equipe médica e disponibilidade" },
  convenios:      { title: "Convênios",        subtitle: "Cadastro de convênios e contatos" },
  especialidades: { title: "Especialidades",   subtitle: "Especialidades e vínculo com médicos" },
  "agenda-medicos": { title: "Agenda por Médico", subtitle: "Horários disponíveis por profissional" },
  configuracoes:  { title: "Configurações",    subtitle: "Configurações operacionais" },
};

const DOCTOR_SECTION_TITLE: Record<string, { title: string; subtitle: string }> = {
  dashboard:  { title: "Dashboard",  subtitle: "Resumo da sua agenda de hoje" },
  agenda:     { title: "Minha Agenda", subtitle: "Suas consultas, confirmações e cancelamentos" },
  pacientes:  { title: "Pacientes",  subtitle: "Seus pacientes, busca e documentos" },
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
  { id: "fallback-doctor-1", name: "Dra. Luciana Costa", specialties: [{ id: "spec-1", name: "Dermatologia" }], crm: "CRM-SP-987654", phone: "11997776655", email: "luciana@clinica.com", isActive: true },
];

const fallbackDoctorsPage = { items: fallbackDoctors, page: 1, pageSize: 10, total: fallbackDoctors.length };

const fallbackAppointments: AppointmentResponse[] = [
  { id: "fallback-appointment-1", patientId: "fallback-patient-1", doctorId: "fallback-doctor-1", startAt: "2026-05-07T11:00:00Z", endAt: "2026-05-07T11:30:00Z", status: "Scheduled", confirmationStatus: "Pending", type: "Primeira consulta", amount: 250, notes: "Paciente novo", patientName: "Marina Souza", patientPhone: "(11) 98888-0000", doctorName: "Dra. Luciana Costa", doctorSpecialty: "Dermatologia" },
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
const EMPTY_PAGE = { items: [] as any[], page: 1, pageSize: 20, total: 0 };

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
  const [patientSortBy, setPatientSortBy] = useState("name");
  const [patientSortDirection, setPatientSortDirection] = useState("asc");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientHealthInsurance, setPatientHealthInsurance] = useState("");
  const [appointmentDate, setAppointmentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [appointmentViewMode, setAppointmentViewMode] = useState<"day" | "week">("day");
  const [appointmentPage, setAppointmentPage] = useState(1);
  const [appointmentDoctorId, setAppointmentDoctorId] = useState<string | undefined>(undefined);
  const [appointmentStatus, setAppointmentStatus] = useState<"Scheduled" | "Confirmed" | "Cancelled" | "Completed" | "NoShow" | "InProgress" | undefined>(undefined);
  const [doctorSearch, setDoctorSearch] = useState("");
  const [doctorPage, setDoctorPage] = useState(1);
  const [receivablePage, setReceivablePage] = useState(1);
  const [receivableStatus, setReceivableStatus] = useState<"Pending" | "Partial" | "Paid" | undefined>(undefined);
  const [receivableDateFrom, setReceivableDateFrom] = useState<string | undefined>(undefined);
  const [receivableDateTo, setReceivableDateTo] = useState<string | undefined>(undefined);
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentReceivableId, setPaymentReceivableId] = useState<string | undefined>(undefined);
  const [paymentDateFrom, setPaymentDateFrom] = useState<string | undefined>(undefined);
  const [paymentDateTo, setPaymentDateTo] = useState<string | undefined>(undefined);
  const [expensePage, setExpensePage] = useState(1);
  const [expenseCategory, setExpenseCategory] = useState<string | undefined>(undefined);
  const [expenseStatus, setExpenseStatus] = useState<string | undefined>(undefined);
  const [expenseDateFrom, setExpenseDateFrom] = useState<string | undefined>(undefined);
  const [expenseDateTo, setExpenseDateTo] = useState<string | undefined>(undefined);
  const [hiSearch, setHiSearch] = useState("");
  const [hiPage, setHiPage] = useState(1);
  const [specSearch, setSpecSearch] = useState("");
  const [specPage, setSpecPage] = useState(1);
  const [availPage, setAvailPage] = useState(1);
  const [availDoctorId, setAvailDoctorId] = useState<string | undefined>(undefined);

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

  useEffect(() => {
    if (!session) return;
    const interval = setInterval(async () => {
      const token = await getValidAccessToken();
      if (!token) {
        window.dispatchEvent(new Event("auth:unauthorized"));
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [session]);

  const authenticated = !!session;

  const isDoctor = session?.role === "Doctor";
  const patientsListQuery = useQuery({
    queryKey: ["patients-list", patientSearch, patientPage, patientSortBy, patientSortDirection, patientEmail, patientHealthInsurance],
    queryFn: () => guardedQuery(() => DefaultService.patientsList(patientPage, PATIENTS_PAGE_SIZE, patientSearch || undefined, patientSortBy || undefined, patientSortDirection || undefined, patientEmail || undefined, patientHealthInsurance || undefined), fallbackPatientsPage),
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
    queryKey: ["doctors", doctorSearch, doctorPage],
    queryFn: () => guardedQuery(() => DefaultService.doctorsList(doctorPage, 10, doctorSearch || undefined), fallbackDoctorsPage),
    placeholderData: fallbackDoctorsPage,
    enabled: authenticated,
  });
  const currentDoctorId = !isDoctor || !session?.name
    ? undefined
    : (doctorsQuery.data?.items ?? []).find(
        (d) => d.name?.toLowerCase().trim() === session.name.toLowerCase().trim(),
      )?.id;

  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary", currentDoctorId],
    queryFn: () => guardedQuery(() => DefaultService.dashboardSummary(currentDoctorId), fallbackSummary),
    placeholderData: fallbackSummary,
    enabled: authenticated,
  });

  // ponytail: doctor auto-filters appointments; non-doctor uses the manual filter
  const resolvedAppointmentDoctorId = isDoctor ? currentDoctorId : appointmentDoctorId;
  const resolvedActiveSection = isDoctor && !["dashboard", "agenda", "pacientes"].includes(activeSection) ? "dashboard" as Section : activeSection;

  const appointmentDateFrom = appointmentViewMode === "week"
    ? (() => { const d = new Date(appointmentDate + "T12:00:00"); const day = d.getDay(); d.setDate(d.getDate() - day + (day === 0 ? -6 : 1)); return d.toISOString().slice(0, 10); })()
    : appointmentDate;
  const appointmentDateTo = appointmentViewMode === "week"
    ? (() => { const d = new Date(appointmentDateFrom + "T12:00:00"); d.setDate(d.getDate() + 6); return d.toISOString().slice(0, 10); })()
    : appointmentDate;

  const paymentsQuery = useQuery({
    queryKey: ["payments", paymentPage, paymentReceivableId, paymentDateFrom, paymentDateTo],
        queryFn: () => guardedQuery(() => DefaultService.paymentsList(paymentPage, 20, paymentReceivableId, paymentDateFrom, paymentDateTo), EMPTY_PAGE),
    placeholderData: EMPTY_PAGE,
    enabled: authenticated,
  });
  const appointmentsQuery = useQuery({
    queryKey: ["appointments", appointmentViewMode, appointmentDate, appointmentPage, resolvedAppointmentDoctorId, appointmentStatus],
    queryFn: () => guardedQuery(() => {
      if (appointmentViewMode === "week") {
        return DefaultService.appointmentsList(appointmentPage, APPOINTMENTS_PAGE_SIZE, undefined, resolvedAppointmentDoctorId, appointmentStatus, appointmentDateFrom, appointmentDateTo);
      }
      return DefaultService.appointmentsList(appointmentPage, APPOINTMENTS_PAGE_SIZE, appointmentDate, resolvedAppointmentDoctorId, appointmentStatus);
    }, { ...fallbackAppointmentsPage, items: filterAppointmentsForDate(fallbackAppointments, appointmentDate) }),
    placeholderData: { ...fallbackAppointmentsPage, items: filterAppointmentsForDate(fallbackAppointments, appointmentDate) },
    enabled: authenticated,
  });
  const receivablesQuery = useQuery({
    queryKey: ["receivables", receivablePage, receivableStatus, receivableDateFrom, receivableDateTo],
    queryFn: () => guardedQuery(() => DefaultService.receivablesList(receivablePage, RECEIVABLES_PAGE_SIZE, receivableStatus, receivableDateFrom, receivableDateTo), fallbackReceivablesPage),
    placeholderData: fallbackReceivablesPage,
    enabled: authenticated,
  });

  const expensesQuery = useQuery({
    queryKey: ["expenses", expensePage, expenseCategory, expenseStatus, expenseDateFrom, expenseDateTo],
        queryFn: () => guardedQuery(() => expensesList(expensePage, 20, expenseCategory, expenseStatus, expenseDateFrom, expenseDateTo), EMPTY_PAGE),
    placeholderData: EMPTY_PAGE,
    enabled: authenticated,
  });

  const healthInsQuery = useQuery({
    queryKey: ["healthInsurances", hiSearch, hiPage],
    queryFn: () => guardedQuery(() => healthInsurancesList(hiPage, 20, hiSearch || undefined), EMPTY_PAGE),
    placeholderData: EMPTY_PAGE,
    enabled: authenticated,
  });
  const specialtiesQuery = useQuery({
    queryKey: ["specialties", specSearch, specPage],
    queryFn: () => guardedQuery(() => specialtiesList(specPage, 20, specSearch || undefined), EMPTY_PAGE),
    placeholderData: EMPTY_PAGE,
    enabled: authenticated,
  });
  const availabilitiesQuery = useQuery({
    queryKey: ["availabilities", availPage, availDoctorId],
    queryFn: () => guardedQuery(() => availabilitiesList(availPage, 50, availDoctorId), { items: [], page: 1, pageSize: 50, total: 0 }),
    placeholderData: { items: [], page: 1, pageSize: 50, total: 0 },
    enabled: authenticated,
  });
  const financialSummaryQuery = useQuery({
    queryKey: ["financial-summary"],
    queryFn: () => guardedQuery(() => financialSummary(), { totalReceived: 0, totalExpenses: 0, balance: 0 }),
    placeholderData: { totalReceived: 0, totalExpenses: 0, balance: 0 },
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
  function handlePatientSortByChange(value: string) { setPatientSortBy(value); setPatientPage(1); }
  function handlePatientSortDirectionChange(value: string) { setPatientSortDirection(value); setPatientPage(1); }
  function handlePatientEmailChange(value: string) { setPatientEmail(value); setPatientPage(1); }
  function handlePatientHealthInsuranceChange(value: string) { setPatientHealthInsurance(value); setPatientPage(1); }
  function handleAppointmentViewModeChange(value: "day" | "week") { setAppointmentViewMode(value); setAppointmentPage(1); }
  function handleAppointmentDateChange(value: string) { setAppointmentDate(value); setAppointmentPage(1); }
  function handleAppointmentDoctorChange(value: string | undefined) { setAppointmentDoctorId(value); setAppointmentPage(1); }
  function handleAppointmentStatusChange(value: "Scheduled" | "Confirmed" | "Cancelled" | "Completed" | "NoShow" | "InProgress" | undefined) { setAppointmentStatus(value); setAppointmentPage(1); }
  function handleReceivableStatusChange(value: "Pending" | "Partial" | "Paid" | undefined) { setReceivableStatus(value); setReceivablePage(1); }
  function handleReceivableDateFromChange(value: string | undefined) { setReceivableDateFrom(value); setReceivablePage(1); }
  function handleReceivableDateToChange(value: string | undefined) { setReceivableDateTo(value); setReceivablePage(1); }
  function handleExpenseCategoryChange(value: string | undefined) { setExpenseCategory(value); setExpensePage(1); }
  function handleExpenseStatusChange(value: string | undefined) { setExpenseStatus(value); setExpensePage(1); }
  function handleExpenseDateFromChange(value: string | undefined) { setExpenseDateFrom(value); setExpensePage(1); }
  function handleExpenseDateToChange(value: string | undefined) { setExpenseDateTo(value); setExpensePage(1); }
  function handleDoctorSearchChange(value: string) { setDoctorSearch(value); setDoctorPage(1); }

  const today = useMemo(() => new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }), []);
  const summary = summaryQuery.data ?? fallbackSummary;

  const patientListProps = {
    email: patientEmail,
    healthInsurance: patientHealthInsurance,
    isLoading: patientsListQuery.isLoading,
    onEmailChange: handlePatientEmailChange,
    onHealthInsuranceChange: handlePatientHealthInsuranceChange,
    onPageChange: setPatientPage,
    onSearchChange: handlePatientSearchChange,
    onSortByChange: handlePatientSortByChange,
    onSortDirectionChange: handlePatientSortDirectionChange,
    page: patientsListQuery.data?.page ?? 1,
    pageSize: patientsListQuery.data?.pageSize ?? PATIENTS_PAGE_SIZE,
    patients: patientsListQuery.data?.items ?? fallbackPatients,
    search: patientSearch,
    sortBy: patientSortBy,
    sortDirection: patientSortDirection,
    total: patientsListQuery.data?.total ?? fallbackPatients.length,
  };
  const doctorsData = doctorsQuery.data ?? fallbackDoctorsPage;
  const appointmentBoardProps = {
    appointmentDate,
    appointmentViewMode,
    appointmentDateFrom,
    appointmentDateTo,
    appointmentDoctorId: resolvedAppointmentDoctorId,
    appointmentStatus,
    appointments: appointmentsQuery.data?.items ?? fallbackAppointments,
    doctors: doctorsData.items ?? fallbackDoctors,
    isLoading: appointmentsQuery.isLoading,
    onAppointmentDateChange: handleAppointmentDateChange,
    onAppointmentViewModeChange: handleAppointmentViewModeChange,
    onDoctorChange: handleAppointmentDoctorChange,
    onPageChange: setAppointmentPage,
    onStatusChange: handleAppointmentStatusChange,
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
    patients: patientsCatalogQuery.data ?? [],
    payments: paymentsQuery.data?.items ?? [],
    paymentPage: paymentPage,
    paymentDateFrom: paymentDateFrom,
    paymentDateTo: paymentDateTo,
    paymentReceivableId: paymentReceivableId,
    onPaymentPageChange: setPaymentPage,
    onPaymentReceivableIdChange: setPaymentReceivableId,
    onPaymentDateFromChange: setPaymentDateFrom,
    onPaymentDateToChange: setPaymentDateTo,
    receivables: receivablesQuery.data?.items ?? fallbackReceivables,
    status: receivableStatus,
    total: receivablesQuery.data?.total ?? fallbackReceivablesPage.total ?? 0,
    expenses: expensesQuery.data?.items ?? [],
    expensePage: expensePage,
    expenseTotal: expensesQuery.data?.total ?? 0,
    expenseCategory: expenseCategory,
    expenseStatus: expenseStatus,
    expenseDateFrom: expenseDateFrom,
    expenseDateTo: expenseDateTo,
    onExpensePageChange: setExpensePage,
    onExpenseCategoryChange: handleExpenseCategoryChange,
    onExpenseStatusChange: handleExpenseStatusChange,
    onExpenseDateFromChange: handleExpenseDateFromChange,
    onExpenseDateToChange: handleExpenseDateToChange,
    summary: financialSummaryQuery.data ?? { totalReceived: 0, totalExpenses: 0, balance: 0 },
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

  const meta = isDoctor && resolvedActiveSection in DOCTOR_SECTION_TITLE
    ? DOCTOR_SECTION_TITLE[resolvedActiveSection]
    : SECTION_TITLE[resolvedActiveSection];
  const currentNav = isDoctor ? DOCTOR_NAV : NAV;

  function renderSection() {
    switch (resolvedActiveSection) {
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
        return (
          <DoctorRoster
            doctors={doctorsData.items ?? fallbackDoctors}
            isLoading={doctorsQuery.isLoading}
            onSearchChange={handleDoctorSearchChange}
            onPageChange={setDoctorPage}
            page={doctorsData.page ?? 1}
            pageSize={doctorsData.pageSize ?? 10}
            search={doctorSearch}
            total={doctorsData.total ?? fallbackDoctors.length}
          />
        );
      case "convenios":
        return (
          <HealthInsuranceList
            items={healthInsQuery.data?.items ?? []}
            page={healthInsQuery.data?.page ?? 1}
            pageSize={healthInsQuery.data?.pageSize ?? 20}
            total={healthInsQuery.data?.total ?? 0}
            search={hiSearch}
            isLoading={healthInsQuery.isLoading}
            onSearchChange={(v) => { setHiSearch(v); setHiPage(1); }}
            onPageChange={setHiPage}
          />
        );
      case "especialidades":
        return (
          <SpecialtyList
            items={specialtiesQuery.data?.items ?? []}
            page={specialtiesQuery.data?.page ?? 1}
            pageSize={specialtiesQuery.data?.pageSize ?? 20}
            total={specialtiesQuery.data?.total ?? 0}
            search={specSearch}
            isLoading={specialtiesQuery.isLoading}
            onSearchChange={(v) => { setSpecSearch(v); setSpecPage(1); }}
            onPageChange={setSpecPage}
            onEditDoctor={(doctorId) => { setActiveSection("medicos"); }}
          />
        );
      case "agenda-medicos":
        return (
          <AvailabilityList
            items={availabilitiesQuery.data?.items ?? []}
            page={availabilitiesQuery.data?.page ?? 1}
            pageSize={availabilitiesQuery.data?.pageSize ?? 50}
            total={availabilitiesQuery.data?.total ?? 0}
            doctorId={availDoctorId}
            doctors={(doctorsQuery.data?.items ?? []).map((d) => ({ id: d.id ?? "", name: d.name ?? "" }))}
            isLoading={availabilitiesQuery.isLoading}
            onDoctorChange={(id) => { setAvailDoctorId(id); setAvailPage(1); }}
            onPageChange={setAvailPage}
          />
        );
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
          {currentNav.map(({ section, icon, label }) => (
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
