import type { ClinicalField } from "@/generated";

export function summarizeClinicalValues(fields: ClinicalField[], values: Record<string, string>) {
  let score: number | null = null;
  const alerts: string[] = [];
  for (const field of fields) {
    const raw = values[field.label ?? ""];
    if (!raw?.trim()) continue;
    const value = field.type === "Boolean" ? (raw === "true" ? 1 : raw === "false" ? 0 : NaN) : Number(raw);
    if (!Number.isFinite(value) || field.type === "Text") continue;
    if (field.weight != null) score = (score ?? 0) + value * field.weight;
    if ((field.alertBelow != null && value < field.alertBelow) || (field.alertAbove != null && value > field.alertAbove)) alerts.push(`${field.label}: fora da faixa configurada pela clínica.`);
  }
  return { score, alerts };
}

export function ClinicalValuesSummary({ fields, values }: { fields: ClinicalField[]; values: Record<string, string> }) {
  const { score, alerts } = summarizeClinicalValues(fields, values);
  if (score === null && !alerts.length) return null;
  return <div className="my-3 rounded-md border border-[var(--border)] p-3 text-sm">
    {score !== null && <p>Pontuação configurada: {score.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}</p>}
    {alerts.map(alert => <p key={alert}>{alert}</p>)}
    <p className="text-xs text-[var(--muted)]">Critérios cadastrados pela clínica. Revise as respostas; este resultado não fornece diagnóstico.</p>
  </div>;
}
