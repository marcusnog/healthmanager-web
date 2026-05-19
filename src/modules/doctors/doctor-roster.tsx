import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DefaultService } from "@/services/api";
import type { DoctorResponse } from "@/generated";
import { StatusBadge } from "@/components/ui/status-badge";

const createDoctorSchema = z.object({
  name: z.string().min(3, "Informe o nome do medico."),
  specialty: z.string().min(3, "Informe a especialidade."),
  crm: z.string().min(3, "Informe o CRM."),
  phone: z.string().optional(),
  email: z.union([z.string().email("Informe um email valido."), z.literal("")]),
});

const updateDoctorSchema = z.object({
  name: z.string().min(3, "Informe o nome do medico."),
  specialty: z.string().min(3, "Informe a especialidade."),
  phone: z.string().optional(),
  email: z.union([z.string().email("Informe um email valido."), z.literal("")]),
  isActive: z.boolean(),
});

type CreateDoctorValues = z.infer<typeof createDoctorSchema>;
type UpdateDoctorValues = z.infer<typeof updateDoctorSchema>;

export function DoctorRoster({ doctors }: { doctors: DoctorResponse[] }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateDoctorValues>({
    resolver: zodResolver(createDoctorSchema),
    defaultValues: { name: "", specialty: "", crm: "", phone: "", email: "" },
  });

  const createDoctor = useMutation({
    mutationFn: async (values: CreateDoctorValues) =>
      DefaultService.doctorsCreate({
        name: values.name,
        specialty: values.specialty,
        crm: values.crm,
        phone: values.phone || undefined,
        email: values.email || undefined,
      }),
    onSuccess: async () => {
      setFeedback("Medico cadastrado com sucesso.");
      reset();
      setIsCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["doctors"] });
    },
    onError: () => {
      setFeedback("Nao foi possivel cadastrar o medico agora.");
    },
  });

  const onCreate = handleSubmit(async (values) => {
    setFeedback(null);
    await createDoctor.mutateAsync(values);
  });

  return (
    <section className="panel rounded-lg p-5 md:p-6">
      <div className="section-heading">
        <div>
          <h3 className="text-base font-semibold text-[var(--ink)]">Medicos</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {doctors.length} medico{doctors.length === 1 ? "" : "s"} cadastrado{doctors.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            setFeedback(null);
            setIsCreateOpen((value) => !value);
          }}
          type="button"
        >
          {isCreateOpen ? "Cancelar" : "Novo medico"}
        </button>
      </div>

      {feedback ? (
        <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--brand-wash)] px-4 py-3 text-sm text-[var(--muted)]">
          {feedback}
        </div>
      ) : null}

      {isCreateOpen ? (
        <form
          className="section-card mt-5 grid gap-5 p-5 md:grid-cols-2 md:p-6"
          onSubmit={onCreate}
        >
          <Field error={errors.name?.message} label="Nome">
            <input className="input-field" {...register("name")} />
          </Field>
          <Field error={errors.specialty?.message} label="Especialidade">
            <input className="input-field" {...register("specialty")} />
          </Field>
          <Field error={errors.crm?.message} label="CRM">
            <input className="input-field" {...register("crm")} />
          </Field>
          <Field error={errors.phone?.message} label="Telefone">
            <input className="input-field" {...register("phone")} />
          </Field>
          <Field className="md:col-span-2" error={errors.email?.message} label="Email">
            <input className="input-field" {...register("email")} />
          </Field>
          <div className="md:col-span-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <span className="text-sm text-[var(--muted)]">
              O cadastro do medico alimenta agenda, especialidade e regras de
              disponibilidade do tenant.
            </span>
            <button
              className="btn btn-primary"
              disabled={createDoctor.isPending}
              type="submit"
            >
              {createDoctor.isPending ? "Salvando..." : "Salvar medico"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="stack-list mt-5">
        {doctors.length === 0 ? (
          <div className="empty-state">
            <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <p className="text-sm font-semibold">Nenhum medico cadastrado ainda.</p>
          </div>
        ) : null}
        {doctors.map((doctor) => (
          <article
            key={doctor.id ?? doctor.crm ?? doctor.name}
            className="data-card"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-[var(--ink)]">
                  {doctor.name ?? "Medico"}
                </h4>
                <div className="meta-row mt-1">
                  {doctor.specialty ? <span>{doctor.specialty}</span> : null}
                  {doctor.crm ? <span>{doctor.crm}</span> : null}
                </div>
                <div className="meta-row mt-1">
                  {doctor.email ? <span>{doctor.email}</span> : null}
                  {doctor.phone ? <span>{doctor.phone}</span> : null}
                </div>
              </div>
              <div className="toolbar-inline">
                <StatusBadge
                  label={doctor.isActive ? "Ativo" : "Inativo"}
                  variant={doctor.isActive ? "active" : "inactive"}
                />
                {doctor.id ? (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() =>
                      setEditingDoctorId((value) =>
                        value === doctor.id ? null : (doctor.id ?? null),
                      )
                    }
                    type="button"
                  >
                    {editingDoctorId === doctor.id ? "Fechar" : "Editar medico"}
                  </button>
                ) : null}
              </div>
            </div>

            {editingDoctorId === doctor.id && doctor.id ? (
              <DoctorEditPanel
                doctor={doctor}
                onSaved={async (message) => {
                  setFeedback(message);
                  setEditingDoctorId(null);
                  await queryClient.invalidateQueries({ queryKey: ["doctors"] });
                }}
              />
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function DoctorEditPanel({
  doctor,
  onSaved,
}: {
  doctor: DoctorResponse;
  onSaved: (message: string) => Promise<void>;
}) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateDoctorValues>({
    resolver: zodResolver(updateDoctorSchema),
    defaultValues: {
      name: doctor.name ?? "",
      specialty: doctor.specialty ?? "",
      phone: doctor.phone ?? "",
      email: doctor.email ?? "",
      isActive: doctor.isActive ?? true,
    },
  });

  const updateDoctor = useMutation({
    mutationFn: async (values: UpdateDoctorValues) =>
      DefaultService.doctorsUpdate(doctor.id ?? "", {
        name: values.name,
        specialty: values.specialty,
        phone: values.phone || undefined,
        email: values.email || undefined,
        isActive: values.isActive,
      }),
    onSuccess: async (updatedDoctor) => {
      setFeedback("Medico atualizado com sucesso.");
      await onSaved(
        `${updatedDoctor.name ?? doctor.name ?? "Medico"} atualizado com sucesso.`,
      );
    },
    onError: () => {
      setFeedback("Nao foi possivel atualizar o medico agora.");
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFeedback(null);
    await updateDoctor.mutateAsync(values);
  });

  return (
    <form
      className="section-card mt-4 grid gap-4 p-5 md:grid-cols-2"
      onSubmit={onSubmit}
    >
      <Field error={errors.name?.message} label="Nome">
        <input className="input-field" {...register("name")} />
      </Field>
      <Field error={errors.specialty?.message} label="Especialidade">
        <input className="input-field" {...register("specialty")} />
      </Field>
      <Field error={errors.phone?.message} label="Telefone">
        <input className="input-field" {...register("phone")} />
      </Field>
      <Field error={errors.email?.message} label="Email">
        <input className="input-field" {...register("email")} />
      </Field>
      <label className="flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-sm font-semibold md:col-span-2">
        <input
          className="h-4 w-4 accent-[var(--brand)]"
          type="checkbox"
          {...register("isActive")}
        />
        Medico disponivel para a agenda
      </label>
      <div className="md:col-span-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <span className="text-sm text-[var(--muted)]">
          {feedback ??
            "A disponibilidade do medico impacta diretamente os fluxos de agenda e confirmacao."}
        </span>
        <button
          className="btn btn-primary"
          disabled={updateDoctor.isPending}
          type="submit"
        >
          {updateDoctor.isPending ? "Salvando..." : "Salvar alteracoes"}
        </button>
      </div>
    </form>
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
