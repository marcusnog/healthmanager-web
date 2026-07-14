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

  function invalidateHealthInsurances() {
    queryClient.invalidateQueries({ queryKey: ["healthInsurances"] });
    queryClient.invalidateQueries({ queryKey: ["health-insurances-catalog"] });
  }

  const createMut = useMutation({
    mutationFn: (v: FormValues) => healthInsuranceCreate({ name: v.name, phone: v.phone || undefined, contactName: v.contactName || undefined }),
    onSuccess: async () => { setFeedback("Convenio cadastrado com sucesso."); form.reset(); setIsFormOpen(false); await invalidateHealthInsurances(); },
    onError: () => { setFeedback("Nao foi possivel cadastrar o convenio agora."); },
  });

  const updateMut = useMutation({
    mutationFn: (v: FormValues) => healthInsuranceUpdate(editingId!, { name: v.name, phone: v.phone || undefined, contactName: v.contactName || undefined }),
    onSuccess: async () => { setFeedback("Convenio atualizado com sucesso."); form.reset(); setEditingId(null); setIsFormOpen(false); await invalidateHealthInsurances(); },
    onError: () => { setFeedback("Nao foi possivel atualizar o convenio agora."); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => healthInsuranceDelete(id),
    onSuccess: async () => { setFeedback("Convenio excluido com sucesso."); await invalidateHealthInsurances(); },
    onError: () => { setFeedback("Nao foi possivel excluir o convenio agora."); },
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
    <section className="panel rounded-lg p-5 md:p-6">
      <div className="section-heading">
        <div>
          <h3 className="text-base font-semibold text-[var(--ink)]">Convenios</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {total} convenio{total === 1 ? "" : "s"} encontrado{total === 1 ? "" : "s"}
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setFeedback(null); openCreate(); }} type="button">
          Novo convenio
        </button>
      </div>

      {feedback ? (
        <div className="rounded-md border border-[var(--border)] bg-[var(--brand-wash)] px-4 py-3 text-sm text-[var(--muted)]">{feedback}</div>
      ) : null}

      <div className="toolbar mt-4">
        <div className="toolbar-stack gap-3">
          <div className="toolbar-inline flex-wrap gap-3">
            <label className="min-w-0 flex-1">
              <span className="mb-2 block text-sm font-semibold">Busca</span>
              <input className="input-field" placeholder="Buscar convenio..." value={search} onChange={(e) => onSearchChange(e.target.value)} />
            </label>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="stack-list" aria-busy aria-label="Carregando convenios">
          {[1, 2, 3].map((i) => (
            <div key={i} className="data-card">
              <div className="skeleton h-5 w-40 rounded-full" />
              <div className="skeleton mt-3 h-4 w-64 rounded-full" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state mt-5">
          <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <p className="text-sm font-semibold">Nenhum convenio encontrado.</p>
        </div>
      ) : (
        <div className="overflow-x-auto mt-5">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Contato</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td className="text-[var(--muted)]">{item.phone || "-"}</td>
                  <td className="text-[var(--muted)]">{item.contactName || "-"}</td>
                  <td>
                    <div className="toolbar-inline" style={{ gap: "0.25rem" }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)} type="button">Editar</button>
                      <button className="btn btn-ghost btn-sm text-[var(--danger)]" onClick={() => deleteMut.mutate(item.id)} type="button">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="toolbar-inline mt-5 justify-between">
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} type="button">Anterior</button>
          <span className="text-sm font-medium text-[var(--muted)]">{page} / {totalPages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} type="button">Proxima</button>
        </div>
      )}

      {isFormOpen && (
        <Modal title={editingId ? "Editar convenio" : "Novo convenio"} onClose={() => setIsFormOpen(false)}>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <div>
              <span className="label">Nome do convenio</span>
              <input className="input-field" {...form.register("name")} />
              {form.formState.errors.name && <p className="field-error">{form.formState.errors.name.message}</p>}
            </div>
            <div>
              <span className="label">Telefone</span>
              <input className="input-field" {...form.register("phone")} />
            </div>
            <div>
              <span className="label">Nome do contato</span>
              <input className="input-field" {...form.register("contactName")} />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button type="button" className="btn btn-ghost" onClick={() => setIsFormOpen(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">{editingId ? "Salvar" : "Cadastrar"}</button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
