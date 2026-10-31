import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Field } from "@/components/ui/field";
import { CommissionRule, type CommissionSettings } from "@/generated";
import { DefaultService } from "@/services/api";
import { apiErrorMessage } from "@/lib/api-error";

const rules = [
  { key: "appointmentSale", label: "Venda de consulta", description: "Sinal recebido no agendamento pela recepção responsável.", bases: [CommissionRule.basis.DEPOSIT, CommissionRule.basis.CONSULTATION] },
  { key: "completedAppointment", label: "Consulta realizada", description: "Comissão da secretaria pela consulta concluída.", bases: [CommissionRule.basis.CONSULTATION] },
  { key: "productReferral", label: "Indicação de produtos", description: "Profissional que indicou, atendendo ou não na clínica.", bases: [CommissionRule.basis.PRODUCT_RECEIVED, CommissionRule.basis.PRODUCT_SALE] },
] as const;
const basisLabels = { Deposit: "Valor do sinal", Consultation: "Valor da consulta", ProductReceived: "Valor recebido pelo produto", ProductSale: "Valor da venda do produto" };

export function CommissionSettingsPanel() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["commission-settings"], queryFn: () => DefaultService.commissionSettingsGet() });
  const [draft, setDraft] = useState<CommissionSettings | null>(null);
  const settings = draft ?? query.data;
  const save = useMutation({
    mutationFn: (value: CommissionSettings) => DefaultService.commissionSettingsUpdate(value),
    onSuccess: (value) => { queryClient.setQueryData(["commission-settings"], value); setDraft(null); },
  });
  function update(key: keyof CommissionSettings, patch: Partial<CommissionRule>) {
    if (!settings) return;
    save.reset();
    setDraft({ ...settings, [key]: { ...settings[key], ...patch } });
  }

  return (
    <div>
      <h3 className="text-base font-semibold text-[var(--ink)]">Comissões</h3>
      <p className="mt-1 text-sm text-[var(--muted)]">Personalize as regras da clínica. Salvar esta configuração ainda não gera comissões, relatórios ou pagamentos automáticos.</p>
      {query.isPending ? <p role="status" className="mt-4 text-sm">Carregando regras...</p> : null}
      {query.isError ? <div className="mt-4"><p role="alert">Não foi possível carregar as regras.</p><button type="button" className="btn btn-ghost btn-sm" onClick={() => void query.refetch()}>Tentar novamente</button></div> : null}
      {settings ? (
        <form className="mt-4" onSubmit={(event) => { event.preventDefault(); save.mutate(settings); }}>
          <fieldset disabled={save.isPending} className="min-w-0">
            {rules.map(({ key, label, description, bases }) => {
              const rule = settings[key];
              const percentage = rule.mode === CommissionRule.mode.PERCENTAGE;
              return (
                <fieldset key={key} className="min-w-0 border-t border-[var(--border)] py-4">
                  <legend className="pr-2 text-sm font-semibold">{label}</legend>
                  <p className="mb-3 text-sm text-[var(--muted)]">{description}</p>
                  <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={rule.enabled} onChange={(event) => update(key, { enabled: event.target.checked })} />Ativar {label.toLowerCase()}</label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Tipo"><select className="field-input" disabled={!rule.enabled} value={rule.mode} onChange={(event) => update(key, { mode: event.target.value as CommissionRule.mode })}><option value="Fixed">Valor fixo (R$)</option><option value="Percentage">Percentual (%)</option></select></Field>
                    <Field label={percentage ? "Percentual (%)" : "Valor por ocorrência (R$)"}><input className="field-input" type="number" step="0.01" min={rule.enabled ? "0.01" : "0"} max={percentage ? "100" : "1000000"} required disabled={!rule.enabled} value={rule.value} onChange={(event) => update(key, { value: event.target.value === "" ? 0 : Number(event.target.value) })} /></Field>
                    {percentage ? <Field label="Base de cálculo"><select className="field-input" disabled={!rule.enabled} value={rule.basis} onChange={(event) => update(key, { basis: event.target.value as CommissionRule.basis })}>{bases.map((basis) => <option key={basis} value={basis}>{basisLabels[basis]}</option>)}</select></Field> : null}
                  </div>
                </fieldset>
              );
            })}
            {save.isError ? <p role="alert" className="mb-3 text-sm text-danger">{apiErrorMessage(save.error, "Não foi possível salvar as regras. Tente novamente.")}</p> : null}
            {save.isSuccess ? <p role="status" className="mb-3 text-sm">Regras de comissão salvas.</p> : null}
            <button type="submit" className="btn btn-primary btn-sm" disabled={save.isPending || !draft}>{save.isPending ? "Salvando..." : "Salvar regras"}</button>
          </fieldset>
        </form>
      ) : null}
    </div>
  );
}
