import { useEffect, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import type { AppointmentResponse } from "@/generated";
import { DefaultService } from "@/services/api";
import { formatTime } from "@/lib/formatters";
import { apiErrorMessage } from "@/lib/api-error";
import { StatusBadge, resolveAppointmentStatus } from "@/components/ui/status-badge";

export function PrintDailyAgenda({ date, doctorId, doctorName, status, disabled }: {
  date: string;
  doctorId?: string;
  doctorName?: string;
  status?: Parameters<typeof DefaultService.appointmentsList>[4];
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<{ date: string; doctor: string; status?: string; items: AppointmentResponse[] } | null>(null);

  useEffect(() => {
    const clearReport = () => setReport(null);
    window.addEventListener("afterprint", clearReport);
    return () => window.removeEventListener("afterprint", clearReport);
  }, []);

  async function print() {
    setBusy(true);
    setError(null);
    try {
      const items: AppointmentResponse[] = [];
      for (let page = 1; ; page++) {
        const result = await DefaultService.appointmentsList(page, 100, date, doctorId, status);
        const batch = result.items ?? [];
        items.push(...batch);
        if (items.length >= (result.total ?? 0)) break;
        if (!batch.length) throw new Error("Não foi possível carregar a agenda completa. Tente novamente.");
      }
      items.sort((a, b) => new Date(a.startAt ?? 0).getTime() - new Date(b.startAt ?? 0).getTime());
      flushSync(() => setReport({ date, doctor: doctorId ? doctorName ?? "Médico selecionado" : "Todos", status, items }));
      window.print();
    } catch (cause) {
      setReport(null);
      setError(apiErrorMessage(cause, "Não foi possível preparar a impressão. Tente novamente."));
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button className="btn btn-ghost min-h-11" type="button" disabled={disabled || busy || !date} onClick={print}>
      {busy ? "Preparando impressão..." : "Imprimir agenda diária"}
    </button>
    {error && <p role="alert" className="text-sm">{error}</p>}
    {report && createPortal(<div id="daily-agenda-print">
      <style>{`
        #daily-agenda-print { display: none; }
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          body > :not(#daily-agenda-print) { display: none !important; }
          html, body { height: auto !important; overflow: visible !important; background: white !important; }
          #daily-agenda-print { display: block; color: black; font: 10pt Arial, sans-serif; }
          #daily-agenda-print h1 { font-size: 18pt; margin-bottom: 8pt; }
          #daily-agenda-print p { margin-bottom: 12pt; }
          #daily-agenda-print table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          #daily-agenda-print th, #daily-agenda-print td { border: 1px solid #aaa; padding: 6pt; text-align: left; overflow-wrap: anywhere; }
          #daily-agenda-print thead { display: table-header-group; }
          #daily-agenda-print tr { break-inside: avoid; }
          #daily-agenda-print span { color: black !important; background: transparent !important; padding: 0; }
        }
      `}</style>
      <h1>Agenda diária — {new Date(`${report.date}T12:00:00`).toLocaleDateString("pt-BR")}</h1>
      <p>Médico: {report.doctor} · Status: {report.status ? <StatusBadge variant={resolveAppointmentStatus(report.status)} /> : "Todos"} · {report.items.length} consulta(s)</p>
      {report.items.length ? <table>
        <thead><tr>{["Horário", "Paciente", "Médico", "Tipo", "Status"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{report.items.map((item, index) => <tr key={item.id ?? index}>
          <td>{item.startAt ? formatTime(item.startAt) : "—"}{item.endAt ? ` – ${formatTime(item.endAt)}` : ""}</td>
          <td>{item.patientName ?? "—"}</td><td>{item.doctorName ?? "—"}</td><td>{item.type ?? "—"}</td>
          <td><StatusBadge variant={resolveAppointmentStatus(item.status)} /></td>
        </tr>)}</tbody>
      </table> : <p>Nenhum agendamento para este dia com os filtros selecionados.</p>}
    </div>, document.body)}
  </>;
}
