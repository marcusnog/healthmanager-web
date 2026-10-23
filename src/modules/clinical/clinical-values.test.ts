import { summarizeClinicalValues } from "./clinical-values";

it("uses only configured weights and answered fields, including false", () => {
  expect(summarizeClinicalValues([
    { label: "Número", type: "Number", weight: 2, alertAbove: 3 },
    { label: "Resposta", type: "Boolean", weight: 5 },
    { label: "Ausente", type: "Number", weight: 10 },
  ], { "Número": "4.5", "Resposta": "false" })).toEqual({ score: 9, alerts: ["Número: fora da faixa configurada pela clínica."] });
  expect(summarizeClinicalValues([{ label: "Sem peso", type: "Number" }], { "Sem peso": "20" }).score).toBeNull();
});
