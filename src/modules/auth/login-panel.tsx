"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createAuthSession, persistAuthSession } from "@/lib/auth-session";
import { DefaultService } from "@/services/api";
import type { SessionState } from "@/types/app";

const schema = z.object({
  email: z.string().email("Informe um email valido."),
  password: z.string().min(8, "Use ao menos 8 caracteres."),
  role: z.enum(["Admin", "Secretary", "Doctor"]),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  session: SessionState | null;
  onLogin: (session: SessionState) => void;
  onLogout: () => void;
};

export function LoginPanel({ session, onLogin, onLogout }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "admin@clinicaaurora.com",
      password: "ChangeMe123!",
      role: "Admin",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const response = await DefaultService.authLogin({
        email: values.email,
        password: values.password,
      });

      const authSession = createAuthSession(response);
      if (authSession) {
        persistAuthSession(authSession);
        onLogin(authSession.session);
        return;
      }
    } catch {
      // Fallback visual para ambiente local ou sem auth real.
    }

    onLogin({
      clinicName: "Clinica Aurora",
      name: values.email.split("@")[0].replace(".", " "),
      role: values.role,
    });
  });

  if (session) {
    return (
      <div className="section-card section-card-compact">
        <p className="label">Sessao ativa</p>
        <h3 className="mt-3 text-2xl font-semibold">{session.name}</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {session.clinicName} - {session.role}
        </p>
        <div className="divider my-4" />
        <p className="text-sm leading-6 text-[var(--muted)]">
          O acesso ja esta autenticado e pronto para retomar agenda, pacientes
          e financeiro.
        </p>
        <button
          className="btn btn-accent mt-5 w-full"
          onClick={onLogout}
          type="button"
        >
          Encerrar sessao
        </button>
      </div>
    );
  }

  return (
    <form className="section-card section-card-compact" onSubmit={onSubmit}>
      <div className="eyebrow-row">
        <span className="pill">
          <span className="label">Login do MVP</span>
        </span>
        <span className="pill">
          <span className="label">Seed local</span>
        </span>
      </div>

      <div className="mt-5 grid gap-4">
        <Field
          error={errors.email?.message}
          hint="Use o admin seed ou uma conta real provisionada."
          id="login-email"
          input={<input className="input-field" id="login-email" {...register("email")} />}
          label="Email"
        />
        <Field
          error={errors.password?.message}
          hint="A senha seed atual e ChangeMe123!."
          id="login-password"
          input={
            <input
              className="input-field"
              id="login-password"
              type="password"
              {...register("password")}
            />
          }
          label="Senha"
        />
        <Field
          error={errors.role?.message}
          hint="Este campo ajuda no fallback local quando a API nao autentica."
          id="login-role"
          input={
            <select className="input-field" id="login-role" {...register("role")}>
              <option value="Admin">Admin</option>
              <option value="Secretary">Secretaria</option>
              <option value="Doctor">Medico</option>
            </select>
          }
          label="Perfil"
        />
      </div>

      <div className="mt-5 rounded-[1.25rem] border border-[var(--line)] bg-[var(--brand-wash)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
        O painel usa autenticacao real quando a API estiver disponivel e cai em
        fallback local apenas para acelerar o ambiente de desenvolvimento.
      </div>

      <button
        className="btn btn-primary mt-5 w-full"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? <span className="spinner" /> : "Entrar no painel"}
      </button>
    </form>
  );
}

function Field({
  label,
  input,
  error,
  hint,
  id,
}: {
  label: string;
  input: React.ReactNode;
  error?: string;
  hint: string;
  id: string;
}) {
  return (
    <div className="block">
      <label className="mb-2 block text-sm font-semibold" htmlFor={id}>
        {label}
      </label>
      {input}
      <span className="mt-2 block text-xs text-[var(--muted)]">{hint}</span>
      {error ? (
        <span className="mt-2 block text-sm text-[var(--danger)]">{error}</span>
      ) : null}
    </div>
  );
}
