"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DefaultService } from "@/services/api";
import type { ManagedUserResponse, CreateManagedUserRequest } from "@/generated";
import { Modal } from "@/components/ui/modal";
import { readAuthSession } from "@/lib/auth-session";
import { apiErrorMessage } from "@/lib/api-error";

const labels: Record<string, string> = {
  "clinical-settings": "Configurações clínicas",
  dashboard: "Dashboard", atendimento: "Atendimento", agenda: "Agenda", "tipos-consulta": "Tipos de consulta",
  pacientes: "Pacientes", "produtos-pacotes": "Produtos e pacotes", financeiro: "Contas a receber e resumo",
  "financeiro-pagar": "Contas a pagar", "financeiro-repasses": "Repasses", "categorias-despesa": "Categorias de despesa",
  medicos: "Médicos", convenios: "Convênios", especialidades: "Especialidades", "agenda-medicos": "Agenda por médico",
  configuracoes: "Configurações", usuarios: "Usuários",
};
const roleLabels: Record<string, string> = { Admin: "Administrador", Secretary: "Recepção", Doctor: "Médico" };
type Role = CreateManagedUserRequest["role"];

export function UserManager() {
  const client = useQueryClient();
  const users = useQuery({ queryKey: ["users"], queryFn: () => DefaultService.usersList() });
  const profiles = useQuery({ queryKey: ["access-profiles"], queryFn: () => DefaultService.usersAccessProfiles() });
  const [editing, setEditing] = useState<ManagedUserResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("Secretary" as Role);
  const [screens, setScreens] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [feedback, setFeedback] = useState("");
  const ownAccount = editing?.id === readAuthSession()?.userId;
  const profile = profiles.data?.find(p => p.role === role);
  const save = useMutation({
    mutationFn: () => editing
      ? DefaultService.usersUpdate(editing.id, { name: name.trim(), email: email.trim(), role, screens, isActive })
      : DefaultService.usersCreate({ name: name.trim(), email: email.trim(), password, role, screens }),
    onSuccess: async () => {
      setOpen(false);
      setPassword("");
      setFeedback("Usuário salvo. As permissões já estão em vigor.");
      await client.invalidateQueries({ queryKey: ["users"] });
    },
  });
  function show(user?: ManagedUserResponse) {
    save.reset();
    setEditing(user ?? null);
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setPassword("");
    setRole((user?.role ?? "Secretary") as Role);
    setScreens(user?.screens ?? profiles.data?.find(p => p.role === "Secretary")?.defaultScreens ?? []);
    setIsActive(user?.isActive ?? true);
    setOpen(true);
  }
  function changeRole(value: Role) {
    setRole(value);
    setScreens(profiles.data?.find(p => p.role === value)?.defaultScreens ?? []);
  }
  return <section className="panel rounded-lg p-5 md:p-6">
    <div className="section-heading">
      <p className="text-sm text-[var(--muted)]">Gerencie os usuários da clínica e escolha as telas de cada perfil.</p>
      <button type="button" className="btn btn-primary" disabled={!profiles.data} onClick={() => show()}>Novo usuário</button>
    </div>
    {feedback && <p role="status" className="mt-4 text-sm">{feedback}</p>}
    {(users.isError || profiles.isError) && <div role="alert" className="mt-4"><p>Não foi possível carregar os usuários e perfis.</p><button className="btn btn-ghost" onClick={() => { void users.refetch(); void profiles.refetch(); }}>Tentar novamente</button></div>}
    {users.isLoading ? <p role="status" className="mt-5">Carregando usuários...</p> : <div className="stack-list mt-5">
      {users.data?.map(user => <div key={user.id} className="data-card flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0"><p className="font-semibold">{user.name}</p><p className="break-all text-sm text-[var(--muted)]">{user.email}</p><p className="mt-1 text-sm">{roleLabels[user.role]} · {user.isActive ? "Ativo" : "Inativo"} · {user.role === "Admin" ? "Todas as telas" : `${user.screens.length} telas liberadas`}</p></div>
        <button type="button" className="btn btn-ghost" disabled={!profiles.data} aria-label={`Editar ${user.name}`} onClick={() => show(user)}>Editar acesso</button>
      </div>)}
      {users.data?.length === 0 && <p>Nenhum usuário cadastrado.</p>}
    </div>}
    {open && <Modal title={editing ? "Editar usuário e acesso" : "Novo usuário"} size="lg" onClose={() => { if (!save.isPending) setOpen(false); }}>
      <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); save.mutate(); }}>
        <label><span className="label">Nome</span><input autoFocus required className="input-field" value={name} onChange={e => setName(e.target.value)} /></label>
        <label><span className="label">E-mail</span><input required type="email" autoComplete="off" className="input-field" value={email} onChange={e => setEmail(e.target.value)} /></label>
        {!editing && <label><span className="label">Senha inicial</span><input required minLength={8} type="password" autoComplete="new-password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} /><span className="text-sm text-[var(--muted)]">Mínimo de 8 caracteres.</span></label>}
        <label><span className="label">Perfil de acesso</span><select className="input-field" disabled={ownAccount} value={role} onChange={e => changeRole(e.target.value as Role)}>{profiles.data?.map(p => <option key={p.role} value={p.role}>{roleLabels[p.role]}</option>)}</select></label>
        {editing && <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={isActive} disabled={ownAccount} onChange={e => setIsActive(e.target.checked)} />Usuário ativo</label>}
        {ownAccount && <p className="text-sm text-[var(--muted)]">Seu próprio acesso de administrador deve permanecer ativo.</p>}
        <fieldset className="rounded-lg border border-[var(--border)] p-4">
          <legend className="px-1 font-semibold">Telas liberadas</legend>
          <p className="mb-3 text-sm text-[var(--muted)]">{role === "Admin" ? "Administradores têm acesso a todas as telas." : "As ações disponíveis seguem o perfil escolhido. Desmarcar todas bloqueia o acesso às telas."}</p>
          {role !== "Admin" && <button className="btn btn-ghost btn-sm mb-3" type="button" onClick={() => setScreens(profile?.defaultScreens ?? [])}>Restaurar padrão do perfil</button>}
          <div className="grid gap-x-4 sm:grid-cols-2">{profile?.availableScreens.map(screen => <label key={screen} className="flex min-h-11 items-center gap-3"><input type="checkbox" disabled={role === "Admin"} checked={role === "Admin" || screens.includes(screen)} onChange={e => setScreens(current => e.target.checked ? [...current, screen] : current.filter(s => s !== screen))} />{labels[screen] ?? screen}</label>)}</div>
        </fieldset>
        {save.isError && <p role="alert" className="text-sm text-[var(--danger)]">{apiErrorMessage(save.error, "Não foi possível salvar o usuário.")}</p>}
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" disabled={save.isPending} onClick={() => setOpen(false)}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={save.isPending || !name.trim()}>{save.isPending ? "Salvando..." : "Salvar usuário"}</button></div>
      </form>
    </Modal>}
  </section>;
}
