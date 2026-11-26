"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ReportsService, type ReportDirectory, type ReportMetric, type SourceDefinition } from "@/generated";
import { apiErrorMessage } from "@/lib/api-error";
import { readAuthSession } from "@/lib/auth-session";
import "@/services/api";
import { EvidenceSearch } from "./evidence-search";

const sourceDates: Record<string, string> = {
  reservas: "pagamento da reserva", espera: "entrada na fila", horarios: "atendimento",
  indicacoes: "indicação", programas: "venda do contrato", servicos: "contratação do serviço",
  parcelas: "contratação", vendas: "venda", etapas: "dia previsto para aplicação",
  interrupcoes: "interrupção do tratamento", insumos: "consumo",
};

function metricText(metric: ReportMetric) {
  if (metric.value == null) return "Indefinido";
  if (metric.unit === "brl") return metric.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const suffix: Record<string, string> = { percentual: "%", dias: " dias", h: " h", min: " min" };
  return metric.value.toLocaleString("pt-BR", { maximumFractionDigits: metric.label === "Consumo" ? 6 : 2 }) + (suffix[metric.unit] ?? "");
}

function SourceEditor({ source, from, to, clinic }: { source: SourceDefinition; from: string; to: string; clinic: string }) {
  const [csv, setCsv] = useState(source.header.join(";") + "\n");
  const [page, setPage] = useState(1);
  const [fileError, setFileError] = useState("");
  const client = useQueryClient();
  const existing = useQuery({
    queryKey: ["report-source", clinic, source.id, from, to, page],
    queryFn: () => ReportsService.reportsReadSource(source.id, from, to, page),
  });
  const save = useMutation({
    mutationFn: () => ReportsService.reportsImportSource(source.id, { csv }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["report-source", clinic, source.id] }),
        client.invalidateQueries({ queryKey: ["report-result", clinic] }),
      ]);
    },
  });
  function change(text: string) { setCsv(text); setFileError(""); save.reset(); }
  return <div className="mt-4 grid gap-4">
    <p>Informe uma linha por registro. A coluna <strong>data</strong> corresponde a {sourceDates[source.id]}. Use uma referência estável. Importar novamente a mesma referência atualiza o registro da clínica.</p>
    <details><summary className="cursor-pointer font-medium">Formato das colunas</summary>
      <ul className="mt-2 list-disc pl-5">
        <li>referencia — identificador único da linha na fonte</li><li>data — AAAA-MM-DD</li>
        {source.fields.map(f => <li key={f.key}>{f.key} — {f.options?.join(" / ") ?? ({ data: "AAAA-MM-DD", hora: "HH:mm", inteiro: "número inteiro positivo", valor: "reais, até duas casas decimais", quantidade: "quantidade positiva" }[f.type] ?? "texto")}{!f.required && " (opcional)"}</li>)}
      </ul>
    </details>
    <label className="field-label">Abrir CSV em UTF-8
      <input className="field-input mt-1" type="file" accept=".csv,text/csv" onChange={async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 4_000_000) { setFileError("Selecione um arquivo de até 4 MB."); return; }
        try { change(await file.text()); } catch { setFileError("Não foi possível ler o arquivo."); }
      }} />
    </label>
    <label className="field-label">Registros para importar
      <textarea className="field-input mt-1 w-full font-mono" rows={5} spellCheck={false} value={csv} onChange={e => change(e.target.value)} />
    </label>
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className="btn btn-primary" disabled={save.isPending || !csv.trim()} onClick={() => save.mutate()}>{save.isPending ? "Importando…" : "Importar registros"}</button>
      {save.isSuccess && <span role="status">{save.data} registro(s) importado(s).</span>}
    </div>
    {(fileError || save.isError) && <p role="alert" className="field-error">{fileError || apiErrorMessage(save.error, "Confira os dados e tente importar novamente.")}</p>}
    <div className="border-t border-slate-200 pt-3">
      <h4 className="font-medium">Registros desta fonte no período</h4>
      {existing.isPending && <p role="status">Carregando registros…</p>}
      {existing.isError && <p role="alert">Não foi possível carregar os registros.</p>}
      {existing.data && <>
        <pre className="my-2 max-h-48 overflow-auto rounded border border-slate-200 p-3 text-xs" tabIndex={0}>{existing.data.csv}</pre>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-ghost" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</button>
          <span>Página {page}</span>
          <button type="button" className="btn btn-ghost" disabled={!existing.data.hasMore} onClick={() => setPage(page + 1)}>Próxima</button>
        </div>
      </>}
    </div>
  </div>;
}

