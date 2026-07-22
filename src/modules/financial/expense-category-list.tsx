import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { expenseCategoryCreate, expenseCategoryDelete, expenseCategoryUpdate, type ExpenseCategoryResponse } from "@/services/api";
import { Modal } from "@/components/ui/modal";

export function ExpenseCategoryList({ items, isLoading }: { items: ExpenseCategoryResponse[]; isLoading: boolean }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ExpenseCategoryResponse | null>(null);
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => editing ? expenseCategoryUpdate(editing.id, name) : expenseCategoryCreate(name),
    onSuccess: async () => { setOpen(false); setFeedback("Categoria salva com sucesso."); await queryClient.invalidateQueries({ queryKey: ["expense-categories"] }); },
    onError: () => setFeedback("Nao foi possivel salvar a categoria."),
  });
  const remove = useMutation({
    mutationFn: expenseCategoryDelete,
    onSuccess: async () => { setFeedback("Categoria excluida com sucesso."); await queryClient.invalidateQueries({ queryKey: ["expense-categories"] }); },
    onError: () => setFeedback("Nao e possivel excluir uma categoria em uso."),
  });
  const show = (item?: ExpenseCategoryResponse) => { setEditing(item ?? null); setName(item?.name ?? ""); setOpen(true); };
  return <section className="panel rounded-lg p-5 md:p-6">
    <div className="section-heading"><div><h3 className="text-base font-semibold">Categorias de despesa</h3><p className="mt-1 text-sm text-[var(--muted)]">{items.length} categoria{items.length === 1 ? "" : "s"} cadastrada{items.length === 1 ? "" : "s"}</p></div><button className="btn btn-primary btn-sm" onClick={() => show()} type="button">Nova categoria</button></div>
    {feedback && <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--brand-wash)] px-4 py-3 text-sm">{feedback}</div>}
    {isLoading ? <p className="mt-5 text-sm text-[var(--muted)]">Carregando...</p> : <div className="stack-list mt-5">{items.map(item => <div className="data-card flex items-center justify-between" key={item.id}><span className="font-semibold">{item.name}</span><div className="toolbar-inline"><button className="btn btn-ghost btn-sm" onClick={() => show(item)} type="button">Editar</button><button className="btn btn-ghost btn-sm text-[var(--danger)]" onClick={() => confirm("Excluir esta categoria?") && remove.mutate(item.id)} type="button">Excluir</button></div></div>)}</div>}
    {open && <Modal title={editing ? "Editar categoria" : "Nova categoria"} onClose={() => setOpen(false)}><form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (name.trim().length >= 2) save.mutate(); }}><label><span className="label">Nome da categoria</span><input autoFocus className="input-field" minLength={2} required value={name} onChange={e => setName(e.target.value)} /></label><div className="flex justify-end gap-2"><button className="btn btn-ghost" onClick={() => setOpen(false)} type="button">Cancelar</button><button className="btn btn-primary" disabled={save.isPending} type="submit">Salvar</button></div></form></Modal>}
  </section>;
}
