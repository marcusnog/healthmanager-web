import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DefaultService, healthInsurancesList } from "@/services/api";
import type { PatientDocumentResponse, PatientResponse } from "@/generated";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { formatFileSize, triggerBrowserDownload, applyCpfMask, applyPhoneMask } from "@/lib/formatters";
import { cn } from "@/lib/cn";

function isValidCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  const calc = (factor: number) => {
    let sum = 0;
    for (let i = 0; i < factor - 1; i++) sum += parseInt(digits[i]) * (factor - i);
    const rem = (sum * 10) % 11;
    return rem === 10 ? 0 : rem;
  };
  return calc(10) === parseInt(digits[9]) && calc(11) === parseInt(digits[10]);
}

const schema = z.object({
  name: z.string().min(3, "Informe o nome do paciente."),
  cpf: z.string().refine((v) => isValidCpf(v), { message: "CPF invalido." }),
  phone: z.string().min(10, "Informe um telefone valido."),
  email: z.union([z.string().email("Informe um email valido."), z.literal("")]),
  birthDate: z.string().optional(),
  healthInsuranceId: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const documentSchema = z.object({
  file: z.instanceof(File, { message: "Selecione um arquivo valido." }),
});

const patientUpdateSchema = z.object({
  name: z.string().min(3, "Informe o nome do paciente."),
  phone: z.string().min(10, "Informe um telefone valido."),
  email: z.union([z.string().email("Informe um email valido."), z.literal("")]),
  healthInsuranceId: z.string().optional(),
  notes: z.string().optional(),
});

type DocumentFormValues = z.infer<typeof documentSchema>;
type PatientUpdateValues = z.infer<typeof patientUpdateSchema>;

export function PatientList({
  patients,
  page,
  pageSize,
  total,
  search,
  sortBy,
  sortDirection,
  email,
  healthInsurance,
  isLoading,
  onSearchChange,
  onSortByChange,
  onSortDirectionChange,
  onEmailChange,
  onHealthInsuranceChange,
  onPageChange,
}: {
  patients: PatientResponse[];
  page: number;
  pageSize: number;
  total: number;
  search: string;
  sortBy: string;
  sortDirection: string;
  email: string;
  healthInsurance: string;
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  onSortByChange: (value: string) => void;
  onSortDirectionChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onHealthInsuranceChange: (value: string) => void;
  onPageChange: (page: number) => void;
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientResponse | null>(null);
  const [activePatient, setActivePatient] = useState<PatientResponse | null>(null);
  const [deletingPatientId, setDeletingPatientId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const totalPages = Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      cpf: "",
      phone: "",
      email: "",
      birthDate: "",
      healthInsuranceId: "",
      notes: "",
    },
  });

  const healthInsQuery = useQuery({
    queryKey: ["health-insurances-catalog"],
    queryFn: async () => { const r = await healthInsurancesList(1, 200); return r.items ?? []; },
    placeholderData: [],
  });
  const healthPlans = healthInsQuery.data ?? [];

  const createPatient = useMutation({
    mutationFn: async (values: FormValues) =>
      DefaultService.patientsCreate({
        name: values.name,
        cpf: values.cpf.replace(/\D/g, ""),
        phone: values.phone.replace(/\D/g, ""),
        email: values.email || undefined,
        birthDate: values.birthDate || undefined,
        healthInsuranceId: values.healthInsuranceId || undefined,
        notes: values.notes || undefined,
      }),
    onSuccess: async () => {
      setFeedback("Paciente criado com sucesso.");
      reset();
      setIsFormOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["patients-list"] }),
        queryClient.invalidateQueries({ queryKey: ["patients-catalog"] }),
      ]);
    },
    onError: () => {
      setFeedback("Nao foi possivel criar o paciente agora.");
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFeedback(null);
    await createPatient.mutateAsync(values);
  });

  const deletePatient = useMutation({
    mutationFn: async (patientId: string) => {
      setDeletingPatientId(patientId);
      await DefaultService.patientsDelete(patientId);
    },
    onSuccess: async () => {
      setFeedback("Paciente excluido com sucesso.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["patients-list"] }),
        queryClient.invalidateQueries({ queryKey: ["patients-catalog"] }),
      ]);
    },
    onError: () => {
      setFeedback("Nao foi possivel excluir o paciente agora.");
    },
    onSettled: () => {
      setDeletingPatientId(null);
    },
  });

  return (
    <>
      {isFormOpen ? (
        <Modal title="Novo paciente" onClose={() => setIsFormOpen(false)}>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            <Field error={errors.name?.message} label="Nome">
              <input className="input-field" {...register("name")} />
            </Field>
            <Field error={errors.cpf?.message} label="CPF">
              <input className="input-field" placeholder="000.000.000-00" {...register("cpf", { setValueAs: (v: string) => v.replace(/\D/g, "") })} onInput={(e) => { e.currentTarget.value = applyCpfMask(e.currentTarget.value); }} />
            </Field>
            <Field error={errors.phone?.message} label="Telefone">
              <input className="input-field" placeholder="(11) 98888-0000" {...register("phone", { setValueAs: (v: string) => v.replace(/\D/g, "") })} onInput={(e) => { e.currentTarget.value = applyPhoneMask(e.currentTarget.value); }} />
            </Field>
            <Field error={errors.birthDate?.message} label="Data de nascimento">
              <input className="input-field" type="date" {...register("birthDate")} />
            </Field>
            <Field error={errors.email?.message} label="Email">
              <input className="input-field" {...register("email")} />
            </Field>
            <Field error={errors.healthInsuranceId?.message} label="Convenio">
              <select className="input-field" {...register("healthInsuranceId")}>
                <option value="">Sem convenio</option>
                {healthPlans.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field
              className="md:col-span-2"
              error={errors.notes?.message}
              label="Observacoes"
            >
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
                disabled={createPatient.isPending}
                type="submit"
              >
                {createPatient.isPending ? "Salvando..." : "Salvar paciente"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {editingPatient ? (
        <Modal title="Editar paciente" onClose={() => setEditingPatient(null)}>
          <PatientEditForm
            patient={editingPatient}
            onSaved={async (message) => {
              setFeedback(message);
              setEditingPatient(null);
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["patients-list"] }),
                queryClient.invalidateQueries({ queryKey: ["patients-catalog"] }),
              ]);
            }}
            onCancel={() => setEditingPatient(null)}
          />
        </Modal>
      ) : null}

      {activePatient ? (
        <Modal
          title={`Documentos — ${activePatient.name ?? "Paciente"}`}
          onClose={() => setActivePatient(null)}
          size="lg"
        >
          <PatientDocumentsPanel
            patientAccessToken={activePatient.patientAccessToken ?? ""}
            patientId={activePatient.id ?? ""}
            patientName={activePatient.name ?? "Paciente"}
          />
        </Modal>
      ) : null}

      <section className="panel rounded-lg p-5 md:p-6">
        <div className="section-heading">
          <div>
            <h3 className="text-base font-semibold text-[var(--ink)]">Pacientes</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {total} paciente{total === 1 ? "" : "s"} encontrado{total === 1 ? "" : "s"}
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
            Novo paciente
          </button>
        </div>

        {feedback ? (
          <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--brand-wash)] px-4 py-3 text-sm text-[var(--muted)]">
            {feedback}
          </div>
        ) : null}

        <div className="toolbar mt-4">
          <div className="toolbar-stack gap-3">
            <div className="toolbar-inline flex-wrap gap-3">
              <label className="min-w-0 flex-1">
                <span className="mb-2 block text-sm font-semibold">Busca rapida</span>
                <input
                  className="input-field"
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="Buscar por nome, CPF ou telefone"
                  value={search}
                />
              </label>
              <label className="min-w-0 flex-1">
                <span className="mb-2 block text-sm font-semibold">E-mail</span>
                <input
                  className="input-field"
                  onChange={(event) => onEmailChange(event.target.value)}
                  placeholder="Filtrar por e-mail"
                  value={email}
                />
              </label>
              <label className="min-w-0 flex-1">
                <span className="mb-2 block text-sm font-semibold">Convenio</span>
                <input
                  className="input-field"
                  onChange={(event) => onHealthInsuranceChange(event.target.value)}
                  placeholder="Filtrar por convenio"
                  value={healthInsurance}
                />
              </label>
            </div>
            <div className="toolbar-inline flex-wrap">
              <label className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[var(--muted)]">Ordenar por</span>
                <select
                  className="input-field w-auto"
                  value={sortBy}
                  onChange={(e) => onSortByChange(e.target.value)}
                >
                  <option value="name">Nome</option>
                  <option value="cpf">CPF</option>
                  <option value="phone">Telefone</option>
                  <option value="email">E-mail</option>
                  <option value="healthInsurance">Convenio</option>
                  <option value="createdAt">Data de cadastro</option>
                </select>
              </label>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => onSortDirectionChange(sortDirection === "desc" ? "asc" : "desc")}
                type="button"
                title={sortDirection === "desc" ? "Decrescente" : "Crescente"}
              >
                {sortDirection === "desc" ? "↓" : "↑"}
              </button>
            </div>
            <div className="toolbar-inline flex-wrap">
              <button
                className="btn btn-ghost btn-sm"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                type="button"
              >
                Anterior
              </button>
              <span className="text-sm font-medium text-[var(--muted)]">
                {page} / {totalPages}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                type="button"
              >
                Proxima
              </button>
            </div>
          </div>
        </div>

        <div className="stack-list mt-5">
          {isLoading ? (
            <PatientSkeleton />
          ) : patients.length ? (
            patients.map((patient) => (
              <article
                className="data-card"
                key={patient.id ?? patient.cpf ?? patient.name}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <h4 className="text-xl font-semibold">
                      {patient.name ?? "Paciente"}
                    </h4>
                    <div className="meta-row mt-2">
                      <span>CPF {patient.cpf ? applyCpfMask(patient.cpf) : "Nao informado"}</span>
                      <span>{patient.phone ? applyPhoneMask(patient.phone) : "Sem telefone"}</span>
                      <span>{patient.email ?? "Sem email"}</span>
                      {patient.birthDate ? (
                        <span>Nasc. {new Date(patient.birthDate + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-2 lg:items-end lg:max-w-sm">
                    {patient.healthInsurance ? (
                      <span className="meta-chip">{patient.healthInsurance}</span>
                    ) : (
                      <span className="text-sm text-[var(--muted)]">Sem convenio</span>
                    )}
                    {patient.notes ? (
                      <span className="text-sm text-[var(--muted)] lg:text-right">{patient.notes}</span>
                    ) : null}
                  </div>
                </div>

                {patient.id ? (
                  <div className="mt-4 toolbar-inline">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setEditingPatient(patient)}
                      type="button"
                    >
                      Editar cadastro
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setActivePatient(patient)}
                      type="button"
                    >
                      Documentos
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      disabled={deletingPatientId === patient.id}
                      onClick={() => {
                        if (window.confirm(`Excluir paciente ${patient.name}?`)) {
                          setFeedback(null);
                          void deletePatient.mutateAsync(patient.id ?? "");
                        }
                      }}
                      type="button"
                    >
                      {deletingPatientId === patient.id ? "Excluindo..." : "Excluir"}
                    </button>
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <div className="empty-state">
              <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
              <p className="text-sm font-semibold">
                Nenhum paciente encontrado para os filtros atuais.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function PatientEditForm({
  patient,
  onSaved,
  onCancel,
}: {
  patient: PatientResponse;
  onSaved: (message: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PatientUpdateValues>({
    resolver: zodResolver(patientUpdateSchema),
    defaultValues: {
      name: patient.name ?? "",
      phone: patient.phone ?? "",
      email: patient.email ?? "",
      healthInsuranceId: patient.healthInsuranceId ?? "",
      notes: patient.notes ?? "",
    },
  });

  const healthInsQuery = useQuery({
    queryKey: ["health-insurances-catalog"],
    queryFn: async () => { const r = await healthInsurancesList(1, 200); return r.items ?? []; },
    placeholderData: [],
  });
  const healthPlans = healthInsQuery.data ?? [];

  const updatePatient = useMutation({
    mutationFn: async (values: PatientUpdateValues) =>
      DefaultService.patientsUpdate(patient.id ?? "", {
        name: values.name,
        phone: values.phone.replace(/\D/g, ""),
        email: values.email || undefined,
        healthInsuranceId: values.healthInsuranceId || undefined,
        notes: values.notes || undefined,
      }),
    onSuccess: async (updatedPatient) => {
      setFeedback("Paciente atualizado com sucesso.");
      await onSaved(
        `${updatedPatient.name ?? patient.name ?? "Paciente"} atualizado com sucesso.`,
      );
    },
    onError: () => {
      setFeedback("Nao foi possivel atualizar o paciente agora.");
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFeedback(null);
    await updatePatient.mutateAsync(values);
  });

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
      <Field error={errors.name?.message} label="Nome">
        <input className="input-field" {...register("name")} />
      </Field>
      <Field error={errors.phone?.message} label="Telefone">
        <input className="input-field" placeholder="(11) 98888-0000" {...register("phone", { setValueAs: (v: string) => v.replace(/\D/g, "") })} onInput={(e) => { e.currentTarget.value = applyPhoneMask(e.currentTarget.value); }} />
      </Field>
      <Field error={errors.email?.message} label="Email">
        <input className="input-field" {...register("email")} />
      </Field>
      <Field error={errors.healthInsuranceId?.message} label="Convenio">
        <select className="input-field" {...register("healthInsuranceId")}>
          <option value="">Sem convenio</option>
          {healthPlans.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field
        className="md:col-span-2"
        error={errors.notes?.message}
        label="Observacoes"
      >
        <textarea className="input-field min-h-24" {...register("notes")} />
      </Field>
      {feedback ? (
        <p className="md:col-span-2 text-sm text-[var(--muted)]">{feedback}</p>
      ) : null}
      <div className="md:col-span-2 flex justify-end gap-3">
        <button
          className="btn btn-ghost btn-sm"
          onClick={onCancel}
          type="button"
        >
          Cancelar
        </button>
        <button
          className="btn btn-primary"
          disabled={updatePatient.isPending}
          type="submit"
        >
          {updatePatient.isPending ? "Salvando..." : "Salvar alteracoes"}
        </button>
      </div>
    </form>
  );
}

function PatientDocumentsPanel({
  patientId,
  patientName,
  patientAccessToken,
}: {
  patientId: string;
  patientName: string;
  patientAccessToken: string;
}) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<
    string | null
  >(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(
    null,
  );
  const [tokenHighlight, setTokenHighlight] = useState(false);
  const [currentToken, setCurrentToken] = useState(patientAccessToken);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();
  const {
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      file: undefined,
    },
  });

  const documentsQuery = useQuery({
    queryKey: ["patient-documents", patientId],
    queryFn: async () => DefaultService.patientsDocumentsList(patientId),
  });

  const addDocument = useMutation({
    mutationFn: async (values: DocumentFormValues) =>
      DefaultService.patientsDocumentsUpload(patientId, {
        file: values.file,
      }),
    onSuccess: async () => {
      setFeedback("Documento enviado. Compartilhe o token do portal com o paciente.");
      reset({ file: undefined });
      setTokenHighlight(true);
      setTimeout(() => setTokenHighlight(false), 4000);
      await queryClient.invalidateQueries({
        queryKey: ["patient-documents", patientId],
      });
    },
    onError: () => {
      setFeedback("Nao foi possivel registrar o documento agora.");
    },
  });

  const regenerateToken = useMutation({
    mutationFn: () => DefaultService.patientsRegenerateAccessToken(patientId),
    onSuccess: (newToken) => {
      setCurrentToken(newToken ?? "");
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });

  const downloadDocument = useMutation({
    mutationFn: async (patientDocument: PatientDocumentResponse) => {
      if (!patientDocument.id) {
        throw new Error("Documento sem identificador.");
      }

      setDownloadingDocumentId(patientDocument.id);
      const file = await DefaultService.patientsDocumentsDownload(patientId, patientDocument.id);

      triggerBrowserDownload(
        file,
        patientDocument.fileName ?? "documento-clinico",
      );

      return patientDocument;
    },
    onSuccess: (patientDocument) => {
      setFeedback(
        `Download iniciado para ${patientDocument.fileName ?? "o documento"}.`,
      );
    },
    onError: () => {
      setFeedback("Nao foi possivel baixar o documento agora.");
    },
    onSettled: () => {
      setDownloadingDocumentId(null);
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (patientDocument: PatientDocumentResponse) => {
      if (!patientDocument.id) {
        throw new Error("Documento sem identificador.");
      }

      setDeletingDocumentId(patientDocument.id);
      await DefaultService.patientsDocumentsDelete(patientId, patientDocument.id);
      return patientDocument;
    },
    onSuccess: async (patientDocument) => {
      setFeedback(
        `${patientDocument.fileName ?? "Documento"} removido com sucesso.`,
      );
      await queryClient.invalidateQueries({
        queryKey: ["patient-documents", patientId],
      });
    },
    onError: () => {
      setFeedback("Nao foi possivel remover o documento agora.");
    },
    onSettled: () => {
      setDeletingDocumentId(null);
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFeedback(null);
    await addDocument.mutateAsync(values);
  });

  async function copyToken() {
    await navigator.clipboard.writeText(currentToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleFileSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setValue("file", file, { shouldValidate: true });
  }

  return (
    <div className="grid gap-4">
      {feedback ? (
        <div className="rounded-md border border-[var(--border)] bg-[var(--brand-wash)] px-4 py-3 text-sm text-[var(--muted)]">
          {feedback}
        </div>
      ) : null}

      <div
        className={cn(
          "rounded-md border border-[var(--border)] bg-[var(--bg)] p-4 transition-all duration-500",
          tokenHighlight && "ring-2 ring-[var(--brand)] ring-offset-2",
        )}
      >
        <p className="label">Token do portal do paciente</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="flex-1 rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-xs break-all">
            {currentToken || "—"}
          </code>
          <div className="flex gap-2">
            <button
              className="btn btn-ghost btn-sm"
              disabled={!currentToken}
              onClick={() => void copyToken()}
              type="button"
            >
              {copied ? "Copiado!" : "Copiar"}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              disabled={regenerateToken.isPending}
              onClick={() => regenerateToken.mutate()}
              type="button"
            >
              {regenerateToken.isPending ? "Gerando..." : "Novo token"}
            </button>
          </div>
        </div>
      </div>

      <form className="grid gap-4 rounded-md border border-[var(--border)] bg-[var(--bg)] p-4" onSubmit={onSubmit}>
        <p className="label">Enviar documento</p>
        <Field error={errors.file?.message} label="Arquivo (PDF, JPG, PNG)">
          <input
            accept=".pdf,.jpg,.jpeg,.png"
            className="input-field"
            onChange={handleFileSelection}
            type="file"
          />
        </Field>
        <div className="flex justify-end">
          <button
            className="btn btn-primary"
            disabled={addDocument.isPending}
            type="submit"
          >
            {addDocument.isPending ? "Registrando..." : "Registrar documento"}
          </button>
        </div>
      </form>

      <div className="stack-list">
        {documentsQuery.isLoading ? (
          <div className="empty-state">
            <span className="spinner w-8 h-8" />
            <p className="text-sm font-semibold">Carregando documentos...</p>
          </div>
        ) : documentsQuery.data?.length ? (
          documentsQuery.data.map((document) => (
            <DocumentCard
              document={document}
              isDeleting={deletingDocumentId === document.id}
              isDownloading={downloadingDocumentId === document.id}
              key={document.id ?? document.storagePath ?? document.fileName}
              onDelete={() => {
                setFeedback(null);
                void deleteDocument.mutateAsync(document);
              }}
              onDownload={() => {
                setFeedback(null);
                void downloadDocument.mutateAsync(document);
              }}
            />
          ))
        ) : (
          <div className="empty-state">
            <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p className="text-sm font-semibold">
              Nenhum documento registrado para este paciente ainda.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentCard({
  document,
  isDeleting,
  isDownloading,
  onDelete,
  onDownload,
}: {
  document: PatientDocumentResponse;
  isDeleting: boolean;
  isDownloading: boolean;
  onDelete: () => void;
  onDownload: () => void;
}) {
  return (
    <article className="data-card">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h6 className="text-sm font-semibold">
            {document.fileName ?? "Documento"}
          </h6>
          <div className="meta-row mt-1">
            <span>{document.contentType ?? "application/octet-stream"}</span>
            <span>{formatFileSize(document.sizeInBytes ?? 0)}</span>
          </div>
        </div>
        <div className="toolbar-inline">
          <button
            className="btn btn-ghost btn-sm"
            disabled={isDownloading || isDeleting}
            onClick={onDownload}
            type="button"
          >
            {isDownloading ? "Baixando..." : "Baixar"}
          </button>
          <button
            className="btn btn-danger btn-sm"
            disabled={isDownloading || isDeleting}
            onClick={onDelete}
            type="button"
          >
            {isDeleting ? "Removendo..." : "Excluir"}
          </button>
        </div>
      </div>
    </article>
  );
}

function PatientSkeleton() {
  return (
    <div className="stack-list" aria-busy aria-label="Carregando pacientes">
      {[1, 2, 3].map((index) => (
        <div key={index} className="data-card">
          <div className={cn("skeleton h-5 w-40 rounded-full")} />
          <div className={cn("skeleton mt-3 h-4 w-64 rounded-full")} />
        </div>
      ))}
    </div>
  );
}
