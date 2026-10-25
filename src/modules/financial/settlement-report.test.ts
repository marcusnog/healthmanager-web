import { describe, expect, it, vi } from "vitest";
import { paymentInPeriod, printSettlementReport, settlementReportItems } from "./settlement-report";

const group = { professionalId: "1", professionalName: "<script>teste</script>", accrued: 50, paid: 50, outstanding: 0, items: [], settledItems: [
  { paymentId: "payment-1", patientName: "Paciente", amount: 50, paidAt: "2026-10-20T12:00:00Z", professionalPaidAt: "2026-10-23T12:00:00Z" },
] };

describe("relatório de repasses", () => {
  it("usa o mesmo dia local exibido na tela, inclusive perto da meia-noite", () => {
    const latePayment = new Date(2026, 9, 20, 23, 30).toISOString();
    expect(paymentInPeriod(latePayment, "2026-10-20", "2026-10-20")).toBe(true);
    expect(paymentInPeriod(latePayment, "2026-10-21", "2026-10-21")).toBe(false);
  });
  it("filtra o período de pagamentos sem incluir pendências", () => {
    expect(settlementReportItems(group, "2026-10-20", "2026-10-20")).toHaveLength(1);
    expect(settlementReportItems(group, "2026-10-21", "")).toHaveLength(0);
    expect(() => printSettlementReport(group, "2026-10-21", "")).toThrow("Nenhum repasse");
  });
  it("gera comprovante com total, datas e texto seguro", () => {
    const doc = document.implementation.createHTMLDocument();
    const open = vi.spyOn(window, "open").mockReturnValue({ document: doc, print: vi.fn() } as unknown as Window);
    printSettlementReport(group, "", "");
    expect(doc.body.textContent).toContain(group.professionalName);
    expect(doc.querySelector("script")).toBeNull();
    expect(doc.body.textContent).toContain("Total repassado:");
    expect(doc.querySelectorAll("tbody tr")).toHaveLength(1);
    open.mockRestore();
  });
});
