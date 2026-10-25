import type { ProfessionalSettlementResponse } from "@/services/api";
import { formatCurrency } from "@/lib/formatters";

export function paymentInPeriod(paidAt: string, from: string, to: string) {
  const date = new Date(paidAt);
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return (!from || day >= from) && (!to || day <= to);
}

export function settlementReportItems(group: ProfessionalSettlementResponse, from: string, to: string) {
  return (group.settledItems ?? []).filter(item => item.professionalPaidAt &&
    paymentInPeriod(item.paidAt, from, to));
}

export function printSettlementReport(group: ProfessionalSettlementResponse, from: string, to: string) {
  const items = settlementReportItems(group, from, to);
  if (!items.length) throw new Error("Nenhum repasse realizado para o período de pagamentos selecionado.");
  const report = window.open("", "_blank");
  if (!report) throw new Error("Permita a abertura de janelas para gerar o relatório.");
  report.opener = null;
  const doc = report.document;
  doc.title = `Comprovante de repasses - ${group.professionalName}`;
  doc.documentElement.lang = "pt-BR";
  const style = doc.createElement("style");
  style.textContent = "body{font:14px Arial,sans-serif;color:#222;margin:32px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:10px;border-bottom:1px solid #ddd}h1{font-size:22px}button{padding:10px;margin-bottom:20px}@media print{button{display:none}thead{display:table-header-group}tr{break-inside:avoid}}";
  doc.head.append(style);
  const add = (tag: string, text: string) => { const el = doc.createElement(tag); el.textContent = text; doc.body.append(el); return el; };
  const button = add("button", "Imprimir / Salvar em PDF");
  button.onclick = () => report.print();
  add("h1", "Comprovante de repasses");
  add("h2", group.professionalName);
  add("p", `Período dos pagamentos: ${from || "sem limite inicial"} a ${to || "sem limite final"}`);
  add("p", "Repasses registrados como realizados no sistema.");
  const table = doc.createElement("table");
  const header = table.createTHead().insertRow();
  ["Referência", "Paciente", "Pagamento recebido", "Repasse realizado", "Valor repassado"].forEach(label => { const th = doc.createElement("th"); th.textContent = label; header.append(th); });
  const body = table.createTBody();
  items.forEach(item => {
    const row = body.insertRow();
    [item.paymentId, item.patientName, new Date(item.paidAt).toLocaleString("pt-BR"), new Date(item.professionalPaidAt).toLocaleString("pt-BR"), formatCurrency(item.amount)].forEach(value => { row.insertCell().textContent = value; });
  });
  doc.body.append(table);
  add("h2", `Total repassado: ${formatCurrency(items.reduce((sum, item) => sum + item.amount, 0))}`);
  add("p", `${items.length} pagamento(s). Emitido em ${new Date().toLocaleString("pt-BR")}.`);
}
