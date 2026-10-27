"use client";

import { ClinicalPanel } from "./clinical-panel";
import { PrescriptionContentField } from "./prescription-content-field";
import { useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DefaultService } from "@/services/api";
import type { AppointmentResponse, ClinicalCatalogResponse, ClinicalEntryResponse, ClinicalField, CreateClinicalEntryRequest } from "@/generated";
import { ClinicalValuesSummary } from "./clinical-values";
import { ClinicalRecordModal } from "@/modules/scheduling/clinical-record-modal";
import { Modal } from "@/components/ui/modal";
import { apiErrorMessage } from "@/lib/api-error";
import { getValidAccessToken } from "@/lib/auth-session";
import { OpenAPI } from "@/generated/core/OpenAPI";

export const clinicalEntryLabels: Record<string, string> = { Document: "Receituário e documentos", ExamOrder: "Solicitação de exames", ExamResult: "Resultados de exames", Anamnesis: "Anamnese", Questionnaire: "Questionários", Nutrition: "Planejamento alimentar", Summary: "Resumo clínico" };
const summaryFields: ClinicalField[] = ["Diagnósticos", "Antecedentes", "Medicamentos em uso", "Alergias", "Observações"].map(label => ({ label, type: "Text" }));

export function ClinicalWorkspace({ appointment, canWrite, onClose }: { appointment: AppointmentResponse; canWrite: boolean; onClose: () => void }) {
  const [editRecord, setEditRecord] = useState(false);
  const [entryDirty, setEntryDirty] = useState(false);
  const [entryPending, setEntryPending] = useState(false);
  function leaveEntry(action: () => void) {
    if (entryPending) return;
    if (entryDirty && !window.confirm("Descartar as alterações não salvas deste registro?")) return;
    setEntryDirty(false);
    action();
  }

  const [previousAppointment, setPreviousAppointment] = useState<string | null>(null);
  const [kind, setKind] = useState<string | null>(null);
  const [correction, setCorrection] = useState<ClinicalEntryResponse | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [attachments, setAttachments] = useState(false);
  const [preview, setPreview] = useState<ClinicalEntryResponse | null>(null);
  const record = useQuery({ queryKey: ["clinical-record", appointment.id], queryFn: () => DefaultService.clinicalRecordGet(appointment.id!), retry: false });
  const history = useQuery({ queryKey: ["clinical-history", appointment.patientId, page], queryFn: () => DefaultService.clinicalEntriesHistory(appointment.patientId!, page, 50) });
  const records = useQuery({ queryKey: ["patient-clinical-records", appointment.patientId], queryFn: () => DefaultService.clinicalRecordListByPatient(appointment.patientId!) });
  const canRegister = canWrite && record.data?.status === "Draft";
  const summary = useQuery({ queryKey: ["clinical-history", appointment.patientId, "summary"], queryFn: () => DefaultService.clinicalEntriesHistory(appointment.patientId!, 1, 1, "Summary") });
  const recentSummary = summary.data?.items?.[0];
  const visibleEntries = (history.data?.items ?? []).filter(entry => `${entry.title} ${entry.content} ${Object.values(entry.values ?? {}).join(" ")}`.toLowerCase().includes(search.toLowerCase()));


  return <Modal title={`${appointment.patientName ?? "Paciente"} · Atendimento`} size="xl" onClose={() => leaveEntry(onClose)} footer={<nav aria-label="Opções do atendimento" className="flex flex-wrap gap-2">{Object.entries(clinicalEntryLabels).map(([key, label]) => <button type="button" key={key} className="btn btn-ghost min-h-11" disabled={!canRegister || entryPending} onClick={() => leaveEntry(() => { setCorrection(null); setEditRecord(false); setKind(key); })}>{label}</button>)}<button className="btn btn-ghost min-h-11" onClick={() => setAttachments(true)}>Imagens e anexos</button></nav>}>
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between gap-3"><p className="text-sm text-[var(--muted)]">{appointment.doctorName} · {appointment.startAt ? new Date(appointment.startAt).toLocaleString("pt-BR") : ""}</p><button className="btn btn-primary" onClick={() => leaveEntry(() => { setKind(null); setEditRecord(true); })}>{canWrite ? "Abrir evolução e finalização" : "Consultar prontuário"}</button></div>
      {canWrite && !canRegister && <p className="rounded-md border border-[var(--border)] p-3 text-sm">{record.data?.status === "Finalized" ? "Prontuário finalizado. Use um adendo na evolução para registrar correções. Finalizar prontuário e concluir agendamento são ações separadas." : "Abra a evolução e salve o prontuário em rascunho para registrar documentos e formulários."}</p>}
      {record.error && !(typeof record.error === "object" && "status" in record.error && record.error.status === 404) && <p role="alert">{apiErrorMessage(record.error, "Não foi possível carregar o prontuário.")}</p>}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]" role="region" aria-label="Histórico e digitação do prontuário">
        <section aria-label="Histórico do paciente" className="min-w-0 space-y-5 lg:max-h-[70vh] lg:overflow-y-auto lg:pr-2">
          <h2 className="font-semibold">Histórico do paciente</h2>
          {previousAppointment && <ClinicalRecordModal inline appointment={{ ...appointment, id: previousAppointment }} canWrite={false} onClose={() => setPreviousAppointment(null)} />}
        <section className="rounded-lg border border-[var(--border)] p-5"><h3 className="font-semibold mb-3">Arquivos do paciente</h3><p className="mb-3 text-sm text-[var(--muted)]">Exames, imagens e documentos anexados ao prontuário.</p>{attachments ? <ClinicalAttachments patientId={appointment.patientId!} onClose={() => setAttachments(false)} /> : <button className="btn btn-ghost" onClick={() => setAttachments(true)}>Adicionar arquivo / consultar anexos</button>}</section>
        <div className="space-y-5"><section className="rounded-lg border border-[var(--border)] p-5"><h3 className="font-semibold mb-3">Resumo clínico</h3>{summary.error ? <p role="alert">{apiErrorMessage(summary.error, "Não foi possível carregar o resumo.")}</p> : recentSummary ? <><p className="text-xs text-[var(--muted)] mb-3">{recentSummary.doctorName} · {new Date(recentSummary.createdAt!).toLocaleString("pt-BR")}</p><dl className="space-y-3">{Object.entries(recentSummary.values ?? {}).map(([label, value]) => <div key={label}><dt className="text-xs text-[var(--muted)]">{label}</dt><dd className="whitespace-pre-wrap">{value || "Não informado"}</dd></div>)}</dl></> : <p className="text-sm text-[var(--muted)]">Nenhum resumo registrado. Ausência de informação não significa ausência de alergias ou condições clínicas.</p>}</section>
          <section className="rounded-lg border border-[var(--border)] p-5"><h3 className="font-semibold mb-3">Evoluções anteriores</h3>{records.isLoading && <p>Carregando…</p>}{records.error && <p role="alert">{apiErrorMessage(records.error, "Não foi possível carregar as evoluções.")}</p>}{records.data?.map(item => <details key={item.id} className="border-t border-[var(--border)] py-3"><summary className="cursor-pointer">{item.doctorName} · {item.status === "Finalized" ? "Finalizado" : "Rascunho"}{item.finalizedAt ? ` · ${new Date(item.finalizedAt).toLocaleDateString("pt-BR")}` : ""}</summary>{[["Prontuário", item.content], ["Receituário", item.prescription], ["Queixa", item.chiefComplaint], ["História", item.history], ["Exame físico", item.physicalExam], ["Avaliação", item.assessment], ["Plano", item.plan]].map(([label, value]) => value && <p key={label} className="whitespace-pre-wrap mt-2 text-sm"><strong>{label}:</strong> {value}</p>)}<button className="btn btn-ghost btn-sm mt-3" onClick={() => setPreviousAppointment(item.appointmentId!)}>Ver evolução e adendos</button></details>)}{records.data?.length === 0 && <p className="text-sm text-[var(--muted)]">Sem evoluções registradas.</p>}</section>
        </div>
        <section className="rounded-lg border border-[var(--border)] p-5"><h3 className="font-semibold mb-3">Histórico clínico e documentos</h3><label className="block text-sm mb-4">Buscar nesta página<input type="search" className="input-field mt-1" value={search} onChange={e => setSearch(e.target.value)} /></label>{history.isLoading && <p role="status">Carregando histórico…</p>}{history.error && <p role="alert">{apiErrorMessage(history.error, "Não foi possível carregar o histórico.")}</p>}{visibleEntries.map(entry => <article key={entry.id} className="border-l-2 border-[var(--brand-soft)] pl-4 pb-6"><p className="text-xs text-[var(--muted)]">{new Date(entry.createdAt!).toLocaleString("pt-BR")} · {entry.doctorName}</p><h4 className="font-semibold">{entry.title}</h4><p className="text-xs text-[var(--muted)]">{clinicalEntryLabels[entry.kind ?? ""]}{entry.correctsEntryId ? " · Correção de registro anterior" : ""}</p><p className="whitespace-pre-wrap text-sm my-2">{entry.content}</p>{Object.entries(entry.values ?? {}).map(([key, value]) => <p key={key} className="text-sm"><strong>{key}:</strong> {value === "true" ? "Sim" : value === "false" ? "Não" : value}</p>)}<ClinicalValuesSummary fields={entry.fields ?? []} values={entry.values ?? {}} />{entry.signatureMode === "DigitalMock" && <p className="text-sm text-amber-800">Assinatura digital simulada — sem validade de assinatura.</p>}<div className="flex flex-wrap gap-2 mt-3">{entry.kind === "Document" && <button className="btn btn-ghost btn-sm" onClick={() => setPreview(entry)}>Visualizar / imprimir</button>}{canRegister && entry.appointmentId === appointment.id && <button className="btn btn-ghost btn-sm" onClick={() => leaveEntry(() => { setCorrection(entry); setEditRecord(false); setKind(entry.kind!); })}>Registrar correção</button>}</div></article>)}{!history.isLoading && !history.error && visibleEntries.length === 0 && <p className="text-sm text-[var(--muted)]">Nenhum registro encontrado.</p>}<div className="flex items-center justify-between mt-3"><button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</button><span className="text-sm">Página {page}</span><button className="btn btn-ghost btn-sm" disabled={page * 50 >= (history.data?.total ?? 0)} onClick={() => setPage(page + 1)}>Próxima</button></div></section>
        </section>
        <section aria-label="Digitação do prontuário" className="min-w-0 space-y-4 lg:sticky lg:top-0">
          <h2 className="font-semibold">Digitação do prontuário</h2>
          <p className="text-sm text-[var(--muted)]">Escolha o tipo de registro na barra inferior. Ao salvar, ele aparece no histórico à esquerda.</p>
        {editRecord && <ClinicalRecordModal inline appointment={appointment} canWrite={canWrite} onClose={() => setEditRecord(false)} />}
        {kind && <ClinicalEntryEditor key={`${kind}-${correction?.id ?? "new"}`} appointmentId={appointment.id!} kind={kind} correction={correction} onDirtyChange={setEntryDirty} onPendingChange={setEntryPending} onSaved={() => { setKind(null); setCorrection(null); }} onClose={() => leaveEntry(() => { setKind(null); setCorrection(null); })} />}
          {!editRecord && !kind && <div className="rounded-lg border border-[var(--border)] p-5"><p className="mb-4 text-sm text-[var(--muted)]">Abra a evolução para digitar ou selecione uma opção na barra inferior.</p><button className="btn btn-primary" onClick={() => setEditRecord(true)}>{canWrite ? "Digitar evolução" : "Consultar evolução"}</button></div>}
        </section>
      </div>

    </div>
    {preview && <ClinicalDocumentPreview entry={preview} onClose={() => setPreview(null)} />}
  </Modal>;
}

