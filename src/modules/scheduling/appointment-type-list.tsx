import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DefaultService, type AppointmentTypeResponse } from "@/generated";
import { Modal } from "@/components/ui/modal";

export function AppointmentTypeList({ items, isLoading }: { items: AppointmentTypeResponse[]; isLoading: boolean }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AppointmentTypeResponse | null>(null);
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => editing?.id ? DefaultService.appointmentTypesUpdate(editing.id, { name }) : DefaultService.appointmentTypesCreate({ name }),
    onSuccess: async () => { setOpen(false); setFeedback("Tipo de consulta salvo com sucesso."); await queryClient.invalidateQueries({ queryKey: ["appointment-types"] }); },
    onError: () => setFeedback("Nao foi possivel salvar o tipo de consulta."),
  });
  const remove = useMutation({
    mutationFn: (id: string) => DefaultService.appointmentTypesDelete(id),
    onSuccess: async () => { setFeedback("Tipo de consulta excluido com sucesso."); await queryClient.invalidateQueries({ queryKey: ["appointment-types"] }); },
    onError: () => setFeedback("Nao e possivel excluir um tipo de consulta em uso."),
  });
  const show = (item?: AppointmentTypeResponse) => { setEditing(item ?? null); setName(item?.name ?? ""); setOpen(true); };
  return <section className="panel rounded-lg p-5 md:p-6">
    <div className="section-heading"><div><h3 className="text-base font-semibold">Tipos de consulta</h3><p className="mt-1 text-sm text-[var(--muted)]">{items.length} tipo{items.length === 1 ? "" : "s"} cadastrado{items.length === 1 ? "" : "s"}</p></div><button className="btn btn-primary btn-sm" onClick={() => show()} type="button">Novo tipo</button></div>
    {feedback && <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--brand-wash)] px-4 py-3 text-sm">{feedback}</div>}
    {isLoading ? <p className="mt-5 text-sm text-[var(--muted)]">Carregando...</p> : <div className="stack-list mt-5">{items.map(item => <div className="data-card flex items-center justify-between" key={item.id}><span className="font-semibold">{item.name}</span><div className="toolbar-inline"><button className="btn btn-ghost btn-sm" onClick={() => show(item)} type="button">Editar</button><button className="btn btn-ghost btn-sm text-[var(--danger)]" onClick={() => item.id && confirm("Excluir este tipo de consulta?") && remove.mutate(item.id)} type="button">Excluir</button></div></div>)}</div>}
    {open && <Modal title={editing ? "Editar tipo de consulta" : "Novo tipo de consulta"} onClose={() => setOpen(false)}><form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (name.trim().length >= 2) save.mutate(); }}><label><span className="label">Nome do tipo</span><input autoFocus className="input-field" minLength={2} required value={name} onChange={e => setName(e.target.value)} /></label><div className="flex justify-end gap-2"><button className="btn btn-ghost" onClick={() => setOpen(false)} type="button">Cancelar</button><button className="btn btn-primary" disabled={save.isPending} type="submit">Salvar</button></div></form></Modal>}
  </section>;
}
