import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DefaultService } from "@/services/api";
import { Modal } from "@/components/ui/modal";
import { Field } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AppointmentResponse } from "@/generated";
import { apiErrorMessage } from "@/lib/api-error";
import { formatCurrency } from "@/lib/formatters";

const createSchema = z.object({
  chiefComplaint: z.string().optional(),
  history: z.string().optional(),
  physicalExam: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
});

const addendumSchema = z.object({
  content: z.string().min(1, "Informe o conteudo do addendum."),
});

type CreateFormValues = z.infer<typeof createSchema>;
type AddendumFormValues = z.infer<typeof addendumSchema>;

export function ClinicalRecordModal({
  appointment,
  canWrite,
  onClose,
}: {
  appointment: AppointmentResponse;
  canWrite: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const clinicalRecordQuery = useQuery({
    queryKey: ["clinical-record", appointment.id],
    queryFn: () => DefaultService.clinicalRecordGet(appointment.id!),
    enabled: !!appointment.id,
  });

  const addendumsQuery = useQuery({
    queryKey: ["clinical-record-addendums", appointment.id],
    queryFn: () => DefaultService.clinicalRecordListAddendums(appointment.id!),
    enabled: !!appointment.id && clinicalRecordQuery.data?.status === "Finalized",
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateFormValues) =>
      DefaultService.clinicalRecordCreate(appointment.id!, {
        chiefComplaint: values.chiefComplaint || undefined,
        history: values.history || undefined,
        physicalExam: values.physicalExam || undefined,
        assessment: values.assessment || undefined,
        plan: values.plan || undefined,
      }),
    onSuccess: async () => {
      setFeedback("Prontuario criado com sucesso.");
      setIsEditing(false);
      await queryClient.invalidateQueries({ queryKey: ["clinical-record", appointment.id] });
    },
    onError: (error) => setFeedback(apiErrorMessage(error, "Nao foi possivel criar o prontuario.")),
  });

  const updateMutation = useMutation({
    mutationFn: (values: CreateFormValues) =>
      DefaultService.clinicalRecordUpdate(appointment.id!, {
        chiefComplaint: values.chiefComplaint || undefined,
        history: values.history || undefined,
        physicalExam: values.physicalExam || undefined,
        assessment: values.assessment || undefined,
        plan: values.plan || undefined,
      }),
    onSuccess: async () => {
      setFeedback("Prontuario atualizado com sucesso.");
      setIsEditing(false);
      await queryClient.invalidateQueries({ queryKey: ["clinical-record", appointment.id] });
    },
    onError: (error) => setFeedback(apiErrorMessage(error, "Nao foi possivel atualizar o prontuario.")),
  });

  const finalizeMutation = useMutation({
    mutationFn: () => DefaultService.clinicalRecordFinalize(appointment.id!),
    onSuccess: async () => {
      setFeedback("Prontuario finalizado com sucesso.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["clinical-record", appointment.id] }),
        queryClient.invalidateQueries({ queryKey: ["clinical-record-addendums", appointment.id] }),
      ]);
    },
    onError: (error) => setFeedback(apiErrorMessage(error, "Nao foi possivel finalizar o prontuario.")),
  });

  const record = clinicalRecordQuery.data;
  const queryStatus = clinicalRecordQuery.error && typeof clinicalRecordQuery.error === "object" && "status" in clinicalRecordQuery.error
    ? clinicalRecordQuery.error.status
    : undefined;
  const isDraft = record?.status === "Draft";
  const isFinalized = record?.status === "Finalized";

  if (clinicalRecordQuery.isLoading) {
    return (
      <Modal title="Prontuario" onClose={onClose} size="lg">
        <div className="flex items-center justify-center py-12">
          <span className="spinner" />
        </div>
      </Modal>
    );
  }

  if (clinicalRecordQuery.isError && queryStatus !== 404) {
    return (
      <Modal title="Prontuario" onClose={onClose} size="lg">
        <div className="empty-state py-8">
          <p className="text-sm font-semibold">{apiErrorMessage(clinicalRecordQuery.error, "Nao foi possivel carregar o prontuario.")}</p>
        </div>
      </Modal>
    );
  }

  if (!record && !isEditing) {
    return (
      <Modal title="Prontuario" onClose={onClose} size="lg">
        <div className="empty-state py-8">
          <p className="text-sm font-semibold mb-4">Nenhum prontuario registrado para esta consulta.</p>
          {canWrite ? (
            <button className="btn btn-primary btn-sm" onClick={() => setIsEditing(true)} type="button">
              Criar prontuario
            </button>
          ) : null}
        </div>
      </Modal>
    );
  }

  if (isEditing || !record) {
    return (
      <Modal title={record ? "Editar prontuario" : "Novo prontuario"} onClose={onClose} size="lg">
        <ClinicalRecordForm
          defaultValues={record ? {
            chiefComplaint: record.chiefComplaint ?? "",
            history: record.history ?? "",
            physicalExam: record.physicalExam ?? "",
            assessment: record.assessment ?? "",
            plan: record.plan ?? "",
          } : undefined}
          isPending={createMutation.isPending || updateMutation.isPending}
          onSubmit={async (values) => {
            setFeedback(null);
            if (record) {
              await updateMutation.mutateAsync(values);
            } else {
              await createMutation.mutateAsync(values);
            }
          }}
          onCancel={() => { setIsEditing(false); setFeedback(null); }}
          feedback={feedback}
        />
      </Modal>
    );
  }

  return (
    <Modal title="Prontuario" onClose={onClose} size="lg">
      <div className="space-y-4">
        {feedback ? (
          <div className="rounded-md border border-[var(--border)] bg-[var(--brand-wash)] px-4 py-3 text-sm text-[var(--muted)]">
            {feedback}
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <StatusBadge variant={isDraft ? "scheduled" : "confirmed"} />
          <div className="toolbar-inline">
            {isDraft && canWrite ? (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => setIsEditing(true)} type="button">
                  Editar
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={finalizeMutation.isPending}
                  onClick={() => finalizeMutation.mutateAsync()}
                  type="button"
                >
                  {finalizeMutation.isPending ? <span className="spinner" /> : "Finalizar"}
                </button>
              </>
            ) : (
              <span className="text-xs text-[var(--muted)]">
                Finalizado em {record.finalizedAt ? new Date(record.finalizedAt).toLocaleString("pt-BR") : "-"}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {record.chiefComplaint ? (
            <ClinicalRecordField label="Queixa principal" value={record.chiefComplaint} />
          ) : null}
          {record.history ? (
            <ClinicalRecordField label="Historia" value={record.history} />
          ) : null}
          {record.physicalExam ? (
            <ClinicalRecordField label="Exame fisico" value={record.physicalExam} />
          ) : null}
          {record.assessment ? (
            <ClinicalRecordField label="Avaliacao" value={record.assessment} />
          ) : null}
          {record.plan ? (
            <ClinicalRecordField label="Plano" value={record.plan} />
          ) : null}
        </div>

        {isFinalized ? (
          <div className="border-t border-[var(--border)] pt-4 mt-4">
            <h4 className="text-sm font-semibold text-[var(--ink)] mb-3">Addendums</h4>
            <AddendumSection appointmentId={appointment.id!} addendums={addendumsQuery.data ?? []} canWrite={canWrite} />
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function ClinicalRecordField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-1">{label}</p>
      <p className="text-sm text-[var(--ink)] whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function ClinicalRecordForm({
  defaultValues,
  isPending,
  onSubmit,
  onCancel,
  feedback,
}: {
  defaultValues?: { chiefComplaint?: string; history?: string; physicalExam?: string; assessment?: string; plan?: string };
  isPending: boolean;
  onSubmit: (values: CreateFormValues) => Promise<void>;
  onCancel: () => void;
  feedback: string | null;
}) {
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: defaultValues ?? { chiefComplaint: "", history: "", physicalExam: "", assessment: "", plan: "" },
  });
  const productsQuery = useQuery({ queryKey: ["products"], queryFn: () => DefaultService.productsList(1, 100) });
  const packagesQuery = useQuery({ queryKey: ["packages"], queryFn: () => DefaultService.packagesList(1, 100) });
  const offers = [
    ...(productsQuery.data?.items ?? []).filter(item => item.isActive).map(item => ({ id: `product-${item.id}`, label: item.name ?? "Produto", detail: `${item.applicationCount ?? 1} aplicacao(oes)`, price: item.price ?? 0 })),
    ...(packagesQuery.data?.items ?? []).filter(item => item.isActive).map(item => ({ id: `package-${item.id}`, label: item.name ?? "Pacote", detail: `${item.items?.length ?? 0} produto(s)`, price: item.price ?? 0 })),
  ];
  const addOfferToPlan = (label: string, price: number) => {
    const current = getValues("plan")?.trim();
    setValue("plan", [current, `Oferta: ${label} - ${formatCurrency(price)}`].filter(Boolean).join("\n"), { shouldDirty: true });
  };

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
      <Field error={errors.chiefComplaint?.message} label="Queixa principal">
        <textarea className="input-field min-h-20" {...register("chiefComplaint")} />
      </Field>
      <Field error={errors.history?.message} label="Historia">
        <textarea className="input-field min-h-20" {...register("history")} />
      </Field>
      <Field error={errors.physicalExam?.message} label="Exame fisico">
        <textarea className="input-field min-h-20" {...register("physicalExam")} />
      </Field>
      <Field error={errors.assessment?.message} label="Avaliacao">
        <textarea className="input-field min-h-20" {...register("assessment")} />
      </Field>
      <Field className="md:col-span-2" error={errors.plan?.message} label="Plano">
        <textarea className="input-field min-h-20" {...register("plan")} />
      </Field>
      <fieldset className="md:col-span-2 rounded-md border border-[var(--border)] p-4">
        <legend className="px-1 text-sm font-semibold">Ofertas de produtos e pacotes</legend>
        <p className="mb-3 text-xs text-[var(--muted)]">Adicione uma opcao ao plano apresentado ao paciente.</p>
        {productsQuery.isLoading || packagesQuery.isLoading ? <span className="spinner" /> : offers.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {offers.map(offer => <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] p-3" key={offer.id}>
              <div><p className="text-sm font-semibold">{offer.label}</p><p className="text-xs text-[var(--muted)]">{offer.detail} · {formatCurrency(offer.price)}</p></div>
              <button className="btn btn-brand-outline btn-sm" onClick={() => addOfferToPlan(offer.label, offer.price)} type="button">Ofertar</button>
            </div>)}
          </div>
        ) : <p className="text-sm text-[var(--muted)]">Nenhuma oferta ativa cadastrada.</p>}
      </fieldset>
      {feedback ? (
        <p className="md:col-span-2 text-sm text-[var(--muted)]">{feedback}</p>
      ) : null}
      <div className="md:col-span-2 flex justify-end gap-3">
        <button className="btn btn-ghost btn-sm" onClick={onCancel} type="button">Cancelar</button>
        <button className="btn btn-primary" disabled={isPending} type="submit">
          {isPending ? <span className="spinner" /> : "Salvar"}
        </button>
      </div>
    </form>
  );
}

