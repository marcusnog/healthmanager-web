"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createAuthSession, persistAuthSession } from "@/lib/auth-session";
import { DefaultService } from "@/services/api";
import { Field } from "@/components/ui/field";
import type { SessionState } from "@/types/app";

const schema = z.object({
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(8, "Use ao menos 8 caracteres."),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  session: SessionState | null;
  onLogin: (session: SessionState) => void;
  onLogout: () => void;
};

export function LoginPanel({ session, onLogin, onLogout }: Props) {
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setAuthError(null);
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
      setAuthError("Não foi possível autenticar. Verifique suas credenciais.");
    } catch {
      setAuthError("E-mail ou senha incorretos.");
    }
  });

  if (session) {
    return (
      <div className="login-active-card">
        <div className="login-active-avatar">{session.name.slice(0, 2).toUpperCase()}</div>
        <div className="mt-3">
          <p className="login-active-name">{session.name}</p>
          <p className="login-active-meta">{session.clinicName} · {session.role}</p>
        </div>
        <div className="divider my-4" />
        <p className="text-sm text-muted leading-6">
          Sessão autenticada. Acesso ao painel disponível.
        </p>
        <button className="btn btn-danger mt-5 w-full" onClick={onLogout} type="button">
          Encerrar sessão
        </button>
      </div>
    );
  }

  return (
    <form className="login-form" onSubmit={onSubmit} noValidate>
      <Field label="E-mail" error={errors.email?.message}>
        <input
          className="input-field"
          type="email"
          autoComplete="email"
          placeholder="seu@email.com"
          {...register("email")}
        />
      </Field>

      <Field label="Senha" error={errors.password?.message} className="mt-4">
        <input
          className="input-field"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          {...register("password")}
        />
      </Field>

      {authError && (
        <p className="login-error">{authError}</p>
      )}

      <button
        className="btn btn-primary w-full mt-6"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? <span className="spinner" /> : "Entrar"}
      </button>

      <p className="login-form-footer">
        Problemas de acesso? Entre em contato com o administrador da clínica.
      </p>
    </form>
  );
}
