import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PatientCareService, type CareItem, type CareWorkspace } from "@/generated";
import { Modal } from "@/components/ui/modal";
import { apiErrorMessage } from "@/lib/api-error";

const sources: Record<string, string> = {
  espera: "Lista de espera", horarios: "Chegada e início da consulta", reservas: "Sinal da reserva",
  indicacoes: "Indicações de tratamento", programas: "Contratos de acompanhamento",
  servicos: "Serviços do contrato", parcelas: "Parcelas do contrato", etapas: "Etapas do tratamento",
  interrupcoes: "Interrupções de tratamento", insumos: "Consumo de insumos",
};
const labels: Record<string, string> = {
  consulta: "Consulta", medico: "Médico responsável", pagamento: "Pagamento de consulta recebido",
  titulo: "Conta a receber", aplicacao: "Aplicação realizada", programa: "Contrato de acompanhamento",
  saida: "Saída da fila", chegada: "Hora de chegada", inicio: "Início", tratamento: "Tratamento indicado",
  contratacao: "Contratação confirmada em", modalidade: "Modalidade", vencimento: "Vencimento", renovacao: "Renovação",
  abandono: "Abandono", servico: "Serviço contratado", categoria: "Categoria", quantidade: "Quantidade",
  previsto: "Previsão de atendimento", entrega: "Entrega realizada em", receita: "Receita líquida do lote (R$)",
  custo: "Custo direto do lote (R$)", protocolo: "Protocolo", insumo: "Material consumido", unidade: "Unidade de medida",
};
const dates: Record<string, string> = {
  espera: "Entrada na fila", indicacoes: "Data da indicação", programas: "Data da contratação",
  servicos: "Data da contratação do serviço", etapas: "Data prevista da aplicação", interrupcoes: "Data da interrupção",
};
const brDate = (iso: string) => iso.split("-").reverse().join("/");

export function PatientCareModal({ patientId, name, secretary, onClose }: {
  patientId: string; name: string; secretary: boolean; onClose: () => void;
}) {
  const [source, setSource] = useState("espera");
  const workspace = useQuery({
    queryKey: ["patient-care", patientId, source], queryFn: () => PatientCareService.patientCareRead(patientId, source),
  });
  return <Modal title={`Acompanhamento — ${name}`} size="lg" onClose={onClose}>
    <label className="field-label">Tipo de registro
      <select className="field-input" value={source} onChange={e => setSource(e.target.value)}>
        {Object.entries(sources).filter(([id]) => !secretary || id === "espera" || id === "horarios").map(([id, title]) =>
          <option key={id} value={id}>{title}</option>)}
      </select>
    </label>
    {workspace.isPending && <p role="status">Carregando acompanhamento…</p>}
    {workspace.isError && <p role="alert" className="field-error">Falha ao carregar o acompanhamento. <button className="btn btn-ghost" onClick={() => workspace.refetch()}>Tentar novamente</button></p>}
    {workspace.data && <CareEditor key={patientId + source} patientId={patientId} source={source} data={workspace.data} />}
  </Modal>;
}

