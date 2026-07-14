import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DefaultService, specialtiesList } from "@/services/api";
import type { DoctorResponse } from "@/generated";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/modal";
import { applyPhoneMask } from "@/lib/formatters";

const createDoctorSchema = z.object({
  name: z.string().min(3, "Informe o nome do medico."),
  crm: z.string().min(3, "Informe o CRM."),
  phone: z.string().optional(),
  email: z.union([z.string().email("Informe um email valido."), z.literal("")]),
});

const updateDoctorSchema = z.object({
  name: z.string().min(3, "Informe o nome do medico."),
  phone: z.string().optional(),
  email: z.union([z.string().email("Informe um email valido."), z.literal("")]),
  isActive: z.boolean(),
});

type CreateDoctorValues = z.infer<typeof createDoctorSchema>;
type UpdateDoctorValues = z.infer<typeof updateDoctorSchema>;

export function DoctorRoster({
  doctors,
  search,
  page,
  pageSize,
  total,
  isLoading,
  onSearchChange,
  onPageChange,
}: {
  doctors: DoctorResponse[];
  search: string;
  page: number;
  pageSize: number;
  total: number;
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<DoctorResponse | null>(null);
  const [deletingDoctorId, setDeletingDoctorId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const totalPages = Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));

  const allSpecialtiesQuery = useQuery({
    queryKey: ["all-specialties"],
    queryFn: async () => { const r = await specialtiesList(1, 1000); return r.items ?? []; },
    placeholderData: [],
  });
  const allSpecialties = allSpecialtiesQuery.data ?? [];

  const form = useForm<CreateDoctorValues>({
    resolver: zodResolver(createDoctorSchema),
    defaultValues: { name: "", crm: "", phone: "", email: "" },
  });
  const [createSpecialtyIds, setCreateSpecialtyIds] = useState<string[]>([]);

  const createDoctor = useMutation({
    mutationFn: async (values: CreateDoctorValues) =>
      DefaultService.doctorsCreate({
        name: values.name,
        crm: values.crm,
        phone: values.phone || undefined,
        email: values.email || undefined,
        specialtyIds: createSpecialtyIds.length > 0 ? createSpecialtyIds : undefined,
      }),
    onSuccess: async () => {
      setFeedback("Medico cadastrado com sucesso.");
      form.reset();
      setCreateSpecialtyIds([]);
      setIsCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["doctors"] });
    },
    onError: () => {
      setFeedback("Nao foi possivel cadastrar o medico agora.");
    },
  });

  const onCreate = form.handleSubmit(async (values) => {
    setFeedback(null);
    await createDoctor.mutateAsync(values);
  });

  const deleteDoctor = useMutation({
    mutationFn: async (doctorId: string) => {
      setDeletingDoctorId(doctorId);
      await DefaultService.doctorsDelete(doctorId);
    },
    onSuccess: async () => {
      setFeedback("Medico excluido com sucesso.");
      await queryClient.invalidateQueries({ queryKey: ["doctors"] });
    },
    onError: () => {
      setFeedback("Nao foi possivel excluir o medico agora.");
    },
    onSettled: () => {
      setDeletingDoctorId(null);
    },
  });

  return (
    <>
      {isCreateOpen ? (
        <Modal title="Novo medico" onClose={() => setIsCreateOpen(false)}>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onCreate}>
            <Field error={form.formState.errors.name?.message} label="Nome">
              <input className="input-field" {...form.register("name")} />
            </Field>
            <Field error={form.formState.errors.crm?.message} label="CRM">
              <input className="input-field" {...form.register("crm")} />
            </Field>
            <Field error={form.formState.errors.phone?.message} label="Telefone">
              <input className="input-field" placeholder="(11) 98888-0000" {...form.register("phone", { setValueAs: (v: string) => v?.replace(/\D/g, "") })} onInput={(e) => { e.currentTarget.value = applyPhoneMask(e.currentTarget.value); }} />
            </Field>
            <Field className="md:col-span-2" error={form.formState.errors.email?.message} label="Email">
              <input className="input-field" {...form.register("email")} />
            </Field>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold">Especialidades</label>
              <div className="flex flex-wrap gap-2">
                {allSpecialties.length === 0 && <p className="text-sm text-(--muted)">Nenhuma especialidade cadastrada. Crie em Configuracoes.</p>}
                {allSpecialties.map((s: any) => (
                  <label key={s.id} className="flex items-center gap-1.5 text-sm cursor-pointer rounded border border-(--border) px-2.5 py-1.5 hover:bg-(--surface)">
                    <input type="checkbox" checked={createSpecialtyIds.includes(s.id)} onChange={() => setCreateSpecialtyIds((prev) => prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id])} />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="md:col-span-2 flex justify-end gap-3">
              <button className="btn btn-ghost btn-sm" onClick={() => setIsCreateOpen(false)} type="button">Cancelar</button>
              <button className="btn btn-primary" disabled={createDoctor.isPending} type="submit">
                {createDoctor.isPending ? "Salvando..." : "Salvar medico"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {editingDoctor ? (
        <Modal title="Editar medico" onClose={() => setEditingDoctor(null)}>
          <DoctorEditForm
            doctor={editingDoctor}
            allSpecialties={allSpecialties}
            onSaved={async (message) => {
              setFeedback(message);
              setEditingDoctor(null);
              await queryClient.invalidateQueries({ queryKey: ["doctors"] });
            }}
            onCancel={() => setEditingDoctor(null)}
          />
        </Modal>
      ) : null}

      <section className="panel rounded-lg p-5 md:p-6">
        <div className="section-heading">
          <div>
            <h3 className="text-base font-semibold text-[var(--ink)]">Medicos</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {total} medico{total === 1 ? "" : "s"} encontrado{total === 1 ? "" : "s"}
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => { setFeedback(null); setIsCreateOpen(true); }} type="button">
            Novo medico
          </button>
        </div>

        {feedback ? (
          <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--brand-wash)] px-4 py-3 text-sm text-[var(--muted)]">{feedback}</div>
        ) : null}

        <div className="toolbar mt-4">
          <div className="toolbar-stack gap-3">
            <div className="toolbar-inline flex-wrap gap-3">
              <label className="min-w-0 flex-1">
                <span className="mb-2 block text-sm font-semibold">Busca</span>
                <input className="input-field" onChange={(event) => onSearchChange(event.target.value)} placeholder="Buscar por nome, CRM ou especialidade" value={search} />
              </label>
            </div>
          </div>
        </div>

        <div className="stack-list mt-5">
          {isLoading ? (
            <DoctorSkeleton />
          ) : doctors.length === 0 ? (
            <div className="empty-state">
              <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <p className="text-sm font-semibold">Nenhum medico encontrado.</p>
            </div>
          ) : (
            doctors.map((doctor) => (
              <article key={doctor.id ?? doctor.crm ?? doctor.name} className="data-card">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-[var(--ink)]">{doctor.name ?? "Medico"}</h4>
                    <div className="meta-row mt-1">
                      {(doctor.specialties ?? []).length > 0
                        ? doctor.specialties!.map((s) => <span key={s.id} className="meta-chip">{s.name}</span>)
                        : <span className="text-sm text-[var(--muted)]">Sem especialidade</span>}
                      {doctor.crm ? <span>{doctor.crm}</span> : null}
                    </div>
                    <div className="meta-row mt-1">
                      {doctor.email ? <span>{doctor.email}</span> : null}
                      {doctor.phone ? <span>{applyPhoneMask(doctor.phone)}</span> : null}
                    </div>
                  </div>
                  <div className="toolbar-inline">
                    <StatusBadge label={doctor.isActive ? "Ativo" : "Inativo"} variant={doctor.isActive ? "active" : "inactive"} />
                    {doctor.id ? (
                      <>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingDoctor(doctor)} type="button">Editar</button>
                        <button className="btn btn-danger btn-sm" disabled={deletingDoctorId === doctor.id} onClick={() => { if (window.confirm(`Excluir medico ${doctor.name}?`)) { setFeedback(null); void deleteDoctor.mutateAsync(doctor.id ?? ""); } }} type="button">
                          {deletingDoctorId === doctor.id ? "Excluindo..." : "Excluir"}
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="toolbar-inline mt-5 justify-between">
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} type="button">Anterior</button>
          <span className="text-sm font-medium text-[var(--muted)]">{page} / {totalPages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} type="button">Proxima</button>
        </div>
      </section>
    </>
  );
}

function DoctorEditForm({
  doctor,
  allSpecialties,
  onSaved,
  onCancel,
}: {
  doctor: DoctorResponse;
  allSpecialties: any[];
  onSaved: (message: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [specialtyIds, setSpecialtyIds] = useState<string[]>(
    () => (doctor.specialties ?? []).map((s) => s.id).filter(Boolean) as string[],
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateDoctorValues>({
    resolver: zodResolver(updateDoctorSchema),
    defaultValues: {
      name: doctor.name ?? "",
      phone: doctor.phone ?? "",
      email: doctor.email ?? "",
      isActive: doctor.isActive ?? true,
    },
  });

  const updateDoctor = useMutation({
    mutationFn: async (values: UpdateDoctorValues) =>
      DefaultService.doctorsUpdate(doctor.id ?? "", {
        name: values.name,
        phone: values.phone || undefined,
        email: values.email || undefined,
        isActive: values.isActive,
        specialtyIds: specialtyIds.length > 0 ? specialtyIds : undefined,
      }),
    onSuccess: async (updatedDoctor) => {
      setFeedback("Medico atualizado com sucesso.");
      await onSaved(`${updatedDoctor.name ?? doctor.name ?? "Medico"} atualizado com sucesso.`);
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
    <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
      <Field error={errors.name?.message} label="Nome">
        <input className="input-field" {...register("name")} />
      </Field>
      <Field error={errors.phone?.message} label="Telefone">
        <input className="input-field" placeholder="(11) 98888-0000" {...register("phone", { setValueAs: (v: string) => v?.replace(/\D/g, "") })} onInput={(e) => { e.currentTarget.value = applyPhoneMask(e.currentTarget.value); }} />
      </Field>
      <Field className="md:col-span-2" error={errors.email?.message} label="Email">
        <input className="input-field" {...register("email")} />
      </Field>
      <div className="md:col-span-2">
        <label className="mb-2 block text-sm font-semibold">Especialidades</label>
        <div className="flex flex-wrap gap-2">
          {allSpecialties.length === 0 && <p className="text-sm text-(--muted)">Nenhuma especialidade cadastrada.</p>}
          {allSpecialties.map((s: any) => (
            <label key={s.id} className="flex items-center gap-1.5 text-sm cursor-pointer rounded border border-(--border) px-2.5 py-1.5 hover:bg-(--surface)">
              <input type="checkbox" checked={specialtyIds.includes(s.id)} onChange={() => setSpecialtyIds((prev) => prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id])} />
              {s.name}
            </label>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-sm font-semibold md:col-span-2">
        <input className="h-4 w-4 accent-[var(--brand)]" type="checkbox" {...register("isActive")} />
        Medico disponivel para a agenda
      </label>
      {feedback ? <p className="md:col-span-2 text-sm text-[var(--muted)]">{feedback}</p> : null}
      <div className="md:col-span-2 flex justify-end gap-3">
        <button className="btn btn-ghost btn-sm" onClick={onCancel} type="button">Cancelar</button>
        <button className="btn btn-primary" disabled={updateDoctor.isPending} type="submit">
          {updateDoctor.isPending ? "Salvando..." : "Salvar alteracoes"}
        </button>
      </div>
    </form>
  );
}

function DoctorSkeleton() {
  return (
    <div className="stack-list" aria-busy aria-label="Carregando medicos">
      {[1, 2, 3].map((index) => (
        <div key={index} className="data-card">
          <div className="skeleton h-5 w-40 rounded-full" />
          <div className="skeleton mt-3 h-4 w-64 rounded-full" />
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
