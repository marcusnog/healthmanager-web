import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { apiErrorMessage } from "@/lib/api-error";
import type {
  AppointmentResponse,
  AppointmentTypeResponse,
  UpdateAppointmentStatusRequest,
  CreatePaymentRequest,
  DoctorResponse,
  PatientResponse,
  ReceivableResponse,
} from "@/generated";
import { ClinicalRecordModal } from "./clinical-record-modal";
import { PatientCreateModal } from "../patients/patient-list";
import { PatientSearch } from "./patient-search";

const schema = z.object({
  patientId: z.string().min(1, "Selecione um paciente."),
  doctorId: z.string().min(1, "Selecione um medico."),
  startAt: z.string().min(1, "Informe a data e horario."),
  durationMinutes: z.coerce.number().min(15).max(180),
  appointmentTypeId: z.string().min(1, "Selecione o tipo da consulta."),
  amount: z.coerce.number().min(1, "Informe o valor da consulta."),
  notes: z.string().optional(),
});

const paymentSchema = z.object({
  amount: z.coerce.number().positive("Informe um valor valido."),
  paymentMethod: z.enum(["Cash", "Pix", "CreditCard", "DebitCard", "Insurance"]),
});

type FormValues = z.infer<typeof schema>;
type FormInput = z.input<typeof schema>;

function shiftDate(value: string, amount: number) {
  const d = new Date(value);
  d.setDate(d.getDate() + amount);
  return d.toISOString().slice(0, 10);
}

function shiftMonth(value: string, amount: number) {
  const d = new Date(`${value.slice(0, 7)}-01T12:00:00`);
  d.setMonth(d.getMonth() + amount);
  return d.toISOString().slice(0, 10);
}