function CareEditor({ patientId, source, data }: { patientId: string; source: string; data: CareWorkspace }) {
  const client = useQueryClient();
  const fresh = (): CareItem => ({ id: crypto.randomUUID(), revision: 0, date: data.today, fields: {}, links: {} });
  const [draft, setDraft] = useState<CareItem>(fresh);
  const [notice, setNotice] = useState("");
  const save = useMutation({
    mutationFn: (record: CareItem) => PatientCareService.patientCareSave(patientId, source, record.id, {
      revision: record.revision, date: record.date, fields: record.fields, links: record.links,
    }),
    onSuccess: async () => {
      await Promise.all([client.invalidateQueries({ queryKey: ["patient-care", patientId] }),
        client.invalidateQueries({ queryKey: ["report-result"] })]);
      setDraft(fresh()); setNotice("Registro salvo no acompanhamento.");
    },
    onError: () => { void client.invalidateQueries({ queryKey: ["patient-care", patientId, source] }); },
  });
  function change(key: string, value: string, group: "links" | "fields") {
    const entries = { ...draft[group] };
    if (value) entries[key] = value; else delete entries[key];
    const next = { ...draft, [group]: entries };
    if (group === "links" && value && ((source === "indicacoes" && key === "programa") || (source === "servicos" && key === "consulta"))) {
      next.fields = { ...next.fields };
      if (source === "indicacoes") delete next.fields.contratacao;
      else { delete next.fields.entrega; next.fields.categoria = "Consulta"; next.fields.quantidade = "1"; }
    }
    setDraft(next); setNotice(""); save.reset();
  }
  function summary(row: CareItem) {
    const links = data.links.map(link => link.options.find(o => o.id === row.links[link.key])?.label).filter(Boolean);
    const details = data.fields.filter(f => row.fields[f.key]).map(f =>
      `${labels[f.key]} · ${f.type === "data" ? brDate(row.fields[f.key]) : row.fields[f.key]}`);
    return [...links, ...details].join(" / ");
  }
  return <div className="mt-5 grid gap-5">
    <form onSubmit={e => { e.preventDefault(); setNotice(""); save.mutate(draft); }}>
      <fieldset disabled={save.isPending} className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-3 font-semibold">{draft.revision ? "Editar registro" : "Novo registro"}</legend>
        {dates[source] && <label className="field-label">{dates[source]}<input className="field-input" type="date" required
          value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} /></label>}
        {data.links.map(link => <label className="field-label" key={link.key}>{labels[link.key]}{!link.required && " (opcional)"}
          <select className="field-input" required={link.required} value={draft.links[link.key] ?? ""} onChange={e => change(link.key, e.target.value, "links")}>
            <option value="">{link.options.length ? "Selecione" : "Nenhum registro disponível"}</option>
            {link.options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>)}
        {source === "servicos" && draft.links.consulta && <p className="text-sm sm:col-span-2">Use a categoria Consulta e uma unidade. A conclusão na agenda registra a entrega.</p>}
        {source === "indicacoes" && draft.links.programa && <p className="text-sm sm:col-span-2">O contrato selecionado fornece a data de contratação.</p>}
        {data.fields.map(field => {
          if ((field.key === "contratacao" && draft.links.programa) || (field.key === "entrega" && draft.links.consulta)) return null;
          const numeric = ["inteiro", "valor", "quantidade"].includes(field.type);
          return <label className="field-label" key={field.key}>{labels[field.key]}{!field.required && " (opcional)"}
            {field.options?.length ? <select className="field-input" required={field.required} value={draft.fields[field.key] ?? ""} onChange={e => change(field.key, e.target.value, "fields")}>
              <option value="">Selecione</option>{field.options.map(o => <option key={o} value={o}>{o === "Avaliacao" ? "Avaliação física" : o}</option>)}
            </select> : <input className="field-input" required={field.required} maxLength={200}
              type={field.type === "hora" ? "time" : field.type === "data" ? "date" : numeric ? "number" : "text"}
              step={numeric ? ({ inteiro: "1", valor: "0.01", quantidade: "0.000001" }[field.type]) : undefined}
              min={numeric ? ({ inteiro: "1", valor: "0", quantidade: "0.000001" }[field.type]) : undefined}
              value={draft.fields[field.key] ?? ""} onChange={e => change(field.key, e.target.value, "fields")} />}
          </label>;
        })}
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button type="submit" className="btn btn-primary" disabled={data.links.some(l => l.required && !l.options.length)}>{save.isPending ? "Salvando…" : "Salvar registro"}</button>
          {!!draft.revision && <button type="button" className="btn btn-ghost" onClick={() => { setDraft(fresh()); save.reset(); }}>Cancelar edição</button>}
        </div>
      </fieldset>
    </form>
    {save.isError && <p className="field-error" role="alert">{apiErrorMessage(save.error, "Não foi possível salvar. Confira os dados. Em caso de conflito, abra a versão atual na lista.")}</p>}
    {notice && <p role="status">{notice}</p>}
    <section className="border-t pt-3"><h3 className="font-semibold">Registros do paciente</h3>
      {!data.records.length && <p className="mt-2 text-sm text-[var(--muted)]">Nenhum registro deste tipo.</p>}
      <ul className="divide-y">{data.records.map(row => <li key={row.id} className="flex items-center justify-between gap-3 py-2">
        <div><strong>{brDate(row.date)}</strong><p className="break-words text-sm">{summary(row)}</p></div>
        <button className="btn btn-ghost" type="button" disabled={save.isPending} onClick={() => { setDraft(row); setNotice(""); save.reset(); }}>Editar</button>
      </li>)}</ul>
    </section>
  </div>;
}
