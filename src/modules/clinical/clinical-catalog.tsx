"use client";

import { PrescriptionContentField } from "./prescription-content-field";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DefaultService } from "@/services/api";
import type { ClinicalCatalogResponse, ClinicalField, SaveClinicalCatalogRequest } from "@/generated";
import { Modal } from "@/components/ui/modal";
import { apiErrorMessage } from "@/lib/api-error";

export const catalogLabels: Record<string, string> = { Document: "Modelos de documentos", Exam: "Planilha de exames", Food: "Alimentos", Anamnesis: "Formulários de anamnese", Questionnaire: "Questionários de apoio" };
const initialFields: Record<string, ClinicalField[]> = {
  Food: ["Porção (g)", "Energia (kcal)", "Carboidratos (g)", "Proteínas (g)", "Gorduras (g)"].map(label => ({ label, type: "Number", min: 0 })),
  Exam: [{ label: "Resultado", type: "Text" }],
};

export function ClinicalCatalog({ isDoctor, mode = "all" }: { isDoctor: boolean; mode?: "all" | "clinical" | "documents" }) {
  const [kind, setKind] = useState(mode === "clinical" ? "Exam" : "Document");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const documents = mode === "documents";
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ClinicalCatalogResponse | null | undefined>(undefined);
  const dirty = useRef(false);
  const [editorVersion, setEditorVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  function openEditor(item: ClinicalCatalogResponse | null | undefined) {
    if (saving) return;
    if (dirty.current && !window.confirm("Descartar as alterações não salvas deste receituário?")) return;
    dirty.current = false;
    setEditorVersion(version => version + 1);
    setEditing(item);
  }
  const client = useQueryClient();
  const items = useQuery({ queryKey: ["clinical-catalog", kind, search], queryFn: () => DefaultService.clinicalCatalogList(kind, search || undefined) });
  const remove = useMutation({ mutationFn: (item: ClinicalCatalogResponse) => DefaultService.clinicalCatalogDelete(item.id!, item.revision), onSuccess: async (_, removed) => { if (editing?.id === removed.id) { dirty.current = false; setEditing(undefined); } await client.invalidateQueries({ queryKey: ["clinical-catalog"] }); } });
  const folders = [...new Set(items.data?.map(item => item.folder || "Geral") ?? [])].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const folderOptions = useQuery({ queryKey: ["clinical-catalog", kind, ""], queryFn: () => DefaultService.clinicalCatalogList(kind), enabled: editing !== undefined });
  return <section className="space-y-6">
    {!documents && <div className="flex flex-wrap gap-2" aria-label="Cadastros clínicos">{Object.entries(catalogLabels).filter(([key]) => mode !== "clinical" || key !== "Document").map(([key, label]) => <button type="button" key={key} aria-pressed={kind === key} className={`btn ${kind === key ? "btn-primary" : "btn-ghost"}`} onClick={() => { setKind(key); setSearch(""); setSelectedFolder(null); }}>{label}</button>)}</div>}
    <div className={documents ? "grid items-start gap-5 lg:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]" : "space-y-6"}>
    <fieldset disabled={saving} className="panel min-w-0 rounded-lg p-5 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4"><label className="block flex-1 text-sm">Buscar por título ou pasta<input className="input-field mt-1" value={search} onChange={e => { setSearch(e.target.value); setSelectedFolder(null); }} type="search" /></label><button className="btn btn-primary" onClick={() => openEditor(null)}>{documents ? "Novo receituário" : "Novo cadastro"}</button></div>
      <p className="text-sm text-[var(--muted)]">Modelos compartilhados pela clínica e modelos pessoais. O conteúdo é revisado pelo profissional antes de usar no atendimento.</p>
      {(items.error || remove.error) && <p role="alert">{apiErrorMessage(items.error ?? remove.error, "Não foi possível carregar ou excluir o cadastro.")}</p>}
      {items.isLoading && <p role="status">Carregando cadastros…</p>}
      {!items.isLoading && !items.error && !items.data?.length && <p className="empty-state">Nenhum cadastro encontrado. Crie o primeiro modelo desta categoria.</p>}
      {items.data?.length === 500 && <p role="status">Exibindo até 500 cadastros. Refine a busca.</p>}
      {documents && <nav aria-label="Pastas de receituários" className="flex flex-wrap gap-2">
        <button className="btn btn-ghost" aria-pressed={selectedFolder === null} onClick={() => setSelectedFolder(null)}>Todas as pastas</button>
        {folders.map(folder => <button key={folder} className={`btn ${selectedFolder === folder ? "btn-primary" : "btn-ghost"}`} aria-pressed={selectedFolder === folder} onClick={() => setSelectedFolder(folder)}>{folder}</button>)}
      </nav>}
      {documents && <p className="text-sm text-[var(--muted)]">Para criar uma pasta, informe um novo nome ao cadastrar o documento. Para mover um modelo, edite sua pasta.</p>}
      {(documents && selectedFolder ? folders.filter(folder => folder === selectedFolder) : folders).map(folder => <details open key={folder} className="rounded-md border border-[var(--border)]"><summary className="cursor-pointer p-4 font-semibold">{folder} <span className="font-normal text-sm text-[var(--muted)]">({items.data?.filter(item => (item.folder || "Geral") === folder).length})</span></summary><div className="px-4">{documents && <button className="btn btn-ghost btn-sm my-2" onClick={() => { setSelectedFolder(folder); openEditor(null); }}>Novo nesta pasta</button>}{items.data?.filter(item => (item.folder || "Geral") === folder).map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] py-3"><div>{documents ? <button className="text-left font-medium text-[var(--primary)] underline-offset-4 hover:underline" aria-pressed={editing?.id === item.id} onClick={() => openEditor(item)}>{item.title}</button> : <p className="font-medium">{item.title}</p>}<p className="text-xs text-[var(--muted)]">{item.ownerUserId ? "Modelo pessoal" : "Compartilhado com a clínica"} · {item.fields?.length ?? 0} campos</p></div><div className="flex gap-2"><button className="btn btn-ghost btn-sm" onClick={() => openEditor(item)}>Editar</button><button className="btn btn-ghost btn-sm" onClick={() => openEditor({ ...item, id: undefined, revision: undefined, title: `${item.title} — cópia` })}>Copiar</button><button className="btn btn-ghost btn-sm" disabled={remove.isPending} onClick={() => { if (window.confirm(`Excluir o modelo “${item.title}”? Documentos já registrados serão preservados.`)) remove.mutate(item); }}>Excluir</button></div></div>)}</div></details>)}
    </fieldset>
    {editing !== undefined ? <CatalogEditor key={`${editing?.id ?? "new"}-${editing?.revision ?? "draft"}-${editorVersion}`} kind={kind} item={editing} isDoctor={isDoctor} inline={documents} onSaving={setSaving} onDirty={() => { dirty.current = true; }} onSaved={saved => { dirty.current = false; setEditing(documents ? saved : undefined); }} defaultFolder={selectedFolder ?? "Geral"} folderOptions={[...new Set(folderOptions.data?.map(item => item.folder || "Geral") ?? folders)]} onClose={() => openEditor(undefined)} /> : documents && <div className="panel rounded-lg p-8 text-sm text-[var(--muted)]">Selecione um receituário nas pastas à esquerda para editar ou crie um novo na pasta desejada.</div>}
    </div>
  </section>;
}

function CatalogEditor({ kind, item, isDoctor, defaultFolder, folderOptions, inline, onSaving, onDirty, onSaved, onClose }: { kind: string; item: ClinicalCatalogResponse | null; isDoctor: boolean; defaultFolder: string; folderOptions: string[]; inline: boolean; onSaving: (saving: boolean) => void; onDirty: () => void; onSaved: (item: ClinicalCatalogResponse) => void; onClose: () => void }) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [folder, setFolder] = useState(item?.folder ?? defaultFolder);
  const [content, setContent] = useState(item?.content ?? "");
  const [personal, setPersonal] = useState(!!item?.ownerUserId);
  const [fields, setFields] = useState<ClinicalField[]>(item?.fields ?? initialFields[kind] ?? []);
  const client = useQueryClient();
  const save = useMutation({ mutationFn: () => {
    const body: SaveClinicalCatalogRequest = { kind, title, folder, content, personal, fields, revision: item?.revision };
    return item?.id ? DefaultService.clinicalCatalogUpdate(item.id, body) : DefaultService.clinicalCatalogCreate(body);
  }, onSuccess: async saved => { await client.invalidateQueries({ queryKey: ["clinical-catalog"] }); onSaved(saved); }, onSettled: () => onSaving(false) });
  function update(index: number, patch: Partial<ClinicalField>) { onDirty(); setFields(previous => previous.map((field, i) => i === index ? { ...field, ...patch } : field)); }
  const editorTitle = kind === "Document" ? (item?.id ? "Editar receituário" : "Novo receituário") : "Cadastro clínico";
  const form = <form className="space-y-4" onChange={onDirty} onSubmit={e => { e.preventDefault(); onSaving(true); save.mutate(); }}><fieldset disabled={save.isPending} className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2"><label>Título<input className="input-field" required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} /></label><label>Pasta<input className="input-field" required list="clinical-folder-options" maxLength={120} value={folder} onChange={e => setFolder(e.target.value)} /><datalist id="clinical-folder-options">{folderOptions.map(name => <option key={name} value={name} />)}</datalist></label></div>
    <label className="block">Disponibilidade<select className="input-field" disabled={!!item?.id} value={personal ? "personal" : "clinic"} onChange={e => setPersonal(e.target.value === "personal")}><option value="clinic">Compartilhado com a clínica</option>{isDoctor && <option value="personal">Somente eu</option>}</select></label>
    {kind === "Document" ? <PrescriptionContentField label="Conteúdo / orientações" value={content} onChange={value => { onDirty(); setContent(value); }} /> : <label className="block">Conteúdo / orientações<textarea className={`input-field ${inline ? "min-h-80" : "min-h-40"}`} maxLength={30000} value={content} onChange={e => setContent(e.target.value)} /></label>}
    {kind === "Document" && <p className="text-xs text-[var(--muted)]">Variáveis disponíveis: {"{{paciente}}, {{medico}}, {{crm}}, {{data}}, {{clinica}}"}. Texto simples; a prévia de impressão preserva as quebras de linha.</p>}
    <fieldset className="space-y-3"><legend className="font-semibold">Campos estruturados</legend>{fields.map((field, index) => <div key={index} className="rounded-md border border-[var(--border)] p-4 space-y-3"><div className="grid gap-3 md:grid-cols-3"><label>Nome do campo {index + 1}<input className="input-field" required maxLength={120} value={field.label ?? ""} onChange={e => update(index, { label: e.target.value })} /></label><label>Tipo<select className="input-field" value={field.type ?? "Text"} onChange={e => update(index, { type: e.target.value, min: null, max: null, weight: null, alertBelow: null, alertAbove: null, defaultValue: null })}><option value="Text">Texto</option><option value="Number">Número</option><option value="Boolean">Sim / não</option></select></label><label>Unidade<input className="input-field" maxLength={30} value={field.unit ?? ""} onChange={e => update(index, { unit: e.target.value })} /></label></div>{field.type === "Number" && <div className="grid gap-3 md:grid-cols-2">{(["min", "max", "alertBelow", "alertAbove"] as const).map(bound => <label key={bound}>{{ min: "Valor mínimo aceito", max: "Valor máximo aceito", alertBelow: "Alertar abaixo de", alertAbove: "Alertar acima de" }[bound]}<input className="input-field" type="number" step="any" value={field[bound] ?? ""} onChange={e => update(index, { [bound]: e.target.value === "" ? null : Number(e.target.value) })} /></label>)}</div>}<div className="grid gap-3 md:grid-cols-2"><label>Valor padrão{field.type === "Boolean" ? <select className="input-field" value={field.defaultValue ?? ""} onChange={e => update(index, { defaultValue: e.target.value })}><option value="">Não informado</option><option value="true">Sim</option><option value="false">Não</option></select> : <input className="input-field" type={field.type === "Number" ? "number" : "text"} step="any" maxLength={10000} value={field.defaultValue ?? ""} onChange={e => update(index, { defaultValue: e.target.value })} />}</label>{field.type !== "Text" && <label>Peso na pontuação (opcional)<input className="input-field" type="number" step="any" min={-1000} max={1000} value={field.weight ?? ""} onChange={e => update(index, { weight: e.target.value === "" ? null : Number(e.target.value) })} /></label>}</div><div className="flex justify-between"><label><input type="checkbox" checked={field.required ?? false} onChange={e => update(index, { required: e.target.checked })} /> Obrigatório</label><button type="button" className="btn btn-ghost btn-sm" onClick={() => { onDirty(); setFields(fields.filter((_, i) => i !== index)); }}>Remover campo</button></div></div>)}<button type="button" className="btn btn-ghost" disabled={fields.length >= 100} onClick={() => { onDirty(); setFields([...fields, { label: "", type: "Text", required: false }]); }}>Adicionar campo</button></fieldset>
    <p className="text-xs text-[var(--muted)]">Faixas e critérios são definidos pela clínica. A pontuação soma respostas numéricas multiplicadas pelos pesos configurados (sim = 1, não = 0). Alertas usam somente as faixas cadastradas; não fornecem diagnóstico.</p>
    {save.error && <p role="alert">{apiErrorMessage(save.error, "Não foi possível salvar. Confira os campos e tente novamente.")}</p>}
    <div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" disabled={save.isPending} onClick={onClose}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar cadastro"}</button></div>
  </fieldset></form>;
  return inline ? <section aria-label="Editor de receituário" className="panel min-w-0 rounded-lg p-5"><h2 className="mb-4 font-semibold">{editorTitle}</h2>{form}</section> : <Modal title={editorTitle} size="xl" onClose={onClose}>{form}</Modal>;
}
