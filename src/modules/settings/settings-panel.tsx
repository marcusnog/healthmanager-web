import { useState } from "react";
import { Field } from "@/components/ui/field";
import { DefaultService } from "@/services/api";

const SETTINGS = [
  {
    title: "Expediente",
    description:
      "08:00 as 18:00 com slot padrao de 30 minutos, validacao de conflito e navegacao diaria da agenda.",
    eyebrow: "Operacao",
  },
  {
    title: "WhatsApp",
    description:
      "Fluxo pronto para Meta Cloud API com confirmacao automatica, lembretes e retorno por webhook.",
    eyebrow: "Automacao",
  },
  {
    title: "Permissoes",
    description:
      "Perfis separados para Admin, Secretaria e Medico, com tenant isolation por clinica.",
    eyebrow: "Seguranca",
  },
  {
    title: "Documentos",
    description:
      "Upload, download e soft delete para PDF, JPG e PNG com suporte a storage privado.",
    eyebrow: "Prontidao",
  },
];

export function SettingsPanel() {
  return (
    <section className="panel rounded-lg p-6">
      <div className="section-heading">
        <div>
          <p className="label">Configuracoes</p>
          <h3 className="mt-2 text-2xl font-semibold">
            Configuracoes operacionais do tenant
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Esta area resume os pilares operacionais do MVP e o que ja
            esta preparado para crescer sem overengineering.
          </p>
        </div>
        <div className="highlight-card max-w-sm">
          <p className="label">MVP pronto para escalar</p>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Tenant por clinica, outbox, worker interno, documentos e trilha de
            auditoria no mesmo fluxo do produto.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {SETTINGS.map((setting) => (
          <SettingCard
            key={setting.title}
            description={setting.description}
            eyebrow={setting.eyebrow}
            title={setting.title}
          />
        ))}
      </div>

      <ChangePasswordForm />
    </section>
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

function SettingCard({
  title,
  description,
  eyebrow,
}: {
  title: string;
  description: string;
  eyebrow: string;
}) {
  return (
    <article className="section-card section-card-compact">
      <p className="label">{eyebrow}</p>
      <h4 className="mt-3 text-xl font-semibold">{title}</h4>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        {description}
      </p>
    </article>
  );
}