function ReportBrowser({ directory, clinic }: { directory: ReportDirectory; clinic: string }) {
  const [id, setId] = useState(directory.reports[0].id);
  const [from, setFrom] = useState(directory.today.slice(0, 7) + "-01");
  const [to, setTo] = useState(directory.today);
  const [editing, setEditing] = useState(false);
  const report = directory.reports.find(r => r.id === id)!;
  const groups = [...new Set(directory.reports.map(r => r.group))];
  const source = directory.sources.find(s => s.id === report.source);
  const span = (Date.parse(to) - Date.parse(from)) / 86400000;
  const valid = Number.isFinite(span) && span >= 0 && span < 366;
  const currentBalance = id === "aplicacoes-pendentes";
  const start = currentBalance ? directory.today : from;
  const end = currentBalance ? directory.today : to;
  const result = useQuery({ queryKey: ["report-result", clinic, id, start, end],
    queryFn: () => ReportsService.reportsRun(id, start, end), enabled: currentBalance || valid });
  const rows = result.data?.rows;
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  async function exportReport(format: "pdf" | "excel") {
    if (!rows?.length) return;
    setExporting(true);
    setExportError("");
    try {
      const headers = [id === "novos-agendamentos" ? "Paciente / data do sinal" : "Grupo", ...rows[0].metrics.map(m => m.label)];
      const period = `${start.split("-").reverse().join("/")} a ${end.split("-").reverse().join("/")}`;
      if (format === "pdf") {
        const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
        const pdf = new jsPDF();
        pdf.setFontSize(16); pdf.text(report.title, 14, 18);
        pdf.setFontSize(10); pdf.text(`Período: ${period}`, 14, 25);
        autoTable(pdf, { startY: 30, head: [headers], body: rows.map(row => [row.label, ...row.metrics.map(metricText)]) });
        pdf.save(`${id}-${start}-${end}.pdf`);
      } else {
        const { Workbook } = await import("exceljs");
        const workbook = new Workbook();
        const sheet = workbook.addWorksheet("Relatório");
        sheet.addRow([report.title]); sheet.addRow([`Período: ${period}`]); sheet.addRow(headers);
        rows.forEach(row => sheet.addRow([row.label, ...row.metrics.map(m => m.value ?? "Indefinido")]));
        sheet.columns.forEach((column, index) => { column.width = index === 0 ? 45 : 22; });
        rows[0].metrics.forEach((metric, index) => { if (metric.unit === "brl") sheet.getColumn(index + 2).numFmt = '"R$" #,##0.00'; });
        const bytes = await workbook.xlsx.writeBuffer();
        const url = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
        const link = document.createElement("a"); link.href = url; link.download = `${id}-${start}-${end}.xlsx`; link.click(); URL.revokeObjectURL(url);
      }
    } catch { setExportError("Não foi possível exportar o relatório. Tente novamente."); }
    finally { setExporting(false); }
  }
  function select(next: string) { setId(next); setEditing(false); }
  return <div className="grid min-w-0 gap-6">
    <div className="panel grid items-end gap-4 p-5 sm:grid-cols-2 xl:grid-cols-[1fr_1.4fr_10rem_10rem]">
      <label className="field-label">Grupo<select className="field-input mt-1" value={report.group} onChange={e => select(directory.reports.find(r => r.group === e.target.value)!.id)}>
        {groups.map(g => <option key={g}>{g}</option>)}</select></label>
      <label className="field-label">Relatório<select className="field-input mt-1" value={id} onChange={e => select(e.target.value)}>
        {directory.reports.filter(r => r.group === report.group).map(r => <option value={r.id} key={r.id}>{r.title}</option>)}</select></label>
      <label className="field-label">De<input className="field-input mt-1" type="date" disabled={currentBalance} value={start} onChange={e => setFrom(e.target.value)} /></label>
      <label className="field-label">Até<input className="field-input mt-1" type="date" disabled={currentBalance} value={end} onChange={e => setTo(e.target.value)} /></label>
    </div>
    {!currentBalance && !valid && <p role="alert" className="field-error">Selecione um período válido de até 366 dias.</p>}
    <section className="panel min-w-0 p-5" aria-labelledby="report-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="report-title" className="text-xl font-semibold">{report.title}</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost btn-sm" disabled={!rows?.length || exporting || result.isFetching} onClick={() => exportReport("pdf")}>Exportar PDF</button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={!rows?.length || exporting || result.isFetching} onClick={() => exportReport("excel")}>Exportar Excel</button>
        </div>
      </div>
      {exportError && <p role="alert" className="field-error">{exportError}</p>}
      <p className="mt-1 text-slate-600">{report.purpose}</p>
      <p className="my-4 max-w-4xl text-sm text-slate-600">{report.calculation}</p>
      {(valid || currentBalance) && <>
        {result.isPending && <p role="status">Calculando relatório…</p>}
        {result.isError && <p role="alert">Falha ao consultar o relatório. <button type="button" className="btn btn-ghost" onClick={() => result.refetch()}>Tentar novamente</button></p>}
        {rows?.length === 0 && <p role="status">Nenhum registro encontrado para este cálculo.</p>}
        {!!rows?.length && <div className="overflow-x-auto" tabIndex={0} aria-label="Resultados do relatório">
          <table className="w-full text-left text-sm"><caption className="sr-only">{report.title}</caption>
            <thead className="border-y border-slate-200 bg-slate-50"><tr><th scope="col" className="p-3">{id === "novos-agendamentos" ? "Paciente / data do sinal" : "Grupo"}</th>{rows[0].metrics.map(m => <th scope="col" key={m.label} className="p-3 text-right">{m.label}</th>)}</tr></thead>
            <tbody>{rows.map((row, index) => <tr key={index} className="border-b border-slate-200"><th scope="row" className="p-3 font-medium">{row.label}</th>{row.metrics.map(m => <td key={m.label} className="whitespace-nowrap p-3 text-right tabular-nums">{metricText(m)}</td>)}</tr>)}</tbody>
          </table>
        </div>}
      </>}
    </section>
    {source && valid && <section className="panel min-w-0 p-5 text-sm">
      {source.id !== "vendas" && <p className="mb-2">Origem no CRM: Pacientes → Acompanhamento. Os registros do paciente entram neste cálculo junto com o histórico importado.</p>}
      <button type="button" className="btn btn-ghost" aria-expanded={editing} onClick={() => setEditing(!editing)}>{editing ? "Fechar fonte" : "Consultar ou importar dados"} · {source.title}</button>
      {editing && <SourceEditor key={[source.id, from, to].join("/")} source={source} from={from} to={to} clinic={clinic} />}
    </section>}
  </div>;
}

export function ReportsPanel() {
  const session = readAuthSession();
  const clinic = session?.clinicId ?? "";
  const owner = JSON.stringify([clinic, session?.email]);
  const directory = useQuery({ queryKey: ["report-directory", clinic], queryFn: () => ReportsService.reportsDirectory() });
  if (directory.isPending) return <p role="status">Carregando relatórios…</p>;
  if (directory.isError) return <p role="alert">Não foi possível abrir os relatórios. <button className="btn btn-ghost" onClick={() => directory.refetch()}>Tentar novamente</button></p>;
  return <div className="grid gap-5"><ReportBrowser directory={directory.data} clinic={clinic} /><EvidenceSearch key={owner} owner={owner} /></div>;
}