function ClinicalEntryEditor({ appointmentId, kind, correction, onDirtyChange, onPendingChange, onSaved, onClose }: { appointmentId: string; kind: string; correction: ClinicalEntryResponse | null; onDirtyChange: (dirty: boolean) => void; onPendingChange: (pending: boolean) => void; onSaved: () => void; onClose: () => void }) {
  const client = useQueryClient();
  const dirty = useRef(false);
  function markDirty() { dirty.current = true; onDirtyChange(true); }
  const [templateId, setTemplateId] = useState("");
  const [title, setTitle] = useState(correction?.title ?? clinicalEntryLabels[kind]);
  const [content, setContent] = useState(correction?.content ?? "");
  const [values, setValues] = useState<Record<string, string>>(correction?.values ?? {});
  const [signatureMode, setSignatureMode] = useState(correction?.signatureMode ?? "Paper");
  const [requestId] = useState(() => crypto.randomUUID());
  const [saved, setSaved] = useState<ClinicalEntryResponse | null>(null);
  const catalogKind = ({ ExamOrder: "Exam", ExamResult: "Exam", Nutrition: "Food" } as Record<string,string>)[kind] ?? kind;
  const catalog = useQuery({ queryKey: ["clinical-catalog", catalogKind], queryFn: () => DefaultService.clinicalCatalogList(catalogKind), enabled: kind !== "Summary" });
  const selected = catalog.data?.find(item => item.id === templateId);
  const fields = kind === "Summary" ? summaryFields : selected?.fields ?? correction?.fields ?? [];
  function choose(item: ClinicalCatalogResponse | undefined) { if (dirty.current && !window.confirm("Substituir o texto e as respostas pelo modelo selecionado?")) return; setTemplateId(item?.id ?? ""); setTitle(item?.title ?? clinicalEntryLabels[kind]); setContent(item?.content ?? ""); setValues(Object.fromEntries((item?.fields ?? []).filter(field => field.defaultValue != null).map(field => [field.label ?? "", field.defaultValue!]))); }
  const save = useMutation({ mutationFn: () => {
    const body: CreateClinicalEntryRequest = { clientRequestId: requestId, kind, catalogItemId: templateId || null, title, content, values, signatureMode, correctsEntryId: correction?.id };
    return DefaultService.clinicalEntriesCreate(appointmentId, body);
  }, onSuccess: async entry => { dirty.current = false; onDirtyChange(false); await Promise.all([client.invalidateQueries({ queryKey: ["clinical-history"] }), client.invalidateQueries({ queryKey: ["clinical-record", appointmentId] })]); if (kind === "Document") setSaved(entry); else onSaved(); }, onSettled: () => onPendingChange(false) });
  if (saved) return <ClinicalDocumentPreview entry={saved} onClose={onClose} />;
  return <ClinicalPanel inline title={`${correction ? "Corrigir · " : ""}${clinicalEntryLabels[kind]}`} size="lg" onClose={onClose}><form className="space-y-4" onChange={markDirty} onSubmit={e => { e.preventDefault(); onPendingChange(true); save.mutate(); }}><fieldset disabled={save.isPending} className="space-y-4">
    {kind !== "Summary" && <label className="block">Modelo / cadastro<select className="input-field" value={templateId} required={!correction && ["Anamnesis", "Questionnaire"].includes(kind)} onChange={e => choose(catalog.data?.find(item => item.id === e.target.value))}><option value="">{["Anamnesis", "Questionnaire"].includes(kind) ? "Selecione um formulário" : "Preenchimento livre"}</option>{catalog.data?.map(item => <option key={item.id} value={item.id}>{item.folder} / {item.title}{item.ownerUserId ? " (pessoal)" : ""}</option>)}</select>{catalog.error && <p role="alert">{apiErrorMessage(catalog.error, "Não foi possível carregar os modelos.")}</p>}</label>}
    <label className="block">Título<input className="input-field" required maxLength={200} value={title ?? ""} onChange={e => setTitle(e.target.value)} /></label>
    {kind === "Document" ? <PrescriptionContentField label="Conteúdo / observações" value={content} onChange={value => { markDirty(); setContent(value); }} required={fields.length === 0} /> : <label className="block">Conteúdo / observações<textarea className="input-field min-h-40" maxLength={30000} required={fields.length === 0} value={content} onChange={e => setContent(e.target.value)} /></label>}
    {fields.map((field, index) => <ClinicalValueField key={`${field.label}-${index}`} field={field} value={values[field.label ?? ""] ?? ""} onChange={value => setValues(previous => ({ ...previous, [field.label ?? ""]: value }))} />)}
    <ClinicalValuesSummary fields={fields} values={values} />
    {kind === "Document" && <><label className="block">Forma de assinatura<select className="input-field" value={signatureMode} onChange={e => setSignatureMode(e.target.value)}><option value="Paper">Manual em papel</option><option value="DigitalMock">Digital — simulação</option></select></label>{signatureMode === "DigitalMock" && <p role="status" className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">Modo demonstrativo. O documento terá a identificação “assinatura simulada”, sem certificado, assinatura criptográfica ou validade de assinatura digital.</p>}<p className="text-xs text-[var(--muted)]">Revise antes de registrar. O documento salvo não muda se o modelo for editado; correções geram um novo registro.</p></>}
    {save.error && <p role="alert">{apiErrorMessage(save.error, "Não foi possível registrar. Confira os campos.")}</p>}
    <div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={save.isPending}>{save.isPending ? "Registrando…" : "Registrar no histórico"}</button></div>
  </fieldset></form></ClinicalPanel>;
}

function ClinicalValueField({ field, value, onChange }: { field: ClinicalField; value: string; onChange: (value: string) => void }) {
  return <label className="block">{field.label}{field.unit ? ` (${field.unit})` : ""}{field.required ? " *" : ""}{field.type === "Boolean" ? <select className="input-field" required={field.required} value={value} onChange={e => onChange(e.target.value)}><option value="">Não informado</option><option value="true">Sim</option><option value="false">Não</option></select> : field.type === "Number" ? <input className="input-field" required={field.required} type="number" step="any" min={field.min ?? undefined} max={field.max ?? undefined} value={value} onChange={e => onChange(e.target.value)} /> : <textarea className="input-field" required={field.required} maxLength={10000} value={value} onChange={e => onChange(e.target.value)} />}</label>;
}

export function ClinicalDocumentPreview({ entry, onClose }: { entry: ClinicalEntryResponse; onClose: () => void }) {
  const [printing, setPrinting] = useState(false);
  const document = <article className="bg-white text-black p-6"><h2 className="text-lg font-bold">{entry.clinicName}</h2><p className="text-sm mt-2">Paciente: {entry.patientName}</p><p className="text-sm">{entry.doctorName} · CRM {entry.doctorCrm}</p><p className="text-sm">{new Date(entry.createdAt!).toLocaleString("pt-BR")}</p><h3 className="font-semibold mt-6 mb-4">{entry.title}</h3><p className="whitespace-pre-wrap leading-7">{entry.content}</p>{Object.entries(entry.values ?? {}).map(([key, value]) => <p key={key} className="mt-2"><strong>{key}:</strong> {value === "true" ? "Sim" : value === "false" ? "Não" : value}</p>)}{entry.signatureMode === "DigitalMock" ? <p className="mt-10 border-2 border-black p-3 font-bold">ASSINATURA DIGITAL SIMULADA — SEM VALIDADE DE ASSINATURA. Nenhum certificado digital foi utilizado.</p> : <div className="mt-16 text-center"><p>________________________________________</p><p>{entry.doctorName} · CRM {entry.doctorCrm}</p><p>Assinatura e carimbo</p></div>}</article>;
  function print() { flushSync(() => setPrinting(true)); try { window.print(); } finally { setPrinting(false); } }
  return <><Modal title="Documento registrado" size="lg" onClose={onClose}>{document}<button type="button" className="btn btn-primary mt-4" onClick={print}>Imprimir / salvar PDF</button></Modal>{printing && createPortal(<div id="clinical-document-print"><style>{`#clinical-document-print{display:none}@media print{@page{size:A4;margin:15mm}body>:not(#clinical-document-print){display:none!important}html,body{overflow:visible!important;height:auto!important}#clinical-document-print{display:block!important}#clinical-document-print article{padding:0}}`}</style>{document}</div>, window.document.body)}</>;
}

function ClinicalAttachments({ patientId, onClose }: { patientId: string; onClose: () => void }) {
  const client = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const documents = useQuery({ queryKey: ["patient-documents", patientId], queryFn: () => DefaultService.patientsDocumentsList(patientId) });
  const upload = useMutation({ mutationFn: () => DefaultService.patientsDocumentsUpload(patientId, { file: file! }), onSuccess: async () => { setFile(null); await client.invalidateQueries({ queryKey: ["patient-documents", patientId] }); } });
  async function download(id: string, name: string) {
    try { setError(""); const token = await getValidAccessToken(); const response = await fetch(`${OpenAPI.BASE}/patients/${patientId}/documents/${id}/download`, { headers: { Authorization: `Bearer ${token}` } }); if (!response.ok) throw new Error("Não foi possível baixar o arquivo."); const url = URL.createObjectURL(await response.blob()); const link = window.document.createElement("a"); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } catch (cause) { setError(apiErrorMessage(cause, "Falha no download.")); }
  }
  return <ClinicalPanel inline title="Imagens e documentos do paciente" size="lg" onClose={onClose}><form className="space-y-3" onSubmit={e => { e.preventDefault(); if (file) upload.mutate(); }}><label>Arquivo (até 10 MB)<input className="input-field" type="file" onChange={e => { const selected = e.target.files?.[0] ?? null; setError(selected && selected.size > 10 * 1024 * 1024 ? "O arquivo excede 10 MB." : ""); setFile(selected && selected.size <= 10 * 1024 * 1024 ? selected : null); }} /></label><button className="btn btn-primary" disabled={!file || upload.isPending}>{upload.isPending ? "Enviando…" : "Enviar arquivo"}</button></form>{(error || upload.error || documents.error) && <p role="alert" className="mt-3">{error || apiErrorMessage(upload.error ?? documents.error, "Não foi possível acessar os arquivos.")}</p>}<div className="space-y-3 mt-5">{documents.isLoading && <p>Carregando…</p>}{documents.data?.map(item => <div className="flex justify-between gap-3 border-t border-[var(--border)] pt-3" key={item.id}><span>{item.fileName}</span><button className="btn btn-ghost btn-sm" onClick={() => download(item.id!, item.fileName ?? "documento")}>Baixar</button></div>)}{documents.data?.length === 0 && <p>Nenhum arquivo anexado.</p>}</div></ClinicalPanel>;
}
