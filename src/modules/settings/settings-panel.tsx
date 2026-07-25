import { useEffect, useState } from "react";
import { Field } from "@/components/ui/field";
import { DefaultService } from "@/services/api";
import type { TenantSettingsResponse } from "@/generated";

export function SettingsPanel({ role }: { role: string }) {
  return (
    <section className="panel rounded-lg p-6">
      <TenantSettingsForm canEdit={role === "Admin"} />
      <ChangePasswordForm />
    </section>
  );
}
function TenantSettingsForm({ canEdit }: { canEdit: boolean }) {
  const [settings, setSettings] = useState<TenantSettingsResponse | null>(null);
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("18:00");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    DefaultService.tenantSettingsGet()
      .then((value) => {
        setSettings(value);
        const hours = JSON.parse(value.businessHoursJson ?? "{}") as { start?: string; end?: string };
        setStart(hours.start ?? "08:00");
        setEnd(hours.end ?? "18:00");
      })
      .catch((error: unknown) => setStatus(error instanceof Error ? error.message : "Erro ao carregar configuracoes."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!settings?.name || !settings.timezone) return;
    setLoading(true);
    setStatus(null);
    try {
      const updated = await DefaultService.tenantSettingsUpdate({
        name: settings.name,
        timezone: settings.timezone,
        businessHoursJson: JSON.stringify({ start, end }),
        cnpj: settings.cnpj,
        email: settings.email,
        phone: settings.phone,
        address: settings.address,
      });
      setSettings(updated);
      setStatus("Configuracoes salvas.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Erro ao salvar configuracoes.");
    } finally {
      setLoading(false);
    }
  }

  const set = (field: keyof TenantSettingsResponse, value: string) =>
    setSettings((current) => current ? { ...current, [field]: value } : current);

  return (
    <div>
      <p className="label">Tenant</p>
      <h3 className="mt-2 text-2xl font-semibold">Configuracoes da clinica</h3>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {canEdit ? "Estas informacoes valem para toda a clinica." : "Somente administradores podem alterar estas informacoes."}
      </p>
      {settings && (
        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <Field label="Nome"><input className="field-input" disabled={!canEdit} required value={settings.name ?? ""} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Identificador"><input className="field-input" disabled value={settings.slug ?? ""} /></Field>
          <Field label="CNPJ"><input className="field-input" disabled={!canEdit} value={settings.cnpj ?? ""} onChange={(e) => set("cnpj", e.target.value)} /></Field>
          <Field label="E-mail"><input className="field-input" disabled={!canEdit} type="email" value={settings.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Telefone"><input className="field-input" disabled={!canEdit} value={settings.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Fuso horario"><input className="field-input" disabled={!canEdit} required value={settings.timezone ?? ""} onChange={(e) => set("timezone", e.target.value)} /></Field>
          <Field label="Inicio do expediente"><input className="field-input" disabled={!canEdit} type="time" required value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="Fim do expediente"><input className="field-input" disabled={!canEdit} type="time" required value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
          <div className="md:col-span-2"><Field label="Endereco"><input className="field-input" disabled={!canEdit} value={settings.address ?? ""} onChange={(e) => set("address", e.target.value)} /></Field></div>
          {status && <p className="text-sm text-[var(--muted)]">{status}</p>}
          {canEdit && <button className="btn btn-primary justify-self-start md:col-span-2" disabled={loading} type="submit">{loading ? "Salvando..." : "Salvar configuracoes"}</button>}
        </form>
      )}
      {!settings && <p className="mt-6 text-sm text-[var(--muted)]">{loading ? "Carregando..." : status}</p>}
    </div>
  );
}
function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    if (newPassword !== confirmPassword) {
      setStatus({ type: "error", message: "Nova senha e confirmacao nao conferem." });
      return;
    }

    setLoading(true);
    try {
      await DefaultService.authChangePassword({ currentPassword, newPassword });
      setStatus({ type: "success", message: "Senha alterada com sucesso." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao alterar senha.";
      setStatus({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8">
      <h4 className="text-xl font-semibold">Alterar senha</h4>
      <form onSubmit={handleSubmit} className="mt-4 grid max-w-md gap-4">
        <Field label="Senha atual">
          <input
            className="field-input"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            minLength={8}
          />
        </Field>
        <Field label="Nova senha">
          <input
            className="field-input"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
        </Field>
        <Field label="Confirmar nova senha">
          <input
            className="field-input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
        </Field>
        {status && (
          <p className={status.type === "success" ? "text-sm text-[var(--success)]" : "text-sm text-[var(--danger)]"}>
            {status.message}
          </p>
        )}
        <button className="btn btn-primary self-start" type="submit" disabled={loading}>
          {loading ? "Alterando..." : "Alterar senha"}
        </button>
      </form>
    </div>
  );
}
