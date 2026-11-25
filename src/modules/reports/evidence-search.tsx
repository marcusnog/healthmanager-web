import { useEffect, useRef, useState } from "react";
import { ReportsService, type EvidenceDocument, type EvidenceHit } from "@/generated";
import { patientsDocumentsDownload } from "@/services/api";
import { triggerBrowserDownload } from "@/lib/formatters";
import { apiErrorMessage } from "@/lib/api-error";

type Progress = {
  terms: string; source: "fichas" | "documentos"; after?: string; patients: number; documents: number;
  manual: number; pending: EvidenceDocument[]; hits: (EvidenceHit & { attachment: boolean })[]; done: boolean;
};

// Keep the last completed batch in this tab when reauthentication unmounts Reports.
let checkpoint: { owner: string; result: Progress } | undefined;
export function clearEvidenceSearch() { checkpoint = undefined; }

export function EvidenceSearch({ owner }: { owner: string }) {
  const [progress, setProgress] = useState<Progress | undefined>(() => checkpoint?.owner === owner ? checkpoint.result : undefined);
  const [terms, setTerms] = useState(progress?.terms ?? "PLUS, NEXT");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [fileError, setFileError] = useState("");
  async function download(patientId: string, recordId: string, name: string) {
    setFileError("");
    try { triggerBrowserDownload(await patientsDocumentsDownload(patientId, recordId), name); }
    catch (err) { setFileError(apiErrorMessage(err, "Não foi possível baixar o original.")); }
  }
  const active = useRef(0);
  useEffect(() => () => { active.current++; }, []);
  function pause() { active.current++; setRunning(false); }
  async function run(initial: Progress) {
    const id = ++active.current;
    let result = initial;
    checkpoint = { owner, result };
    setProgress(result); setRunning(true); setError("");
    try {
      while (!result.done && active.current === id) {
        const part = await ReportsService.reportsSearchEvidence({ terms: result.terms, source: result.source, after: result.after });
        if (active.current !== id) return;
        const files = result.source === "documentos";
        result = { ...result, patients: result.patients + (files ? 0 : part.inspected),
          documents: result.documents + (files ? part.inspected : 0), manual: result.manual + part.manual,
          pending: result.pending.concat(part.manualDocuments ?? []),
          hits: result.hits.concat(part.hits.map(hit => ({ ...hit, attachment: files }))), done: files && !part.next,
          source: !files && !part.next ? "documentos" : result.source, after: part.next ?? undefined };
        checkpoint = { owner, result };
        setProgress(result);
      }
    } catch (err) {
      if (active.current === id) setError(apiErrorMessage(err, "A busca foi interrompida. Você pode continuar a partir do último lote."));
    } finally {
      if (active.current === id) setRunning(false);
    }
  }
  const hits = progress?.hits ?? [];
  return <details className="panel min-w-0 p-5 text-sm">
    <summary className="cursor-pointer font-semibold">Buscar evidências nas fichas e anexos</summary>
    <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={e => {
      e.preventDefault(); setPage(0);
      void run({ terms: terms.trim(), source: "fichas", patients: 0, documents: 0, manual: 0, pending: [], hits: [], done: false });
    }}>
      <label className="field-label">Termos separados por vírgula<input className="field-input mt-1" value={terms}
        disabled={running} required maxLength={260} onChange={e => setTerms(e.target.value)} /></label>
      <button className="btn btn-primary" disabled={running || !terms.trim()}>Buscar evidências</button>
      {running && <button type="button" className="btn btn-ghost" onClick={pause}>Pausar busca</button>}
      {!running && progress && !progress.done && progress.terms === terms.trim() &&
        <button type="button" className="btn btn-ghost" onClick={() => void run(progress)}>Continuar busca</button>}
    </form>
    {error && <p role="alert" className="field-error mt-3">{error}</p>}
    {progress && <div className="mt-3 grid gap-3">
      <p role="status">{progress.done ? "Busca concluída" : running ? "Buscando" : "Busca pausada"} · {progress.patients} fichas · {progress.documents} anexos · {hits.length} ocorrências.</p>
      {!!progress.manual && <p>{progress.manual} anexo(s) com conteúdo pendente de leitura manual. Os nomes desses arquivos também foram pesquisados.</p>}
      {!!progress.pending.length && <details><summary className="cursor-pointer">Arquivos para revisão manual ({progress.pending.length})</summary>
        <ul aria-label="Anexos para revisão manual">{progress.pending.map(file => <li key={file.recordId} className="py-2">
          <strong>{file.patient}</strong> · {file.fileName} <button className="btn btn-ghost" type="button"
            onClick={() => void download(file.patientId, file.recordId, file.fileName)}>Baixar original</button>
          <small className="block">Referência {file.recordId}</small></li>)}</ul></details>}
      {fileError && <p role="alert">{fileError}</p>}
      {progress.done && !hits.length && <p>Nenhuma ocorrência. Confira a grafia ou tente outro termo.</p>}
      {!!hits.length && <><ul className="divide-y" aria-label="Ocorrências">{hits.slice(page * 25, (page + 1) * 25).map(hit =>
        <li key={hit.origin + hit.recordId} className="py-3"><strong>{hit.patient}</strong> · {hit.origin}
          <p className="break-words">{hit.excerpt}</p><small>Referência {hit.recordId}</small>
          {hit.attachment && <button className="btn btn-ghost" type="button"
            onClick={() => void download(hit.patientId, hit.recordId, hit.origin)}>Baixar original</button>}</li>)}</ul>
        {hits.length > 25 && <div className="flex items-center gap-3"><button className="btn btn-ghost" disabled={!page}
          onClick={() => setPage(page - 1)}>Ocorrências anteriores</button><span>Página {page + 1} de {Math.ceil(hits.length / 25)}</span>
          <button className="btn btn-ghost" disabled={(page + 1) * 25 >= hits.length} onClick={() => setPage(page + 1)}>Próximas ocorrências</button></div>}</>}
    </div>}
  </details>;
}
