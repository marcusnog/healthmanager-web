import { useEffect, useState } from "react";
import { Field } from "@/components/ui/field";
import { DefaultService } from "@/services/api";
import type { TenantSettingsResponse, TenantIntegrationResponse } from "@/generated";
import { PaymentGatewayConfigRequest } from "@/generated/models/PaymentGatewayConfigRequest";

export function SettingsPanel({ role }: { role: string }) {
  const canEdit = role === "Admin";
  return (
    <section className="panel rounded-lg p-6 space-y-10">
      <TenantSettingsForm canEdit={canEdit} />
      {canEdit && <IntegrationConfigPanel />}
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
      setStatus({ type: "error", message: err instanceof Error ? err.message : "Erro ao alterar senha." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8">
      <h4 className="text-xl font-semibold">Alterar senha</h4>
      <form onSubmit={handleSubmit} className="mt-4 grid max-w-md gap-4">
        <Field label="Senha atual">
          <input className="field-input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required minLength={8} />
        </Field>
        <Field label="Nova senha">
          <input className="field-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
        </Field>
        <Field label="Confirmar nova senha">
          <input className="field-input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} />
        </Field>
        <StatusMessage status={status} />
        <button className="btn btn-primary self-start" type="submit" disabled={loading}>
          {loading ? "Alterando..." : "Alterar senha"}
        </button>
      </form>
    </div>
  );
}

type IntegrationTab = "whatsapp" | "gateway" | "notification" | "branding";
const TABS: { key: IntegrationTab; label: string }[] = [
  { key: "whatsapp", label: "WhatsApp" },
  { key: "gateway", label: "Gateway de pagamento" },
  { key: "notification", label: "Notificacoes" },
  { key: "branding", label: "Branding" },
];

function IntegrationConfigPanel() {
  const [tab, setTab] = useState<IntegrationTab>("whatsapp");
  const [data, setData] = useState<TenantIntegrationResponse | null>(null);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    DefaultService.tenantIntegrationGet()
      .then(setData)
      .catch(() => setStatus({ type: "error", message: "Erro ao carregar integracoes." }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-[var(--muted)]">Carregando...</p>;

  return (
    <div>
      <p className="label">Integracoes</p>
      <h3 className="mt-2 text-2xl font-semibold">Configuracoes de integracao</h3>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Configure WhatsApp, gateway de pagamento, notificacoes e branding da clinica.
      </p>
      <div className="mt-4 flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`btn btn-sm ${tab === t.key ? "btn-brand-outline" : "btn-ghost"}`}
            onClick={() => { setTab(t.key); setStatus(null); }}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-6">
        <StatusMessage status={status} />
        {tab === "whatsapp" && <WhatsAppConfigForm data={data?.whatsApp} onSaved={setStatus} />}
        {tab === "gateway" && <PaymentGatewayConfigForm data={data?.paymentGateway} onSaved={setStatus} />}
        {tab === "notification" && <NotificationConfigForm data={data?.notification} onSaved={setStatus} />}
        {tab === "branding" && <BrandingConfigForm data={data?.branding} onSaved={setStatus} />}
      </div>
    </div>
  );
}

function StatusMessage({ status }: { status: { type: "success" | "error"; message: string } | null }) {
  if (!status) return null;
  return (
    <p className={status.type === "success" ? "text-sm text-[var(--success)]" : "text-sm text-[var(--danger)]"}>
      {status.message}
    </p>
  );
}

function WhatsAppConfigForm({ data, onSaved }: { data: TenantIntegrationResponse["whatsApp"]; onSaved: (s: { type: "success" | "error"; message: string } | null) => void }) {
  const [phoneNumberOfId, setPhoneNumberOfId] = useState(data?.phoneNumberOfId ?? "");
  const [accessToken, setAccessToken] = useState("");
  const [wABAId, setWABAId] = useState(data?.wABAId ?? "");
  const [isEnabled, setIsEnabled] = useState(data?.isEnabled ?? false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    onSaved(null);
    try {
      await DefaultService.tenantIntegrationWhatsappUpsert({
        phoneNumberOfId,
        accessToken,
        wABAId: wABAId || undefined,
        isEnabled,
      });
      onSaved({ type: "success", message: "WhatsApp configurado com sucesso." });
    } catch (err) {
      onSaved({ type: "error", message: err instanceof Error ? err.message : "Erro ao salvar." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
      <Field label="Phone Number ID">
        <input className="field-input" required value={phoneNumberOfId} onChange={(e) => setPhoneNumberOfId(e.target.value)} />
      </Field>
      <Field label="Access Token">
        <input className="field-input" required type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} />
      </Field>
      <Field label="WABA ID (opcional)">
        <input className="field-input" value={wABAId} onChange={(e) => setWABAId(e.target.value)} />
      </Field>
      <label className="flex items-center gap-2 mt-6">
        <input checked={isEnabled} className="h-4 w-4" onChange={(e) => setIsEnabled(e.target.checked)} type="checkbox" />
        <span className="text-sm">Habilitado</span>
      </label>
      <button className="btn btn-primary justify-self-start md:col-span-2" disabled={saving} type="submit">
        {saving ? "Salvando..." : "Salvar WhatsApp"}
      </button>
    </form>
  );
}

function PaymentGatewayConfigForm({ data, onSaved }: { data: TenantIntegrationResponse["paymentGateway"]; onSaved: (s: { type: "success" | "error"; message: string } | null) => void }) {
  const [provider, setProvider] = useState<string>(data?.provider ?? "Asaas");
  const [apiKey, setApiKey] = useState("");
  const [secret, setSecret] = useState("");
  const [environment, setEnvironment] = useState<string>(data?.environment ?? "Sandbox");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [isEnabled, setIsEnabled] = useState(data?.isEnabled ?? false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    onSaved(null);
    try {
      await DefaultService.tenantIntegrationPaymentGatewayUpsert({
        provider: provider as PaymentGatewayConfigRequest.provider,
        apiKey: apiKey || undefined,
        secret: secret || undefined,
        environment: environment as PaymentGatewayConfigRequest.environment,
        webhookSecret: webhookSecret || undefined,
        isEnabled,
      });
      onSaved({ type: "success", message: "Gateway configurado com sucesso." });
    } catch (err) {
      onSaved({ type: "error", message: err instanceof Error ? err.message : "Erro ao salvar." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
      <Field label="Provider">
        <select className="field-input" value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="Asaas">Asaas</option>
          <option value="MercadoPago">Mercado Pago</option>
          <option value="Stripe">Stripe</option>
        </select>
      </Field>
      <Field label="Ambiente">
        <select className="field-input" value={environment} onChange={(e) => setEnvironment(e.target.value)}>
          <option value="Sandbox">Sandbox</option>
          <option value="Production">Producao</option>
        </select>
      </Field>
      <Field label="API Key">
        <input className="field-input" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
      </Field>
      <Field label="Secret">
        <input className="field-input" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} />
      </Field>
      <Field label="Webhook Secret">
        <input className="field-input" type="password" value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} />
      </Field>
      <label className="flex items-center gap-2 mt-6">
        <input checked={isEnabled} className="h-4 w-4" onChange={(e) => setIsEnabled(e.target.checked)} type="checkbox" />
        <span className="text-sm">Habilitado</span>
      </label>
      <button className="btn btn-primary justify-self-start md:col-span-2" disabled={saving} type="submit">
        {saving ? "Salvando..." : "Salvar gateway"}
      </button>
    </form>
  );
}

function NotificationConfigForm({ data, onSaved }: { data: TenantIntegrationResponse["notification"]; onSaved: (s: { type: "success" | "error"; message: string } | null) => void }) {
  const [reminderHoursBefore, setReminderHoursBefore] = useState(data?.reminderHoursBefore ?? 24);
  const [channelsJson, setChannelsJson] = useState(data?.channelsJson ?? "[]");
  const [quietHoursStart, setQuietHoursStart] = useState(data?.quietHoursStart ?? "");
  const [quietHoursEnd, setQuietHoursEnd] = useState(data?.quietHoursEnd ?? "");
  const [enableAutoReminders, setEnableAutoReminders] = useState(data?.enableAutoReminders ?? false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    onSaved(null);
    try {
      await DefaultService.tenantIntegrationNotificationUpsert({
        reminderHoursBefore,
        channelsJson,
        quietHoursStart: quietHoursStart || undefined,
        quietHoursEnd: quietHoursEnd || undefined,
        enableAutoReminders,
      });
      onSaved({ type: "success", message: "Notificacoes configuradas com sucesso." });
    } catch (err) {
      onSaved({ type: "error", message: err instanceof Error ? err.message : "Erro ao salvar." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
      <Field label="Lembrete antes (horas)">
        <input className="field-input" min={1} type="number" value={reminderHoursBefore} onChange={(e) => setReminderHoursBefore(Number(e.target.value))} />
      </Field>
      <Field label="Canais (JSON)">
        <input className="field-input" value={channelsJson} onChange={(e) => setChannelsJson(e.target.value)} />
      </Field>
      <Field label="Horario inicio silencio">
        <input className="field-input" type="time" value={quietHoursStart} onChange={(e) => setQuietHoursStart(e.target.value)} />
      </Field>
      <Field label="Horario fim silencio">
        <input className="field-input" type="time" value={quietHoursEnd} onChange={(e) => setQuietHoursEnd(e.target.value)} />
      </Field>
      <label className="flex items-center gap-2 mt-6">
        <input checked={enableAutoReminders} className="h-4 w-4" onChange={(e) => setEnableAutoReminders(e.target.checked)} type="checkbox" />
        <span className="text-sm">Lembretes automaticos</span>
      </label>
      <button className="btn btn-primary justify-self-start md:col-span-2" disabled={saving} type="submit">
        {saving ? "Salvando..." : "Salvar notificacoes"}
      </button>
    </form>
  );
}

function BrandingConfigForm({ data, onSaved }: { data: TenantIntegrationResponse["branding"]; onSaved: (s: { type: "success" | "error"; message: string } | null) => void }) {
  const [logoUrl, setLogoUrl] = useState(data?.logoUrl ?? "");
  const [primaryColor, setPrimaryColor] = useState(data?.primaryColor ?? "#4f46e5");
  const [secondaryColor, setSecondaryColor] = useState(data?.secondaryColor ?? "#e0e7ff");
  const [customClinicName, setCustomClinicName] = useState(data?.customClinicName ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    onSaved(null);
    try {
      await DefaultService.tenantIntegrationBrandingUpsert({
        logoUrl: logoUrl || undefined,
        primaryColor: primaryColor || undefined,
        secondaryColor: secondaryColor || undefined,
        customClinicName: customClinicName || undefined,
      });
      onSaved({ type: "success", message: "Branding configurado com sucesso." });
    } catch (err) {
      onSaved({ type: "error", message: err instanceof Error ? err.message : "Erro ao salvar." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
      <Field label="URL do logo">
        <input className="field-input" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
      </Field>
      <Field label="Nome customizado">
        <input className="field-input" value={customClinicName} onChange={(e) => setCustomClinicName(e.target.value)} />
      </Field>
      <Field label="Cor primaria">
        <div className="flex items-center gap-2">
          <input className="h-10 w-10 cursor-pointer rounded border border-[var(--border)]" type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
          <input className="field-input flex-1" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
        </div>
      </Field>
      <Field label="Cor secundaria">
        <div className="flex items-center gap-2">
          <input className="h-10 w-10 cursor-pointer rounded border border-[var(--border)]" type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} />
          <input className="field-input flex-1" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} />
        </div>
      </Field>
      <button className="btn btn-primary justify-self-start md:col-span-2" disabled={saving} type="submit">
        {saving ? "Salvando..." : "Salvar branding"}
      </button>
    </form>
  );
}
