import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { healthInsuranceCreate, healthInsuranceDelete, healthInsuranceUpdate } from "@/services/api";
import { Modal } from "@/components/ui/modal";


const schema = z.object({
  name: z.string().min(2, "Informe o nome do convenio."),
  phone: z.string().optional(),
  contactName: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function HealthInsuranceList({
  items,
  page,
  pageSize,
  total,
  search,
  isLoading,
  onSearchChange,
  onPageChange,
}: {
  items: { id: string; name: string; phone?: string; contactName?: string }[];
  page: number;
  pageSize: number;
  total: number;
  search: string;
  isLoading: boolean;
  onSearchChange: (v: string) => void;
  onPageChange: (p: number) => void;
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", phone: "", contactName: "" },
  });

  const createMut = useMutation({
    mutationFn: (v: FormValues) => healthInsuranceCreate({ name: v.name, phone: v.phone || undefined, contactName: v.contactName || undefined }),
    onSuccess: async () => { setFeedback("Convenio cadastrado."); form.reset(); setIsFormOpen(false); await queryClient.invalidateQueries({ queryKey: ["healthInsurances"] }); },
    onError: () => { setFeedback("Erro ao cadastrar convenio."); },
  });

  const updateMut = useMutation({
    mutationFn: (v: FormValues) => healthInsuranceUpdate(editingId!, { name: v.name, phone: v.phone || undefined, contactName: v.contactName || undefined }),
    onSuccess: async () => { setFeedback("Convenio atualizado."); form.reset(); setEditingId(null); setIsFormOpen(false); await queryClient.invalidateQueries({ queryKey: ["healthInsurances"] }); },
    onError: () => { setFeedback("Erro ao atualizar convenio."); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => healthInsuranceDelete(id),
    onSuccess: async () => { setFeedback("Convenio excluido."); await queryClient.invalidateQueries({ queryKey: ["healthInsurances"] }); },
    onError: () => { setFeedback("Erro ao excluir convenio."); },
  });

  function openCreate() {
    form.reset({ name: "", phone: "", contactName: "" });
    setEditingId(null);
    setIsFormOpen(true);
  }

  function openEdit(item: { id: string; name: string; phone?: string; contactName?: string }) {
    form.reset({ name: item.name, phone: item.phone || "", contactName: item.contactName || "" });
    setEditingId(item.id);
    setIsFormOpen(true);
  }

  const onSubmit = form.handleSubmit((v) => {
    setFeedback(null);
    return editingId ? updateMut.mutateAsync(v) : createMut.mutateAsync(v);
  });

  const totalPages = Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));

  return (
    <div>
      {feedback && <p className="text-sm text-(--success) mb-3">{feedback}</p>}
      <div className="flex items-center gap-2 mb-4">
        <input className="input" placeholder="Buscar convenio..." value={search} onChange={(e) => onSearchChange(e.target.value)} />
        <button className="btn btn-primary" onClick={openCreate}>Novo convenio</button>
      </div>

      {isLoading ? <p className="text-(--muted)">Carregando...</p> : (
        <>
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-sm text-(--muted) border-b">
                <th className="pb-2 font-medium">Nome</th>
                <th className="pb-2 font-medium">Telefone</th>
                <th className="pb-2 font-medium">Contato</th>
                <th className="pb-2 font-medium w-24" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-(--border) hover:bg-(--surface-alt) transition-colors">
                  <td className="py-2.5">{item.name}</td>
                  <td className="py-2.5 text-sm text-(--muted)">{item.phone || "-"}</td>
                  <td className="py-2.5 text-sm text-(--muted)">{item.contactName || "-"}</td>
                  <td className="py-2.5">
                    <div className="flex gap-1.5">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}>Editar</button>
                      <button className="btn btn-ghost btn-sm text-(--danger)" onClick={() => deleteMut.mutate(item.id)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-(--muted)">Nenhum convenio cadastrado.</td></tr>}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-(--muted)">Pagina {page} de {totalPages}</span>
              <div className="flex gap-1">
                <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Anterior</button>
                <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Proxima</button>
              </div>
            </div>
          )}
        </>
      )}

      {isFormOpen && (
        <Modal title={editingId ? "Editar convenio" : "Novo convenio"} onClose={() => setIsFormOpen(false)}>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <div>
              <label className="label">Nome do convenio</label>
              <input className="input" {...form.register("name")} />
              {form.formState.errors.name && <p className="field-error">{form.formState.errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Telefone</label>
              <input className="input" {...form.register("phone")} />
            </div>
            <div>
              <label className="label">Nome do contato</label>
              <input className="input" {...form.register("contactName")} />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button type="button" className="btn btn-ghost" onClick={() => setIsFormOpen(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">{editingId ? "Salvar" : "Cadastrar"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
