import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { formatCurrency, formatTime } from "@/lib/formatters";
import { DefaultService } from "@/services/api";
import {
  StatusBadge,
  resolveAppointmentStatus,
} from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/modal";
import { Field } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import type {
  AppointmentResponse,
  DoctorResponse,
  PatientResponse,
} from "@/generated";

const schema = z.object({
  patientId: z.string().min(1, "Selecione um paciente."),
  doctorId: z.string().min(1, "Selecione um medico."),
  startAt: z.string().min(1, "Informe a data e horario."),
  durationMinutes: z.coerce.number().min(15).max(180),
  type: z.string().min(3, "Informe o tipo da consulta."),
  amount: z.coerce.number().min(1, "Informe o valor da consulta."),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
type FormInput = z.input<typeof schema>;

function shiftDate(value: string, amount: number) {
  const d = new Date(value);
  d.setDate(d.getDate() + amount);
  return d.toISOString().slice(0, 10);
}

function statusBorderClass(status?: string) {
  switch (resolveAppointmentStatus(status)) {
    case "confirmed":  return "appt-confirmed";
    case "cancelled":
    case "noshow":     return "appt-cancelled";
    case "inprogress": return "appt-confirmed";
    case "completed":  return "appt-scheduled";
    default:           return "appt-scheduled";
  }
}

const STATUS_FILTERS = [
  { key: undefined, label: "Todos" },
  { key: "Scheduled" as const, label: "Agendado" },
  { key: "Confirmed" as const, label: "Confirmado" },
  { key: "InProgress" as const, label: "Em atendimento" },
  { key: "Completed" as const, label: "Concluido" },
  { key: "Cancelled" as const, label: "Cancelado" },
  { key: "NoShow" as const, label: "Faltou" },
];

const WEEKDAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const MONTH_NAMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function getWeekDays(from: string): string[] {
  const days: string[] = [];
  const d = new Date(from + "T12:00:00");
  for (let i = 0; i < 7; i++) {
    days.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

export function AppointmentBoard({
  appointments,
  patients,
  doctors,
  appointmentDate,
  appointmentViewMode = "day",
  appointmentDateFrom,
  appointmentDateTo,
  appointmentDoctorId,
  appointmentStatus,
  isLoading,
  onAppointmentDateChange,
  onAppointmentViewModeChange,
  onDoctorChange,
  onStatusChange,
  page,
  pageSize,
  total,
  onPageChange,
}: {
  appointments: AppointmentResponse[];
  patients: PatientResponse[];
  doctors: DoctorResponse[];
  appointmentDate: string;
  appointmentViewMode?: "day" | "week";
  appointmentDateFrom?: string;
  appointmentDateTo?: string;
  appointmentDoctorId: string | undefined;
  appointmentStatus: "Scheduled" | "Confirmed" | "Cancelled" | "Completed" | "NoShow" | "InProgress" | undefined;
  isLoading: boolean;
  onAppointmentDateChange: (value: string) => void;
  onAppointmentViewModeChange?: (value: "day" | "week") => void;
  onDoctorChange: (value: string | undefined) => void;
  onStatusChange: (value: "Scheduled" | "Confirmed" | "Cancelled" | "Completed" | "NoShow" | "InProgress" | undefined) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentResponse | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [processingAppointmentId, setProcessingAppointmentId] = useState<
    string | null
  >(null);
  const todayDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const defaultStartAt = `${appointmentDate}T15:00`;
  const queryClient = useQueryClient();
  const totalPages = Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));

  const patientMap = useMemo(
    () => Object.fromEntries(patients.map((patient) => [patient.id, patient])),
    [patients],
  );
  const doctorMap = useMemo(
    () => Object.fromEntries(doctors.map((doctor) => [doctor.id, doctor])),
    [doctors],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInput, undefined, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      patientId: patients[0]?.id ?? "",
      doctorId: doctors[0]?.id ?? "",
      startAt: defaultStartAt,
      durationMinutes: 30,
      type: "Retorno",
      amount: 180,
      notes: "",
    },
  });

  const createAppointment = useMutation({
    mutationFn: async (values: FormValues) =>
      DefaultService.appointmentsCreate({
        patientId: values.patientId,
        doctorId: values.doctorId,
        startAt: new Date(values.startAt).toISOString(),
        durationMinutes: values.durationMinutes,
        type: values.type,
        amount: values.amount,
        notes: values.notes || undefined,
      }),
    onSuccess: async () => {
      setFeedback("Consulta agendada com sucesso.");
      reset({
        patientId: patients[0]?.id ?? "",
        doctorId: doctors[0]?.id ?? "",
        startAt: defaultStartAt,
        durationMinutes: 30,
        type: "Retorno",
        amount: 180,
        notes: "",
      });
      setIsFormOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["appointments"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["receivables"] }),
      ]);
    },
    onError: () => {
      setFeedback("Nao foi possivel agendar a consulta agora.");
    },
  });

  const confirmAppointment = useMutation({
    mutationFn: async (appointment: AppointmentResponse) => {
      if (!appointment.id) {
        throw new Error("Consulta sem identificador.");
      }

      setProcessingAppointmentId(appointment.id);
      return DefaultService.appointmentsConfirm(appointment.id);
    },
    onSuccess: async (appointment) => {
      setFeedback(`${appointment.type ?? "Consulta"} confirmada com sucesso.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["appointments"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
    },
    onError: () => {
      setFeedback("Nao foi possivel confirmar a consulta agora.");
    },
    onSettled: () => {
      setProcessingAppointmentId(null);
    },
  });

  const cancelAppointment = useMutation({
    mutationFn: async (appointment: AppointmentResponse) => {
      if (!appointment.id) {
        throw new Error("Consulta sem identificador.");
      }

      setProcessingAppointmentId(appointment.id);
      return DefaultService.appointmentsCancel(appointment.id);
    },
    onSuccess: async (appointment) => {
      setFeedback(`${appointment.type ?? "Consulta"} cancelada com sucesso.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["appointments"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
    },
    onError: () => {
      setFeedback("Nao foi possivel cancelar a consulta agora.");
    },
    onSettled: () => {
      setProcessingAppointmentId(null);
    },
  });

  const markInProgressAppointment = useMutation({
    mutationFn: async (appointment: AppointmentResponse) => {
      if (!appointment.id) throw new Error("Consulta sem identificador.");
      setProcessingAppointmentId(appointment.id);
      return DefaultService.appointmentsInProgress(appointment.id);
    },
    onSuccess: async (appointment) => {
      setFeedback(`${appointment.type ?? "Consulta"} iniciada.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["appointments"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
    },
    onError: () => setFeedback("Nao foi possivel atualizar o status."),
    onSettled: () => setProcessingAppointmentId(null),
  });

  const completeAppointment = useMutation({
    mutationFn: async (appointment: AppointmentResponse) => {
      if (!appointment.id) throw new Error("Consulta sem identificador.");
      setProcessingAppointmentId(appointment.id);
      return DefaultService.appointmentsComplete(appointment.id);
    },
    onSuccess: async (appointment) => {
      setFeedback(`${appointment.type ?? "Consulta"} concluida.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["appointments"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
    },
    onError: () => setFeedback("Nao foi possivel concluir a consulta."),
    onSettled: () => setProcessingAppointmentId(null),
  });

  const markNoShowAppointment = useMutation({
    mutationFn: async (appointment: AppointmentResponse) => {
      if (!appointment.id) throw new Error("Consulta sem identificador.");
      setProcessingAppointmentId(appointment.id);
      return DefaultService.appointmentsNoShow(appointment.id);
    },
    onSuccess: async (appointment) => {
      setFeedback(`${appointment.type ?? "Consulta"} marcada como falta.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["appointments"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
    },
    onError: () => setFeedback("Nao foi possivel marcar falta."),
    onSettled: () => setProcessingAppointmentId(null),
  });

  const updateAppointment = useMutation({
    mutationFn: async ({
      appointmentId,
      values,
    }: {
      appointmentId: string;
      values: {
        doctorId?: string;
        startAt?: string;
        durationMinutes?: number;
        notes?: string;
        type?: string;
        amount?: number;
      };
    }) => DefaultService.appointmentsUpdate(appointmentId, values),
    onSuccess: async () => {
      setFeedback("Consulta atualizada com sucesso.");
      setEditingAppointment(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["appointments"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["receivables"] }),
      ]);
    },
    onError: () => {
      setFeedback("Nao foi possivel atualizar a consulta agora.");
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFeedback(null);
    await createAppointment.mutateAsync(values);
  });

  return (
    <>
      {isFormOpen ? (
        <Modal title="Agendar consulta" onClose={() => setIsFormOpen(false)}>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            <Field error={errors.patientId?.message} label="Paciente">
              <select className="input-field" {...register("patientId")}>
                <option value="">Selecione</option>
                {patients.map((patient) => (
                  <option key={patient.id ?? patient.cpf} value={patient.id}>
                    {patient.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field error={errors.doctorId?.message} label="Medico">
              <select className="input-field" {...register("doctorId")}>
                <option value="">Selecione</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id ?? doctor.crm} value={doctor.id}>
                    {doctor.name}
                    {(doctor.specialties ?? []).length > 0 ? ` - ${doctor.specialties!.map((s) => s.name).join(", ")}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field error={errors.startAt?.message} label="Inicio">
              <input className="input-field" type="datetime-local" {...register("startAt")} />
            </Field>
            <Field error={errors.durationMinutes?.message} label="Duracao (min)">
              <input
                className="input-field"
                min={15}
                step={15}
                type="number"
                {...register("durationMinutes")}
              />
            </Field>
            <Field error={errors.type?.message} label="Tipo">
              <input className="input-field" {...register("type")} />
            </Field>
            <Field error={errors.amount?.message} label="Valor">
              <input
                className="input-field"
                min={1}
                step="0.01"
                type="number"
                {...register("amount")}
              />
            </Field>
            <Field className="md:col-span-2" error={errors.notes?.message} label="Observacoes">
              <textarea className="input-field min-h-24" {...register("notes")} />
            </Field>
            <div className="md:col-span-2 flex justify-end gap-3">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setIsFormOpen(false)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                disabled={createAppointment.isPending}
                type="submit"
              >
                {createAppointment.isPending ? "Salvando..." : "Salvar consulta"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {editingAppointment ? (
        <Modal title="Editar consulta" onClose={() => setEditingAppointment(null)}>
          <AppointmentEditForm
            appointment={editingAppointment}
            doctors={doctors}
            onSaved={async (values) => {
              if (!editingAppointment.id) return;
              setFeedback(null);
              await updateAppointment.mutateAsync({
                appointmentId: editingAppointment.id,
                values,
              });
            }}
            onCancel={() => setEditingAppointment(null)}
          />
        </Modal>
      ) : null}

      <section className="panel p-5 md:p-6">
        <div className="section-heading">
          <div>
            <h3 className="text-base font-semibold text-[var(--ink)]">Agenda</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {total} consulta{total === 1 ? "" : "s"}
              {appointmentViewMode === "week" && appointmentDateFrom && appointmentDateTo
                ? ` de ${appointmentDateFrom} a ${appointmentDateTo}`
                : ` para ${appointmentDate}`}
            </p>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setFeedback(null);
              setIsFormOpen(true);
            }}
            type="button"
          >
            Agendar consulta
          </button>
        </div>

        {feedback ? (
          <div className="mb-4 rounded-md border border-[var(--border)] bg-[var(--brand-wash)] px-4 py-3 text-sm text-[var(--muted)]">
            {feedback}
          </div>
        ) : null}

        <div className="toolbar mt-4">
          <div className="toolbar-stack">
            <div className="toolbar-inline flex-wrap gap-3">
              <Field className="min-w-0 flex-1" label="Data da agenda">
                <input
                  className="input-field"
                  onChange={(event) => onAppointmentDateChange(event.target.value)}
                  type="date"
                  value={appointmentViewMode === "week" ? appointmentDateFrom ?? appointmentDate : appointmentDate}
                />
              </Field>
              <Field className="min-w-0 flex-1" label="Medico">
                <select
                  className="input-field"
                  onChange={(event) => onDoctorChange(event.target.value || undefined)}
                  value={appointmentDoctorId ?? ""}
                >
                  <option value="">Todos</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id ?? doctor.crm} value={doctor.id}>
                    {doctor.name}
                    {(doctor.specialties ?? []).length > 0 ? ` - ${doctor.specialties!.map((s) => s.name).join(", ")}` : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>
            <div className="toolbar-inline flex-wrap gap-3">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => onAppointmentDateChange(shiftDate(appointmentDate, appointmentViewMode === "week" ? -7 : -1))}
                type="button"
              >
                {appointmentViewMode === "week" ? "Semana anterior" : "Dia anterior"}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                disabled={appointmentDate === todayDate}
                onClick={() => onAppointmentDateChange(todayDate)}
                type="button"
              >
                Hoje
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => onAppointmentDateChange(shiftDate(appointmentDate, appointmentViewMode === "week" ? 7 : 1))}
                type="button"
              >
                {appointmentViewMode === "week" ? "Proxima semana" : "Proximo dia"}
              </button>
              {onAppointmentViewModeChange && (
                <div className="ml-2 flex rounded-md border border-[var(--border)] overflow-hidden">
                  <button
                    className={cn("btn btn-sm px-3 rounded-none", appointmentViewMode === "day" ? "btn-brand-outline" : "btn-ghost")}
                    onClick={() => onAppointmentViewModeChange("day")}
                    type="button"
                  >
                    Dia
                  </button>
                  <button
                    className={cn("btn btn-sm px-3 rounded-none border-l border-[var(--border)]", appointmentViewMode === "week" ? "btn-brand-outline" : "btn-ghost")}
                    onClick={() => onAppointmentViewModeChange("week")}
                    type="button"
                  >
                    Semana
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="toolbar-inline flex-wrap mt-3">
            {STATUS_FILTERS.map(({ key, label }) => (
              <button
                key={label}
                className={cn(
                  "btn btn-sm",
                  appointmentStatus === key ? "btn-brand-outline" : "btn-ghost",
                )}
                onClick={() => onStatusChange(key)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {appointmentViewMode === "week" && appointmentDateFrom ? (
          <WeekGrid
            appointments={appointments}
            patientMap={patientMap}
            doctorMap={doctorMap}
            weekDays={getWeekDays(appointmentDateFrom)}
            todayDate={todayDate}
            isLoading={isLoading}
            onDayClick={(day) => { onAppointmentDateChange(day); onAppointmentViewModeChange?.("day"); }}
          />
        ) : (
          <div className="stack-list mt-5">
            {isLoading ? (
              <AppointmentSkeleton />
            ) : appointments.length ? (
              appointments.map((appointment) => {
                const patient = patientMap[appointment.patientId ?? ""];
                const doctor = doctorMap[appointment.doctorId ?? ""];
                const statusVariant = resolveAppointmentStatus(appointment.status);
                const isProcessing = processingAppointmentId === appointment.id;

                return (
                  <article
                    className={cn("data-card appt-card", statusBorderClass(appointment.status))}
                    key={appointment.id ?? appointment.startAt ?? appointment.notes}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex items-baseline gap-3">
                        <span className="tabular-nums text-base font-semibold text-[var(--ink)] shrink-0">
                          {formatTime(appointment.startAt ?? new Date().toISOString())}
                        </span>
                        <div className="min-w-0">
                          <span className="font-semibold text-sm text-[var(--ink)]">
                            {patient?.name ?? "Paciente"}
                          </span>
                          <div className="meta-row mt-0.5">
                            {doctor?.name ? <span>{doctor.name}</span> : null}
                            {appointment.type ? <span>{appointment.type}</span> : null}
                            <span>{formatCurrency(appointment.amount ?? 0)}</span>
                          </div>
                          {appointment.notes ? (
                            <p className="mt-1 text-xs text-[var(--muted)] leading-5">{appointment.notes}</p>
                          ) : null}
                        </div>
                      </div>
                      <StatusBadge variant={statusVariant} />
                    </div>

                    <div className="toolbar-inline mt-3">
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={isProcessing}
                        onClick={() => {
                          setFeedback(null);
                          setEditingAppointment(appointment);
                        }}
                        type="button"
                      >
                        Editar
                      </button>
                      {appointment.status === "Scheduled" || appointment.status === "Confirmed" ? (
                        <button
                          className="btn btn-brand-outline btn-sm"
                          disabled={isProcessing}
                          onClick={() => {
                            setFeedback(null);
                            void confirmAppointment.mutateAsync(appointment);
                          }}
                          type="button"
                        >
                          {isProcessing ? <span className="spinner" /> : "Confirmar"}
                        </button>
                      ) : null}
                      {appointment.status === "Scheduled" || appointment.status === "Confirmed" ? (
                        <button
                          className="btn btn-sm"
                          disabled={isProcessing}
                          onClick={() => {
                            setFeedback(null);
                            void markInProgressAppointment.mutateAsync(appointment);
                          }}
                          type="button"
                        >
                          {isProcessing ? <span className="spinner" /> : "Em atendimento"}
                        </button>
                      ) : null}
                      {appointment.status === "InProgress" ? (
                        <button
                          className="btn btn-brand-outline btn-sm"
                          disabled={isProcessing}
                          onClick={() => {
                            setFeedback(null);
                            void completeAppointment.mutateAsync(appointment);
                          }}
                          type="button"
                        >
                          {isProcessing ? <span className="spinner" /> : "Compareceu"}
                        </button>
                      ) : null}
                      {appointment.status !== "Cancelled" && appointment.status !== "NoShow" && appointment.status !== "Completed" ? (
                        <button
                          className="btn btn-sm"
                          disabled={isProcessing}
                          onClick={() => {
                            setFeedback(null);
                            void markNoShowAppointment.mutateAsync(appointment);
                          }}
                          type="button"
                        >
                          {isProcessing ? <span className="spinner" /> : "Faltou"}
                        </button>
                      ) : null}
                      {appointment.status !== "Cancelled" && appointment.status !== "NoShow" && appointment.status !== "Completed" ? (
                        <button
                          className="btn btn-danger btn-sm"
                          disabled={isProcessing}
                          onClick={() => {
                            setFeedback(null);
                            void cancelAppointment.mutateAsync(appointment);
                          }}
                          type="button"
                        >
                          {isProcessing ? <span className="spinner" /> : "Remarcou"}
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="empty-state">
                <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                <p className="text-sm font-semibold">
                  Nenhuma consulta encontrada para a data selecionada.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="toolbar-inline mt-5 justify-between">
          <button
            className="btn btn-ghost btn-sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            type="button"
          >
            Pagina anterior
          </button>
          <span className="text-sm font-medium text-[var(--muted)]">
            Pagina {page} de {totalPages}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            type="button"
          >
            Proxima pagina
          </button>
        </div>
      </section>
    </>
  );
}

function AppointmentEditForm({
  appointment,
  doctors,
  onSaved,
  onCancel,
}: {
  appointment: AppointmentResponse;
  doctors: DoctorResponse[];
  onSaved: (values: { doctorId?: string; startAt?: string; durationMinutes?: number; notes?: string; type?: string; amount?: number }) => Promise<void>;
  onCancel: () => void;
}) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      doctorId: appointment.doctorId ?? doctors[0]?.id ?? "",
      startAt: appointment.startAt
        ? appointment.startAt.slice(0, 16)
        : new Date().toISOString().slice(0, 16),
      durationMinutes: appointment.endAt && appointment.startAt
        ? Math.round((new Date(appointment.endAt).getTime() - new Date(appointment.startAt).getTime()) / 60000)
        : 30,
      type: appointment.type ?? "Retorno",
      amount: appointment.amount ?? 0,
      notes: appointment.notes ?? "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFeedback(null);
    const patch: { doctorId?: string; startAt?: string; durationMinutes?: number; notes?: string; type?: string; amount?: number } = {};
    if (values.doctorId !== appointment.doctorId) patch.doctorId = values.doctorId;
    if (values.type !== appointment.type) patch.type = values.type;
    if (Number(values.amount) !== appointment.amount) patch.amount = Number(values.amount);
    if (values.notes !== (appointment.notes ?? "")) patch.notes = values.notes || undefined;

    const minutes = Number(values.durationMinutes);
    const originalMinutes = appointment.endAt && appointment.startAt
      ? Math.round((new Date(appointment.endAt).getTime() - new Date(appointment.startAt).getTime()) / 60000)
      : 30;
    if (minutes !== originalMinutes) patch.durationMinutes = minutes;

    const newStart = new Date(values.startAt).toISOString();
    if (newStart !== appointment.startAt) patch.startAt = newStart;

    if (Object.keys(patch).length === 0) {
      onCancel();
      return;
    }
    await onSaved(patch);
  });

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
      <Field error={errors.doctorId?.message} label="Medico">
        <select className="input-field" {...register("doctorId")}>
          {doctors.map((doctor) => (
            <option key={doctor.id} value={doctor.id}>
              {doctor.name}
              {(doctor.specialties ?? []).length > 0 ? ` - ${doctor.specialties!.map((s) => s.name).join(", ")}` : ""}
            </option>
          ))}
        </select>
      </Field>
      <Field error={errors.startAt?.message} label="Inicio">
        <input className="input-field" type="datetime-local" {...register("startAt")} />
      </Field>
      <Field error={errors.durationMinutes?.message} label="Duracao (min)">
        <input className="input-field" min={15} step={15} type="number" {...register("durationMinutes")} />
      </Field>
      <Field error={errors.type?.message} label="Tipo">
        <input className="input-field" {...register("type")} />
      </Field>
      <Field error={errors.amount?.message} label="Valor">
        <input className="input-field" min={1} step="0.01" type="number" {...register("amount")} />
      </Field>
      <Field className="md:col-span-2" error={errors.notes?.message} label="Observacoes">
        <textarea className="input-field min-h-24" {...register("notes")} />
      </Field>
      {feedback ? (
        <p className="md:col-span-2 text-sm text-[var(--muted)]">{feedback}</p>
      ) : null}
      <div className="md:col-span-2 flex justify-end gap-3">
        <button className="btn btn-ghost btn-sm" onClick={onCancel} type="button">Cancelar</button>
        <button className="btn btn-primary" type="submit">
          Salvar alteracoes
        </button>
      </div>
    </form>
  );
}

function WeekGrid({
  appointments,
  patientMap,
  doctorMap,
  weekDays,
  todayDate,
  isLoading,
  onDayClick,
}: {
  appointments: AppointmentResponse[];
  patientMap: Record<string, PatientResponse | undefined>;
  doctorMap: Record<string, DoctorResponse | undefined>;
  weekDays: string[];
  todayDate: string;
  isLoading: boolean;
  onDayClick: (day: string) => void;
}) {
  const dayAppointments = useMemo(() => {
    const map: Record<string, AppointmentResponse[]> = {};
    for (const day of weekDays) map[day] = [];
    for (const apt of appointments) {
      const day = apt.startAt?.slice(0, 10);
      if (day && map[day]) map[day].push(apt);
    }
    return map;
  }, [appointments, weekDays]);

  if (isLoading) {
    return (
      <div className="mt-5 grid grid-cols-7 gap-2 overflow-x-auto">
        {weekDays.map((_, i) => (
          <div key={i} className="flex flex-col gap-2 min-w-[120px]">
            <div className="skeleton h-12 rounded" />
            <div className="skeleton h-20 rounded" />
            <div className="skeleton h-16 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-5 grid grid-cols-7 gap-2 overflow-x-auto">
      {weekDays.map((day) => {
        const dateObj = new Date(day + "T12:00:00");
        const dayName = WEEKDAY_NAMES[dateObj.getDay()];
        const dayNum = dateObj.getDate();
        const month = MONTH_NAMES[dateObj.getMonth()];
        const isToday = day === todayDate;
        const apts = dayAppointments[day] ?? [];

        return (
          <div key={day} className="flex flex-col gap-1.5 min-w-[130px]">
            <button
              className={cn(
                "flex flex-col items-center rounded-lg p-2 text-sm transition-colors",
                isToday
                  ? "bg-[var(--brand)] text-white"
                  : "bg-[var(--surface-brand)] text-[var(--ink)] hover:bg-[var(--border)]",
              )}
              onClick={() => onDayClick(day)}
              type="button"
            >
              <span className="text-[10px] uppercase tracking-wide font-semibold">{dayName}</span>
              <span className="text-lg font-bold leading-tight">{dayNum}</span>
              <span className="text-[10px] uppercase">{month}</span>
            </button>
            <div className="flex flex-col gap-1">
              {apts.length === 0 && !isLoading && (
                <p className="text-[11px] text-[var(--muted)] text-center py-2">—</p>
              )}
              {apts.map((apt) => {
                const patient = patientMap[apt.patientId ?? ""];
                const statusVariant = resolveAppointmentStatus(apt.status);
                const isCancelled = statusVariant === "cancelled";
                return (
                  <div
                    key={apt.id}
                    className={cn(
                      "rounded-md border p-1.5 text-[11px] leading-tight transition-colors",
                      isCancelled ? "border-[var(--border)] opacity-60" : statusBorderClass(apt.status),
                    )}
                  >
                    <div className="font-semibold text-[var(--ink)]">
                      {formatTime(apt.startAt ?? "")}
                    </div>
                    <div className={cn("truncate", isCancelled ? "text-[var(--muted)]" : "text-[var(--ink)]")}>
                      {patient?.name ?? "—"}
                    </div>
                    <StatusBadge variant={statusVariant} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AppointmentSkeleton() {
  return (
    <div className="stack-list" aria-busy aria-label="Carregando agenda">
      {[1, 2, 3].map((index) => (
        <div key={index} className="data-card">
          <div className="flex items-center gap-3">
            <div className="skeleton h-4 w-12 rounded" />
            <div className="space-y-2">
              <div className="skeleton h-4 w-36 rounded" />
              <div className="skeleton h-3 w-28 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
