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
            Esta area resume os pilares operacionais do MVP e deixa claro o que
            ja esta preparado para crescer sem overengineering.
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
    </section>
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