function toLocalDateTime(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function statusBorderClass(status?: string) {
  switch (resolveAppointmentStatus(status)) {
    case "confirmed": return "appt-confirmed";
    case "cancelled": return "appt-cancelled";
    case "noshow": return "appt-noshow";
    case "inprogress": return "appt-inprogress";
    case "completed": return "appt-completed";
    default: return "appt-scheduled";
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

function getMonthDays(value: string): string[] {
  const cursor = new Date(`${value.slice(0, 7)}-01T12:00:00`);
  const month = cursor.getMonth();
  const days: string[] = [];
  while (cursor.getMonth() === month) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function appointmentColorStyle(status?: string, filled = false) {
  const variant = resolveAppointmentStatus(status);
  if (filled) {
    const background = variant === "scheduled" ? "var(--brand-strong)" : `var(--status-${variant}-color)`;
    return {
      backgroundColor: background,
      borderColor: background,
      color: variant === "completed" || variant === "noshow" ? "var(--surface-inverse)" : "var(--surface)",
    };
  }
  return {
    backgroundColor: variant === "scheduled" ? "var(--brand-wash)" : `var(--status-${variant}-bg)`,
    borderColor: variant === "scheduled" ? "var(--brand)" : `var(--status-${variant}-color)`,
    color: "var(--ink)",
  };
}

export function AppointmentBoard({
  appointments,
  receivables = [],
  patients,
  doctors,
  appointmentTypes = [],
  canWriteClinicalRecord = false,
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
  receivables?: ReceivableResponse[];
  patients: PatientResponse[];
  doctors: DoctorResponse[];
  appointmentTypes?: AppointmentTypeResponse[];
  canWriteClinicalRecord?: boolean;
  appointmentDate: string;
  appointmentViewMode?: "day" | "week" | "month";
  appointmentDateFrom?: string;
  appointmentDateTo?: string;
  appointmentDoctorId: string | undefined;
  appointmentStatus: "Scheduled" | "Confirmed" | "Cancelled" | "Completed" | "NoShow" | "InProgress" | undefined;
  isLoading: boolean;
  onAppointmentDateChange: (value: string) => void;
  onAppointmentViewModeChange?: (value: "day" | "week" | "month") => void;
  onDoctorChange: (value: string | undefined) => void;
  onStatusChange: (value: "Scheduled" | "Confirmed" | "Cancelled" | "Completed" | "NoShow" | "InProgress" | undefined) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPatientFormOpen, setIsPatientFormOpen] = useState(false);
  const [createdPatient, setCreatedPatient] = useState<PatientResponse | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentResponse | null>(null);
  const [clinicalRecordAppointment, setClinicalRecordAppointment] = useState<AppointmentResponse | null>(null);
  const [paymentReceivable, setPaymentReceivable] = useState<ReceivableResponse | null>(null);
  const [deletingAppointment, setDeletingAppointment] = useState<AppointmentResponse | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<string | null>(null);
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
  const receivableMap = useMemo(
    () => Object.fromEntries(receivables.filter((item) => item.appointmentId).map((item) => [item.appointmentId, item])),
    [receivables],
  );

  const {
    register: registerPayment,
    handleSubmit: handlePaymentSubmit,
    reset: resetPayment,
    formState: { errors: paymentErrors },
  } = useForm<z.input<typeof paymentSchema>, undefined, z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: 0, paymentMethod: "Pix" },
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormInput, undefined, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      patientId: patients[0]?.id ?? "",
      doctorId: doctors[0]?.id ?? "",
      startAt: defaultStartAt,
      durationMinutes: 30,
      appointmentTypeId: appointmentTypes[0]?.id ?? "",
      amount: 180,
      notes: "",
    },
  });

  const selectedPatientId = useWatch({ control, name: "patientId" });

  const createAppointment = useMutation({
    mutationFn: async (values: FormValues) =>
      DefaultService.appointmentsCreate({
        patientId: values.patientId,
        doctorId: values.doctorId,
        startAt: new Date(values.startAt).toISOString(),
        durationMinutes: values.durationMinutes,
        appointmentTypeId: values.appointmentTypeId,
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
        appointmentTypeId: appointmentTypes[0]?.id ?? "",
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
    onError: (error) => {
      setFeedback(apiErrorMessage(error, "Nao foi possivel agendar a consulta agora."));
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

  const changeStatus = useMutation({
    mutationFn: async ({ appointment, status }: { appointment: AppointmentResponse; status: NonNullable<AppointmentResponse["status"]> }) => {
      if (!appointment.id) throw new Error("Consulta sem identificador.");
      setProcessingAppointmentId(appointment.id);
      return DefaultService.appointmentsUpdateStatus(appointment.id, { status: status as UpdateAppointmentStatusRequest.status });
    },
    onSuccess: async () => {
      setFeedback("Status atualizado. Se marcou por engano, selecione o status correto.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["appointments"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["receivables"] }),
        queryClient.invalidateQueries({ queryKey: ["appointment-receivables"] }),
        queryClient.invalidateQueries({ queryKey: ["financial-summary"] }),
      ]);
    },
    onError: (error) => setFeedback(apiErrorMessage(error, "Nao foi possivel atualizar o status.")),
    onSettled: () => setProcessingAppointmentId(null),
  });

  const deleteAppointment = useMutation({
    mutationFn: async (appointment: AppointmentResponse) => {
      if (!appointment.id) throw new Error("Agendamento sem identificador.");
      setProcessingAppointmentId(appointment.id);
      return DefaultService.appointmentsDelete(appointment.id);
    },
    onSuccess: async () => {
      setDeletingAppointment(null);
      setEditingAppointment(null);
      setFeedback("Agendamento excluido com sucesso.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["appointments"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["receivables"] }),
        queryClient.invalidateQueries({ queryKey: ["appointment-receivables"] }),
        queryClient.invalidateQueries({ queryKey: ["financial-summary"] }),
      ]);
    },
    onError: (error) => setDeleteFeedback(apiErrorMessage(error, "Nao foi possivel excluir o agendamento.")),
    onSettled: () => setProcessingAppointmentId(null),
  });

  const openDelete = (appointment: AppointmentResponse) => {
    setDeleteFeedback(null);
    setDeletingAppointment(appointment);
  };

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
        appointmentTypeId?: string;
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
  });

  useEffect(() => {
    if (createdPatient?.id) setValue("patientId", createdPatient.id, { shouldValidate: true });
  }, [createdPatient, setValue]);

  const registerPaymentMutation = useMutation({
    mutationFn: (values: z.infer<typeof paymentSchema>) => DefaultService.paymentsCreate({
      receivableId: paymentReceivable!.id!,
      amount: values.amount,
      paymentMethod: values.paymentMethod,
      paidAt: new Date().toISOString(),
      fundsRecipient: (values.paymentMethod === "CreditCard" || values.paymentMethod === "DebitCard" ? "Owner" : "Clinic") as CreatePaymentRequest.fundsRecipient,
    }),
    onSuccess: async () => {
      setPaymentReceivable(null);
      setFeedback("Pagamento restante registrado com sucesso.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["appointment-receivables"] }),
        queryClient.invalidateQueries({ queryKey: ["receivables"] }),
        queryClient.invalidateQueries({ queryKey: ["payments"] }),
        queryClient.invalidateQueries({ queryKey: ["financial-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
    },
    onError: (error) => setFeedback(apiErrorMessage(error, "Nao foi possivel registrar o pagamento agora.")),
  });

  const openPayment = (receivable: ReceivableResponse) => {
    setFeedback(null);
    setPaymentReceivable(receivable);
    resetPayment({ amount: receivable.outstandingAmount ?? 0, paymentMethod: "Pix" });
  };

  const onSubmit = handleSubmit(async (values) => {
    setFeedback(null);
    await createAppointment.mutateAsync(values);
  });

  return (
    <>
      {deletingAppointment ? (
        <Modal title="Excluir agendamento" onClose={() => { if (!deleteAppointment.isPending) setDeletingAppointment(null); }}>
          <p className="text-sm">
            Excluir o agendamento de <strong>{patientMap[deletingAppointment.patientId ?? ""]?.name ?? deletingAppointment.patientName ?? "Paciente"}</strong>
            {deletingAppointment.startAt ? ` em ${new Date(deletingAppointment.startAt).toLocaleString("pt-BR")}` : ""}?
          </p>
          <p className="mt-3 text-sm text-[var(--muted)]">O agendamento sera removido da agenda e a cobranca sem pagamento sera cancelada. Agendamentos com pagamento, prontuario ou cobranca em andamento nao podem ser excluidos.</p>
          {deleteFeedback ? <p role="alert" className="mt-3 text-sm">{deleteFeedback}</p> : null}
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <button className="btn btn-ghost min-h-11" disabled={deleteAppointment.isPending} onClick={() => setDeletingAppointment(null)} type="button">Manter agendamento</button>
            <button className="btn btn-danger min-h-11" disabled={deleteAppointment.isPending} onClick={() => deleteAppointment.mutate(deletingAppointment)} type="button">{deleteAppointment.isPending ? "Excluindo..." : "Confirmar exclusao"}</button>
          </div>
        </Modal>
      ) : null}
      {isFormOpen ? (
        <Modal title="Agendar consulta" onClose={() => setIsFormOpen(false)}>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            <Field error={errors.patientId?.message} label="Paciente" className="md:col-span-2">
              <div className="flex gap-2">
              <PatientSearch
                patients={[...patients, ...(createdPatient && !patients.some(patient => patient.id === createdPatient.id) ? [createdPatient] : [])]}
                value={selectedPatientId}
                onChange={patient => setValue("patientId", patient?.id ?? "", { shouldValidate: true })}
              />
              <button className="btn btn-ghost btn-sm shrink-0" onClick={() => setIsPatientFormOpen(true)} type="button">Cadastrar paciente</button>
              </div>
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
            <Field error={errors.appointmentTypeId?.message} label="Tipo">
              <select className="input-field" {...register("appointmentTypeId")}>
                <option value="">Selecione</option>
                {appointmentTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
              </select>
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
          <label className="mb-4 flex flex-wrap items-center gap-2 text-sm font-medium">
            Alterar status
            <select className="input-field min-h-11 w-auto" aria-label="Alterar status da consulta selecionada"
              disabled={changeStatus.isPending || deleteAppointment.isPending}
              value={(appointments.find(item => item.id === editingAppointment.id) ?? editingAppointment).status ?? "Scheduled"}
              onChange={(event) => changeStatus.mutate({ appointment: editingAppointment, status: event.target.value as NonNullable<AppointmentResponse["status"]> })}>
              {STATUS_FILTERS.filter(status => status.key).map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          {feedback ? <p role="status" className="mb-4 text-sm">{feedback}</p> : null}
          <button className="btn btn-danger mb-4 min-h-11" disabled={changeStatus.isPending || deleteAppointment.isPending} onClick={() => openDelete(editingAppointment)} type="button">Excluir agendamento</button>
          <AppointmentEditForm
            appointment={appointments.find(item => item.id === editingAppointment.id) ?? editingAppointment}
            doctors={doctors}
            appointmentTypes={appointmentTypes}
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

      {clinicalRecordAppointment ? (
        <ClinicalRecordModal
          appointment={clinicalRecordAppointment}
          canWrite={canWriteClinicalRecord}
          onClose={() => setClinicalRecordAppointment(null)}
        />
      ) : null}

      {isPatientFormOpen ? (
        <PatientCreateModal
          onClose={() => setIsPatientFormOpen(false)}
          onCreated={(patient) => {
            setCreatedPatient(patient);
            setValue("patientId", patient.id ?? "", { shouldValidate: true });
            setIsPatientFormOpen(false);
          }}
        />
      ) : null}

      {paymentReceivable ? (
        <Modal title="Receber saldo da consulta" onClose={() => setPaymentReceivable(null)}>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handlePaymentSubmit((values) => registerPaymentMutation.mutateAsync(values))}>
            <p className="md:col-span-2 text-sm text-[var(--muted)]">
              Saldo em aberto: {formatCurrency(paymentReceivable.outstandingAmount ?? 0)}
            </p>
            <Field error={paymentErrors.amount?.message} label="Valor recebido">
              <input className="input-field" max={paymentReceivable.outstandingAmount ?? undefined} min={0.01} step="0.01" type="number" {...registerPayment("amount")} />
            </Field>
            <Field error={paymentErrors.paymentMethod?.message} label="Forma de pagamento">
              <select className="input-field" {...registerPayment("paymentMethod")}>
                <option value="Pix">Pix</option>
                <option value="Cash">Dinheiro</option>
                <option value="CreditCard">Cartao de credito</option>
                <option value="DebitCard">Cartao de debito</option>
                <option value="Insurance">Convenio</option>
              </select>
            </Field>
            <div className="md:col-span-2 flex justify-end gap-3">
              <button className="btn btn-ghost btn-sm" onClick={() => setPaymentReceivable(null)} type="button">Cancelar</button>
              <button className="btn btn-primary" disabled={registerPaymentMutation.isPending} type="submit">
                {registerPaymentMutation.isPending ? <span className="spinner" /> : "Confirmar recebimento"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      <section className={cn("panel p-5 md:p-6", isExpanded && "fixed inset-0 z-40 overflow-auto rounded-none")} aria-label="Quadro de atendimentos" onKeyDown={(event) => { if (isExpanded && event.key === "Escape") setIsExpanded(false); }}>
        <div className="section-heading">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-base font-semibold text-[var(--ink)]">Agenda</h3>
              <button className="btn btn-ghost min-h-11" type="button" aria-pressed={isExpanded} onClick={() => setIsExpanded(!isExpanded)}>{isExpanded ? "Sair da tela ampliada" : "Ampliar quadro"}</button>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {total} consulta{total === 1 ? "" : "s"}
              {appointmentViewMode !== "day" && appointmentDateFrom && appointmentDateTo
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
                  value={appointmentViewMode === "day" ? appointmentDate : appointmentDateFrom ?? appointmentDate}
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
                onClick={() => onAppointmentDateChange(appointmentViewMode === "month" ? shiftMonth(appointmentDate, -1) : shiftDate(appointmentDate, appointmentViewMode === "week" ? -7 : -1))}
                type="button"
              >
                {appointmentViewMode === "week" ? "Semana anterior" : appointmentViewMode === "month" ? "Mes anterior" : "Dia anterior"}
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
                onClick={() => onAppointmentDateChange(appointmentViewMode === "month" ? shiftMonth(appointmentDate, 1) : shiftDate(appointmentDate, appointmentViewMode === "week" ? 7 : 1))}
                type="button"
              >
                {appointmentViewMode === "week" ? "Proxima semana" : appointmentViewMode === "month" ? "Proximo mes" : "Proximo dia"}
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
                  <button
                    className={cn("btn btn-sm px-3 rounded-none border-l border-[var(--border)]", appointmentViewMode === "month" ? "btn-brand-outline" : "btn-ghost")}
                    onClick={() => onAppointmentViewModeChange("month")}
                    type="button"
                  >
                    Mes
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
                {key ? <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: appointmentColorStyle(key).borderColor }} /> : null}
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
            onEdit={setEditingAppointment}
            onConfirm={(appointment) => {
              setFeedback(null);
              confirmAppointment.mutate(appointment);
            }}
            processingAppointmentId={processingAppointmentId}
            onDayClick={(day) => { onAppointmentDateChange(day); onAppointmentViewModeChange?.("day"); }}
          />
        ) : appointmentViewMode === "month" ? (
          <MonthGrid appointments={appointments} patientMap={patientMap} doctorMap={doctorMap} monthDays={getMonthDays(appointmentDate)} todayDate={todayDate} isLoading={isLoading} onDayClick={(day) => { onAppointmentDateChange(day); onAppointmentViewModeChange?.("day"); }} />
        ) : (
          <>

          <DailyTimeRuler appointments={appointments} appointmentDate={appointmentDate} patientMap={patientMap} doctors={doctors.filter(doctor => !appointmentDoctorId || doctor.id === appointmentDoctorId)} isLoading={isLoading} onEdit={setEditingAppointment} />
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {isLoading ? (
              <AppointmentSkeleton />
            ) : appointments.length ? (
              appointments.map((appointment) => {
                const patient = patientMap[appointment.patientId ?? ""];
                const doctor = doctorMap[appointment.doctorId ?? ""];
                const statusVariant = resolveAppointmentStatus(appointment.status);
                const isProcessing = processingAppointmentId === appointment.id;
                const receivable = receivableMap[appointment.id ?? ""];

                return (
                  <article
                    className={cn("data-card appt-card", statusBorderClass(appointment.status))}
                    style={appointmentColorStyle(appointment.status, true)}
                    key={appointment.id ?? appointment.startAt ?? appointment.notes}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex items-baseline gap-3">
                        <span className="tabular-nums text-base font-semibold shrink-0">
                          {formatTime(appointment.startAt ?? new Date().toISOString())}
                        </span>
                        <div className="min-w-0">
                          <span className="font-semibold text-sm">
                            {patient?.name ?? "Paciente"}
                          </span>
                          <div className="meta-row mt-0.5" style={{ color: "inherit" }}>
                            {doctor?.name ? <span>{doctor.name}</span> : null}
                            {appointment.type ? <span>{appointment.type}</span> : null}
                            <span>{formatCurrency(appointment.amount ?? 0)}</span>
                          </div>
                          {appointment.notes ? (
                            <p className="mt-1 text-xs leading-5">{appointment.notes}</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-start gap-2 rounded-md bg-[var(--surface)] p-1">
                        {appointment.source && appointment.source !== "Internal" && (
                          <span className="inline-flex items-center rounded-full bg-[var(--brand-wash)] px-2 py-0.5 text-[10px] font-semibold text-[var(--brand)] whitespace-nowrap">
                            {appointment.source}
                          </span>
                        )}
                        <StatusBadge variant={statusVariant} />
                      </div>
                    </div>

                    <div className="toolbar-inline mt-3 rounded-md bg-[var(--surface)] p-2 text-[var(--ink)]">
                      <label className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        Alterar status
                        <select
                          aria-label={`Alterar status de ${patient?.name ?? "Paciente"}`}
                          className="input-field min-h-11 w-auto"
                          disabled={isProcessing || changeStatus.isPending || deleteAppointment.isPending}
                          value={appointment.status ?? "Scheduled"}
                          onChange={(event) => {
                            setFeedback(null);
                            changeStatus.mutate({ appointment, status: event.target.value as NonNullable<AppointmentResponse["status"]> });
                          }}
                        >
                          {STATUS_FILTERS.filter((status) => status.key).map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
                        </select>
                        {isProcessing ? <span role="status">Salvando...</span> : null}
                      </label>
                      <button className="btn btn-danger min-h-11" disabled={isProcessing || changeStatus.isPending || deleteAppointment.isPending} onClick={() => openDelete(appointment)} type="button">Excluir agendamento</button>
                      <details className="relative">
                        <summary className="btn btn-ghost btn-sm cursor-pointer list-none">Mais acoes</summary>
                        <div className="mt-2 flex flex-wrap gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] p-2">
                          <button className="btn btn-ghost btn-sm" disabled={isProcessing} onClick={() => { setFeedback(null); setEditingAppointment(appointment); }} type="button">Editar / Remarcar</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setFeedback(null); setClinicalRecordAppointment(appointment); }} type="button">Prontuario</button>
                          {(receivable?.receivedAmount ?? 0) > 0 && (receivable?.outstandingAmount ?? 0) > 0 ? <button className="btn btn-primary btn-sm" onClick={() => openPayment(receivable)} type="button">Receber saldo</button> : null}
                        </div>
                      </details>
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
          </>
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

function DailyTimeRuler({ appointments, appointmentDate, patientMap, doctors, isLoading, onEdit }: {
  appointments: AppointmentResponse[];
  appointmentDate: string;
  patientMap: Record<string, PatientResponse>;
  doctors: DoctorResponse[];
  isLoading: boolean;
  onEdit: (appointment: AppointmentResponse) => void;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const minutes = (value: string) => {
    const date = new Date(value);
    return date.getHours() * 60 + date.getMinutes();
  };
  const valid = appointments.filter(apt => apt.startAt && Number.isFinite(new Date(apt.startAt).getTime()));
  const start = Math.min(480, ...valid.map(apt => Math.floor(minutes(apt.startAt!) / 60) * 60));
  const end = Math.max(1080, ...valid.map(apt => {
    const finish = minutes(apt.startAt!) + (apt.endAt ? (new Date(apt.endAt).getTime() - new Date(apt.startAt!).getTime()) / 60_000 : 30);
    return Math.ceil(finish / 60) * 60;
  }));
  const height = "clamp(320px, 52dvh, 600px)";
  const position = (minute: number) => `${(minute - start) / (end - start) * 100}%`;
  const columns = [...doctors.map(doctor => ({ id: doctor.id, name: doctor.name ?? "Médico" }))];
  for (const apt of valid) {
    if (!columns.some(column => column.id === apt.doctorId)) columns.push({ id: apt.doctorId, name: "Médico não informado" });
  }
  if (!columns.length) columns.push({ id: undefined, name: "Consultas" });
  const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (isLoading) return <AppointmentSkeleton />;
  return (
    <div aria-label="Regua de horarios do dia" className="mt-5 rounded-md border border-[var(--border)] bg-[var(--surface)]">
      <div className="grid min-w-0" style={{ gridTemplateColumns: `52px repeat(${columns.length}, minmax(0, 1fr))` }}>
        <div className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)] px-2 py-4 text-xs text-[var(--muted)]">Horário</div>
        {columns.map(column => <div key={column.id ?? "unknown"} title={column.name} className="min-w-0 border-b border-l border-[var(--border)] bg-[var(--surface)] px-2 py-3 text-xs font-semibold"><span className="line-clamp-2 break-words">{column.name}</span></div>)}
        <div aria-hidden className="relative text-xs text-[var(--muted)]" style={{ height }}>
          {Array.from({ length: Math.ceil((end - start) / 60) + 1 }, (_, index) => {
            const time = start + index * 60;
            return <span key={time} className="absolute right-2" style={time === end ? { bottom: 0 } : { top: position(time) }}>{String(Math.floor(time / 60)).padStart(2, "0")}:{String(time % 60).padStart(2, "0")}</span>;
          })}
        </div>
        {columns.map(column => {
          const items = valid.filter(apt => apt.doctorId === column.id).sort((a, b) => new Date(a.startAt!).getTime() - new Date(b.startAt!).getTime());
          const groups: AppointmentResponse[][] = [];
          let groupEnd = 0;
          for (const apt of items) {
            const begin = new Date(apt.startAt!).getTime();
            const finish = apt.endAt ? new Date(apt.endAt).getTime() : begin + 30 * 60_000;
            if (!groups.length || begin >= groupEnd) { groups.push([]); groupEnd = finish; }
            groups[groups.length - 1].push(apt);
            groupEnd = Math.max(groupEnd, finish);
          }
          return <div key={column.id ?? "unknown"} className="relative min-w-0 border-l border-[var(--border)]" style={{ height, backgroundImage: `repeating-linear-gradient(to bottom, var(--border) 0px, var(--border) 1px, transparent 1px, transparent ${60 / (end - start) * 100}%)` }}>
            {groups.flatMap(group => {
              const laneEnds: number[] = [];
              const placements = group.map(apt => {
                const begin = new Date(apt.startAt!).getTime();
                const finish = apt.endAt ? new Date(apt.endAt).getTime() : begin + 30 * 60_000;
                let lane = laneEnds.findIndex(end => end <= begin);
                if (lane === -1) lane = laneEnds.length;
                laneEnds[lane] = finish;
                return { apt, lane, duration: (finish - begin) / 60_000 };
              });
              return placements.map(({ apt, lane, duration }) => {
                const patient = patientMap[apt.patientId ?? ""];
                const label = `${patient?.name ?? "Paciente"}, ${formatTime(apt.startAt!)}${apt.endAt ? ` - ${formatTime(apt.endAt)}` : ""}, ${STATUS_FILTERS.find(status => status.key === apt.status)?.label ?? "Agendado"}`;
                return <button type="button" key={apt.id} aria-label={`Editar consulta: ${label}`} title={label} onClick={() => onEdit(apt)} className="@container absolute flex flex-col justify-center overflow-hidden rounded-sm border px-1.5 text-left text-xs leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]" style={{ ...appointmentColorStyle(apt.status, true), fontSize: "12px", lineHeight: "12px", top: position(minutes(apt.startAt!)), height: `calc(${duration / (end - start) * 100}% - 2px)`, left: `calc(${lane / laneEnds.length * 100}% + 3px)`, width: `calc(${100 / laneEnds.length}% - 6px)` }}>
                  <span className="flex w-full min-w-0 shrink-0 items-center gap-1">
                    <strong className="min-w-0 flex-1 truncate">{patient?.name ?? "Paciente"}</strong>
                    <span className="hidden shrink-0 tabular-nums @[120px]:inline">{formatTime(apt.startAt!)}</span>
                  </span>
                  {duration >= 60 ? <span className="mt-0.5 block shrink-0 truncate">{apt.endAt ? `Ate ${formatTime(apt.endAt)} / ` : ""}{STATUS_FILTERS.find(status => status.key === apt.status)?.label ?? "Agendado"}</span> : null}
                </button>;
              });
            })}
            {appointmentDate === localToday && nowMinutes >= start && nowMinutes < end ? <div aria-label="Horario atual" className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-red-500" style={{ top: position(nowMinutes) }} /> : null}
          </div>;
        })}
      </div>
    </div>
  );
}

function AppointmentEditForm({
  appointment,
  doctors,
  appointmentTypes,
  onSaved,
  onCancel,
}: {
  appointment: AppointmentResponse;
  doctors: DoctorResponse[];
  appointmentTypes: AppointmentTypeResponse[];
  onSaved: (values: { doctorId?: string; startAt?: string; durationMinutes?: number; notes?: string; appointmentTypeId?: string; amount?: number }) => Promise<void>;
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
        ? toLocalDateTime(appointment.startAt)
        : new Date().toISOString().slice(0, 16),
      durationMinutes: appointment.endAt && appointment.startAt
        ? Math.round((new Date(appointment.endAt).getTime() - new Date(appointment.startAt).getTime()) / 60000)
        : 30,
      appointmentTypeId: appointment.appointmentTypeId ?? appointmentTypes[0]?.id ?? "",
      amount: appointment.amount ?? 0,
      notes: appointment.notes ?? "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFeedback(null);
    const patch: { doctorId?: string; startAt?: string; durationMinutes?: number; notes?: string; appointmentTypeId?: string; amount?: number } = {};
    if (values.doctorId !== appointment.doctorId) patch.doctorId = values.doctorId;
    if (values.appointmentTypeId && values.appointmentTypeId !== appointment.appointmentTypeId) patch.appointmentTypeId = values.appointmentTypeId;
    if (Number(values.amount) !== appointment.amount) patch.amount = Number(values.amount);
    if (values.notes !== (appointment.notes ?? "")) patch.notes = values.notes || undefined;

    const minutes = Number(values.durationMinutes);
    const originalMinutes = appointment.endAt && appointment.startAt
      ? Math.round((new Date(appointment.endAt).getTime() - new Date(appointment.startAt).getTime()) / 60000)
      : 30;
    if (minutes !== originalMinutes) patch.durationMinutes = minutes;

    const newStart = new Date(values.startAt).toISOString();
    if (new Date(newStart).getTime() !== new Date(appointment.startAt ?? 0).getTime()) {
      patch.startAt = newStart;
    }

    if (Object.keys(patch).length === 0) {
      onCancel();
      return;
    }
    try {
      await onSaved(patch);
    } catch (error) {
      setFeedback(apiErrorMessage(error, "Nao foi possivel atualizar a consulta agora."));
    }
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
      <Field error={errors.appointmentTypeId?.message} label="Tipo">
        <select className="input-field" {...register("appointmentTypeId")}>
          {appointmentTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
        </select>
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

function MonthGrid({ appointments, patientMap, doctorMap, monthDays, todayDate, isLoading, onDayClick }: {
  appointments: AppointmentResponse[];
  patientMap: Record<string, PatientResponse | undefined>;
  doctorMap: Record<string, DoctorResponse | undefined>;
  monthDays: string[];
  todayDate: string;
  isLoading: boolean;
  onDayClick: (day: string) => void;
}) {
  const byDay = useMemo(() => appointments.reduce<Record<string, AppointmentResponse[]>>((days, apt) => {
    const day = apt.startAt?.slice(0, 10) ?? "";
    (days[day] ??= []).push(apt);
    return days;
  }, {}), [appointments]);
  const offset = new Date(`${monthDays[0]}T12:00:00`).getDay();
  if (isLoading) return <AppointmentSkeleton />;
  return <div className="mt-5 grid grid-cols-7 gap-1 sm:gap-2" aria-label="Agenda mensal">
    {WEEKDAY_NAMES.map(day => <span className="py-2 text-center text-xs font-semibold text-[var(--muted)]" key={day}>{day}</span>)}
    {Array.from({ length: offset }, (_, index) => <span key={`empty-${index}`} />)}
    {monthDays.map(day => {
      const items = byDay[day] ?? [];
      return <button className={cn("flex min-w-0 flex-col items-stretch rounded-md border p-1.5 text-left min-h-20 sm:min-h-40 sm:p-2 transition-colors hover:border-[var(--brand)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-strong)]", day === todayDate ? "border-[var(--brand)] bg-[var(--brand-wash)]" : items.length ? "border-[var(--border-strong)] bg-[var(--surface)]" : "border-[var(--border)] bg-[var(--bg)]")} key={day} onClick={() => onDayClick(day)} type="button">
        <span className={cn("text-base font-bold", day === todayDate ? "text-[var(--brand-strong)]" : "text-[var(--ink)]")}>{Number(day.slice(-2))}</span>
        <span className={cn("mt-1 block text-xs", items.length ? "font-semibold text-[var(--ink)]" : "text-[var(--muted)]")}>{items.length ? `${items.length} consulta${items.length === 1 ? "" : "s"}` : "Livre"}</span>
        <span className="mt-2 hidden space-y-2 sm:block">
          {items.slice(0, 2).map(apt => <span className="block rounded-sm border-l-[3px] px-1.5 py-1 text-xs leading-4" key={apt.id} style={appointmentColorStyle(apt.status)} title={`${formatTime(apt.startAt ?? "")} - ${patientMap[apt.patientId ?? ""]?.name ?? "Paciente"} - ${doctorMap[apt.doctorId ?? ""]?.name ?? "Medico"}`}>
            <span className="block font-bold tabular-nums">{formatTime(apt.startAt ?? "")}</span>
            <span className="block truncate font-medium">{patientMap[apt.patientId ?? ""]?.name ?? "Paciente"}</span>
          </span>)}
          {items.length > 2 ? <span className="block text-xs font-semibold text-[var(--brand-strong)]">+{items.length - 2} mais</span> : null}
        </span>
      </button>;
    })}
  </div>;
}

function WeekGrid({
  appointments,
  patientMap,
  doctorMap,
  weekDays,
  todayDate,
  isLoading,
  onEdit,
  onConfirm,
  processingAppointmentId,
  onDayClick,
}: {
  appointments: AppointmentResponse[];
  patientMap: Record<string, PatientResponse | undefined>;
  doctorMap: Record<string, DoctorResponse | undefined>;
  weekDays: string[];
  todayDate: string;
  isLoading: boolean;
  onEdit: (appointment: AppointmentResponse) => void;
  onConfirm: (appointment: AppointmentResponse) => void;
  processingAppointmentId: string | null;
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
      <div className="mt-5 grid min-h-[560px] grid-cols-7 overflow-x-auto rounded-lg border border-[var(--border)]">
        {weekDays.map((_, i) => (
          <div key={i} className="min-w-[130px] border-r border-[var(--border)] p-2">
            <div className="skeleton h-14 rounded" />
            <div className="skeleton mt-3 h-20 rounded" />
            <div className="skeleton mt-2 h-16 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-5 grid min-h-[560px] grid-cols-7 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]" aria-label="Agenda semanal">
      {weekDays.map((day) => {
        const dateObj = new Date(day + "T12:00:00");
        const dayName = WEEKDAY_NAMES[dateObj.getDay()];
        const dayNum = dateObj.getDate();
        const month = MONTH_NAMES[dateObj.getMonth()];
        const isToday = day === todayDate;
        const apts = dayAppointments[day] ?? [];

        return (
          <div key={day} className={cn("min-w-[130px] border-r border-[var(--border)]", isToday && "bg-[var(--brand-wash)]/40")}>
            <button
              className={cn(
                "flex min-h-16 w-full flex-col items-center border-b border-[var(--border)] p-2 text-sm transition-colors",
                isToday
                  ? "text-[var(--brand)]"
                  : "bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--bg)]",
              )}
              onClick={() => onDayClick(day)}
              type="button"
            >
              <span className="text-[10px] uppercase tracking-wide font-semibold">{dayName}</span>
              <span className={cn("mt-0.5 grid size-8 place-items-center rounded-full text-lg font-semibold leading-tight", isToday && "bg-[var(--brand)] text-white")}>{dayNum}</span>
              <span className="text-[10px] uppercase">{month}</span>
            </button>
            <div className="flex flex-col gap-1.5 p-1.5">
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
                    style={appointmentColorStyle(apt.status)}
                    className={cn(
                      "rounded-md border bg-[var(--surface)] p-2 text-[11px] leading-tight transition-colors hover:bg-[var(--bg)]",
                      isCancelled ? "border-[var(--border)] opacity-60" : statusBorderClass(apt.status),
                    )}
                  >
                    <div className="font-semibold text-[var(--ink)]">
                      {formatTime(apt.startAt ?? "")}
                    </div>
                    <div className={cn("truncate", isCancelled ? "text-[var(--muted)]" : "text-[var(--ink)]")}>
                      {patient?.name ?? "—"}
                    </div>
                    <div className="truncate text-[var(--muted)]">
                      {doctorMap[apt.doctorId ?? ""]?.name ?? "Medico nao informado"}
                    </div>
                    <div className="flex items-center gap-1">
                      <StatusBadge variant={statusVariant} />
                      {apt.source && apt.source !== "Internal" && (
                        <span className="text-[9px] font-semibold text-[var(--brand)]">{apt.source}</span>
                      )}
                    </div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <button
                          aria-label={`Editar consulta de ${patient?.name ?? "paciente"}`}
                          className="min-h-11 text-[var(--brand)] underline"
                          onClick={() => onEdit(apt)}
                          type="button"
                        >
                          Editar
                        </button>
                        {apt.status === "Scheduled" ? (
                          <button
                            aria-label={`Confirmar consulta de ${patient?.name ?? "paciente"}`}
                            className="min-h-11 text-[var(--brand)] underline"
                            disabled={processingAppointmentId === apt.id}
                            onClick={() => onConfirm(apt)}
                            type="button"
                          >
                            Confirmar
                          </button>
                        ) : null}
                      </div>
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