function AddendumSection({
  appointmentId,
  addendums,
  canWrite,
}: {
  appointmentId: string;
  addendums: { id?: string; content?: string; authorId?: string; authorName?: string | null; createdAt?: string }[];
  canWrite: boolean;
}) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddendumFormValues>({
    resolver: zodResolver(addendumSchema),
    defaultValues: { content: "" },
  });

  const addAddendum = useMutation({
    mutationFn: (values: AddendumFormValues) =>
      DefaultService.clinicalRecordAddAddendum(appointmentId, values),
    onSuccess: async () => {
      setFeedback("Addendum registrado.");
      setShowAddForm(false);
      reset({ content: "" });
      await queryClient.invalidateQueries({ queryKey: ["clinical-record-addendums", appointmentId] });
    },
    onError: (error) => setFeedback(apiErrorMessage(error, "Nao foi possivel adicionar addendum.")),
  });

  return (
    <div className="space-y-3">
      {feedback ? (
        <div className="rounded-md border border-[var(--border)] bg-[var(--brand-wash)] px-4 py-3 text-sm text-[var(--muted)]">
          {feedback}
        </div>
      ) : null}

      {addendums.map((a) => (
        <div key={a.id} className="rounded-md border border-[var(--border)] p-3">
          <p className="text-sm text-[var(--ink)] whitespace-pre-wrap">{a.content}</p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            {a.authorName ?? "Autor"} · {a.createdAt ? new Date(a.createdAt).toLocaleString("pt-BR") : "-"}
          </p>
        </div>
      ))}

      {canWrite && showAddForm ? (
        <form className="grid gap-3" onSubmit={handleSubmit((values) => { setFeedback(null); addAddendum.mutateAsync(values); })}>
          <Field error={errors.content?.message} label="Addendum">
            <textarea className="input-field min-h-20" {...register("content")} />
          </Field>
          <div className="flex justify-end gap-3">
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowAddForm(false); setFeedback(null); }} type="button">Cancelar</button>
            <button className="btn btn-primary btn-sm" disabled={addAddendum.isPending} type="submit">
              {addAddendum.isPending ? <span className="spinner" /> : "Adicionar"}
            </button>
          </div>
        </form>
      ) : canWrite ? (
        <button className="btn btn-ghost btn-sm" onClick={() => setShowAddForm(true)} type="button">
          + Adicionar addendum
        </button>
      ) : null}
    </div>
  );
}
