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
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function statusBorderClass(status?: string) {
  switch (status?.toLowerCase()) {
    case "confirmed":
      return "appt-confirmed";
    case "cancelled":
      return "appt-cancelled";
    default:
      return "appt-scheduled";
  }
}

export function AppointmentBoard({
  appointments,
  patients,
  doctors,
  appointmentDate,
  appointmentDoctorId,
  isLoading,
  onAppointmentDateChange,
  onDoctorChange,
  page,
  pageSize,
  total,
  onPageChange,
}: {
  appointments: AppointmentResponse[];
  patients: PatientResponse[];
  doctors: DoctorResponse[];
  appointmentDate: string;
  appointmentDoctorId: string | undefined;
  isLoading: boolean;
  onAppointmentDateChange: (value: string) => void;
  onDoctorChange: (value: string | undefined) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
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
                    {doctor.specialty ? ` - ${doctor.specialty}` : ""}
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

      <section className="panel p-5 md:p-6">
        <div className="section-heading">
          <div>
            <h3 className="text-base font-semibold text-[var(--ink)]">Agenda</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {total} consulta{total === 1 ? "" : "s"} para {appointmentDate}
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
                  value={appointmentDate}
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
                      {doctor.specialty ? ` - ${doctor.specialty}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="toolbar-inline flex-wrap gap-3">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => onAppointmentDateChange(shiftDate(appointmentDate, -1))}
                type="button"
              >
                Dia anterior
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
                onClick={() => onAppointmentDateChange(shiftDate(appointmentDate, 1))}
                type="button"
              >
                Proximo dia
              </button>
            </div>
          </div>
        </div>

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
                    {appointment.status !== "Confirmed" ? (
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
                    {appointment.status !== "Cancelled" ? (
                      <button
                        className="btn btn-danger btn-sm"
                        disabled={isProcessing}
                        onClick={() => {
                          setFeedback(null);
                          void cancelAppointment.mutateAsync(appointment);
                        }}
                        type="button"
                      >
                        {isProcessing ? <span className="spinner" /> : "Cancelar"}
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

        {totalPages > 1 ? (
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
        ) : null}
      </section>
    </>
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

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      {children}
      {error ? (
        <span className="mt-2 block text-sm text-[var(--danger)]">{error}</span>
      ) : null}
    </label>
  );
}
