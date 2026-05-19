import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DefaultService, downloadPatientDocument } from "@/services/api";
import type { PatientDocumentResponse, PatientResponse } from "@/generated";
import { cn } from "@/lib/cn";

const schema = z.object({
  name: z.string().min(3, "Informe o nome do paciente."),
  cpf: z.string().min(11, "Informe um CPF valido."),
  phone: z.string().min(10, "Informe um telefone valido."),
  email: z.union([z.string().email("Informe um email valido."), z.literal("")]),
  birthDate: z.string().optional(),
  healthInsurance: z.string().optional(),
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
  healthInsurance: z.string().optional(),
  notes: z.string().optional(),
});

type DocumentFormValues = z.infer<typeof documentSchema>;
type PatientUpdateValues = z.infer<typeof patientUpdateSchema>;

function triggerBrowserDownload(file: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(file);
  const link = window.document.createElement("a");

  link.href = objectUrl;
  link.download = fileName;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export function PatientList({
  patients,
  page,
  pageSize,
  total,
  search,
  isLoading,
  onSearchChange,
  onPageChange,
}: {
  patients: PatientResponse[];
  page: number;
  pageSize: number;
  total: number;
  search: string;
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
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
      healthInsurance: "",
      notes: "",
    },
  });

  const createPatient = useMutation({
    mutationFn: async (values: FormValues) =>
      DefaultService.patientsCreate({
        name: values.name,
        cpf: values.cpf.replace(/\D/g, ""),
        phone: values.phone.replace(/\D/g, ""),
        email: values.email || undefined,
        birthDate: values.birthDate || undefined,
        healthInsurance: values.healthInsurance || undefined,
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

  return (
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
            setIsFormOpen((current) => !current);
          }}
          type="button"
        >
          {isFormOpen ? "Cancelar" : "Novo paciente"}
        </button>
      </div>

      {feedback ? (
        <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--brand-wash)] px-4 py-3 text-sm text-[var(--muted)]">
          {feedback}
        </div>
      ) : null}

      <div className="toolbar mt-4">
        <div className="toolbar-stack">
          <label className="min-w-0 flex-1">
            <span className="mb-2 block text-sm font-semibold">Busca rapida</span>
            <input
              className="input-field"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar por nome, CPF ou telefone"
              value={search}
            />
          </label>
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

      {isFormOpen ? (
        <form
          className="section-card mt-5 grid gap-5 p-5 md:grid-cols-2 md:p-6"
          onSubmit={onSubmit}
        >
          <Field error={errors.name?.message} label="Nome">
            <input className="input-field" {...register("name")} />
          </Field>
          <Field error={errors.cpf?.message} label="CPF">
            <input className="input-field" {...register("cpf")} />
          </Field>
          <Field error={errors.phone?.message} label="Telefone">
            <input className="input-field" {...register("phone")} />
          </Field>
          <Field error={errors.birthDate?.message} label="Data de nascimento">
            <input className="input-field" type="date" {...register("birthDate")} />
          </Field>
          <Field error={errors.email?.message} label="Email">
            <input className="input-field" {...register("email")} />
          </Field>
          <Field error={errors.healthInsurance?.message} label="Convenio">
            <input className="input-field" {...register("healthInsurance")} />
          </Field>
          <Field
            className="md:col-span-2"
            error={errors.notes?.message}
            label="Observacoes"
          >
            <textarea className="input-field min-h-28" {...register("notes")} />
          </Field>
          <div className="md:col-span-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <span className="text-sm text-[var(--muted)]">
              Cadastro ligado ao backend e pronto para alimentar agenda e
              documentos do paciente.
            </span>
            <button
              className="btn btn-primary"
              disabled={createPatient.isPending}
              type="submit"
            >
              {createPatient.isPending ? "Salvando..." : "Salvar paciente"}
            </button>
          </div>
        </form>
      ) : null}

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
                    <span>CPF {patient.cpf ?? "Nao informado"}</span>
                    <span>{patient.phone ?? "Sem telefone"}</span>
                    <span>{patient.email ?? "Sem email"}</span>
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
                <div className="mt-4">
                  <div className="toolbar-inline">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() =>
                        setEditingPatientId((current) =>
                          current === patient.id ? null : (patient.id ?? null),
                        )
                      }
                      type="button"
                    >
                      {editingPatientId === patient.id
                        ? "Fechar edicao"
                        : "Editar cadastro"}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() =>
                        setActivePatientId((current) =>
                          current === patient.id ? null : (patient.id ?? null),
                        )
                      }
                      type="button"
                    >
                      {activePatientId === patient.id
                        ? "Fechar documentos"
                        : "Documentos"}
                    </button>
                  </div>

                  {editingPatientId === patient.id ? (
                    <PatientEditPanel
                      onSaved={async (message) => {
                        setFeedback(message);
                        setEditingPatientId(null);
                        await Promise.all([
                          queryClient.invalidateQueries({
                            queryKey: ["patients-list"],
                          }),
                          queryClient.invalidateQueries({
                            queryKey: ["patients-catalog"],
                          }),
                        ]);
                      }}
                      patient={patient}
                    />
                  ) : null}

                  {activePatientId === patient.id ? (
                    <PatientDocumentsPanel
                      patientAccessToken={patient.patientAccessToken ?? ""}
                      patientId={patient.id}
                      patientName={patient.name ?? "Paciente"}
                    />
                  ) : null}
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
  );
}

