import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { specialtyCreate, specialtyUpdate, specialtyDelete } from "@/services/api";
import { Modal } from "@/components/ui/modal";

const schema = z.object({
  name: z.string().min(2, "Informe o nome da especialidade."),
});

type FormValues = z.infer<typeof schema>;

interface DoctorItem {
  id: string;
  name: string;
  crm: string;
}

interface SpecialtyItem {
  id: string;
  name: string;
  doctors: DoctorItem[];
}

export function SpecialtyList({
  items,
  page,
  pageSize,
  total,
  search,
  isLoading,
  onSearchChange,
  onPageChange,
  onEditDoctor,
}: {
  items: SpecialtyItem[];
  page: number;
  pageSize: number;
  total: number;
  search: string;
  isLoading: boolean;
  onSearchChange: (v: string) => void;
  onPageChange: (p: number) => void;
  onEditDoctor: (doctorId: string) => void;
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  const createMut = useMutation({
    mutationFn: (v: FormValues) => specialtyCreate({ name: v.name }),
    onSuccess: async () => { setFeedback("Especialidade cadastrada com sucesso."); form.reset(); setIsFormOpen(false); await queryClient.invalidateQueries({ queryKey: ["specialties"] }); },
    onError: () => { setFeedback("Nao foi possivel cadastrar a especialidade agora."); },
  });

  const updateMut = useMutation({
    mutationFn: (v: FormValues) => specialtyUpdate(editingId!, { name: v.name }),
    onSuccess: async () => { setFeedback("Especialidade atualizada com sucesso."); form.reset(); setEditingId(null); setIsFormOpen(false); await queryClient.invalidateQueries({ queryKey: ["specialties"] }); },
    onError: () => { setFeedback("Nao foi possivel atualizar a especialidade agora."); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => specialtyDelete(id),
    onSuccess: async () => { setFeedback("Especialidade excluida com sucesso."); await queryClient.invalidateQueries({ queryKey: ["specialties"] }); },
    onError: () => { setFeedback("Nao foi possivel excluir a especialidade agora."); },
  });

  function openCreate() { form.reset({ name: "" }); setEditingId(null); setIsFormOpen(true); }
  function openEdit(item: SpecialtyItem) { form.reset({ name: item.name }); setEditingId(item.id); setIsFormOpen(true); }

  const onSubmit = form.handleSubmit((v) => {
    setFeedback(null);
    return editingId ? updateMut.mutateAsync(v) : createMut.mutateAsync(v);
  });

  const totalPages = Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));

  return (
    <section className="panel rounded-lg p-5 md:p-6">
      <div className="section-heading">
        <div>
          <h3 className="text-base font-semibold text-[var(--ink)]">Especialidades</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {total} especialidade{total === 1 ? "" : "s"} encontrada{total === 1 ? "" : "s"}
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setFeedback(null); openCreate(); }} type="button">
          Nova especialidade
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
              <input className="input-field" placeholder="Buscar especialidade..." value={search} onChange={(e) => onSearchChange(e.target.value)} />
            </label>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="stack-list" aria-busy aria-label="Carregando especialidades">
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
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          </svg>
          <p className="text-sm font-semibold">Nenhuma especialidade encontrada.</p>
        </div>
      ) : (
        <div className="stack-list mt-5">
          {items.map((item) => (
            <div key={item.id} className="data-card">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                <div>
                  <h4 className="text-sm font-semibold text-[var(--ink)]">{item.name}</h4>
                  <p className="text-sm text-[var(--muted)]">{item.doctors.length} medico{item.doctors.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="toolbar-inline" style={{ gap: "0.25rem" }}>
                  <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openEdit(item); }} type="button">Editar</button>
                  <button className="btn btn-ghost btn-sm text-[var(--danger)]" onClick={(e) => { e.stopPropagation(); deleteMut.mutate(item.id); }} type="button">Excluir</button>
                </div>
              </div>
              {expandedId === item.id && (
                <div className="mt-3 border-t border-[var(--border)] pt-3">
                  {item.doctors.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">Nenhum medico vinculado a esta especialidade.</p>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Medico</th>
                          <th>CRM</th>
                          <th className="w-20" />
                        </tr>
                      </thead>
                      <tbody>
                        {item.doctors.map((d) => (
                          <tr key={d.id}>
                            <td>{d.name}</td>
                            <td>{d.crm}</td>
                            <td>
                              <button className="btn btn-ghost btn-sm" onClick={() => onEditDoctor(d.id)} type="button">Editar medico</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
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
        <Modal title={editingId ? "Editar especialidade" : "Nova especialidade"} onClose={() => setIsFormOpen(false)}>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <div>
              <span className="label">Nome da especialidade</span>
              <input className="input-field" {...form.register("name")} />
              {form.formState.errors.name && <p className="field-error">{form.formState.errors.name.message}</p>}
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