function PatientEditPanel({
  patient,
  onSaved,
}: {
  patient: PatientResponse;
  onSaved: (message: string) => Promise<void>;
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
      healthInsurance: patient.healthInsurance ?? "",
      notes: patient.notes ?? "",
    },
  });

  const updatePatient = useMutation({
    mutationFn: async (values: PatientUpdateValues) =>
      DefaultService.patientsUpdate(patient.id ?? "", {
        name: values.name,
        phone: values.phone.replace(/\D/g, ""),
        email: values.email || undefined,
        healthInsurance: values.healthInsurance || undefined,
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
    <form
      className="section-card mt-4 grid gap-4 p-5 md:grid-cols-2"
      onSubmit={onSubmit}
    >
      <Field error={errors.name?.message} label="Nome">
        <input className="input-field" {...register("name")} />
      </Field>
      <Field error={errors.phone?.message} label="Telefone">
        <input className="input-field" {...register("phone")} />
      </Field>
      <Field error={errors.email?.message} label="Email">
        <input className="input-field" {...register("email")} />
      </Field>
      <Field error={errors.healthInsurance?.message} label="Convenio">
        <input className="input-field" {...register("healthInsurance")} />
      </Field>
      <Field
        className="md:col-span-2"
        error={errors.notes?.message}
        label="Observacoes"
      >
        <textarea className="input-field min-h-28" {...register("notes")} />
      </Field>
      <div className="md:col-span-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <span className="text-sm text-[var(--muted)]">
          {feedback ??
            "Atualize os dados operacionais sem perder o contexto clinico do cadastro."}
        </span>
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
      const file = await downloadPatientDocument(patientId, patientDocument.id);

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
    <div className="section-card mt-4 p-5">
      <div className="section-heading">
        <div>
          <p className="label">Documentos do paciente</p>
          <h5 className="mt-2 text-xl font-semibold">{patientName}</h5>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Upload real via backend com download autenticado na sessao atual.
          </p>
        </div>
        <div className="highlight-card max-w-sm">
          <p className="label">Storage</p>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            PDF, JPG e PNG com trilha de metadata e soft delete.
          </p>
        </div>
      </div>

      {/* Portal access token */}
      <div
        className={cn(
          "section-card mt-5 p-5 transition-all duration-500",
          tokenHighlight && "ring-2 ring-[var(--brand)] ring-offset-2",
        )}
      >
        <p className="label">Portal do Paciente</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Compartilhe o token abaixo com o paciente para que ele acesse o portal.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 font-mono text-xs break-all">
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
        {tokenHighlight && (
          <p className="mt-2 text-xs font-medium text-[var(--brand)]">
            Documento enviado — lembre de compartilhar este token com o paciente.
          </p>
        )}
      </div>

      <form className="section-card mt-5 grid gap-4 p-5" onSubmit={onSubmit}>
        <Field error={errors.file?.message} label="Arquivo">
          <input
            accept=".pdf,.jpg,.jpeg,.png"
            className="input-field"
            onChange={handleFileSelection}
            type="file"
          />
        </Field>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <span className="text-sm text-[var(--muted)]">
            {feedback ??
              "PDF, JPG e PNG ate 10 MB por arquivo com upload real via backend."}
          </span>
          <button
            className="btn btn-primary"
            disabled={addDocument.isPending}
            type="submit"
          >
            {addDocument.isPending ? "Registrando..." : "Registrar documento"}
          </button>
        </div>
      </form>

      <div className="stack-list mt-5">
        {documentsQuery.isLoading ? (
          <div className="empty-state">
            <span className="spinner" style={{ width: "2rem", height: "2rem" }} />
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
          <h6 className="text-lg font-semibold">
            {document.fileName ?? "Documento"}
          </h6>
          <div className="meta-row mt-2">
            <span>{document.contentType ?? "application/octet-stream"}</span>
            <span>{formatFileSize(document.sizeInBytes ?? 0)}</span>
          </div>
        </div>
        <div className="toolbar-inline">
          <span className="pill text-xs">Storage metadata</span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={isDownloading || isDeleting}
            onClick={onDownload}
            type="button"
          >
            {isDownloading ? "Baixando..." : "Baixar arquivo"}
          </button>
          <button
            className="btn btn-danger btn-sm"
            disabled={isDownloading || isDeleting}
            onClick={onDelete}
            type="button"
          >
            {isDeleting ? "Removendo..." : "Excluir documento"}
          </button>
        </div>
      </div>
      <p className="mt-4 break-all text-sm text-[var(--muted)]">
        {document.storagePath ?? "Sem caminho de storage"}
      </p>
    </article>
  );
}

function formatFileSize(value: number) {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (value >= 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${value} B`;
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
