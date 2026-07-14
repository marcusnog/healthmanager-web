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
    onSuccess: async () => { setFeedback("Especialidade cadastrada."); form.reset(); setIsFormOpen(false); await queryClient.invalidateQueries({ queryKey: ["specialties"] }); },
    onError: () => { setFeedback("Erro ao cadastrar especialidade."); },
  });

  const updateMut = useMutation({
    mutationFn: (v: FormValues) => specialtyUpdate(editingId!, { name: v.name }),
    onSuccess: async () => { setFeedback("Especialidade atualizada."); form.reset(); setEditingId(null); setIsFormOpen(false); await queryClient.invalidateQueries({ queryKey: ["specialties"] }); },
    onError: () => { setFeedback("Erro ao atualizar especialidade."); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => specialtyDelete(id),
    onSuccess: async () => { setFeedback("Especialidade excluida."); await queryClient.invalidateQueries({ queryKey: ["specialties"] }); },
    onError: () => { setFeedback("Erro ao excluir especialidade."); },
  });

  function openCreate() { form.reset({ name: "" }); setEditingId(null); setIsFormOpen(true); }
  function openEdit(item: SpecialtyItem) { form.reset({ name: item.name }); setEditingId(item.id); setIsFormOpen(true); }

  const onSubmit = form.handleSubmit((v) => {
    setFeedback(null);
    return editingId ? updateMut.mutateAsync(v) : createMut.mutateAsync(v);
  });

  const totalPages = Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));

  return (
    <div>
      {feedback && <p className="text-sm text-(--success) mb-3">{feedback}</p>}
      <div className="flex items-center gap-2 mb-4">
        <input className="input" placeholder="Buscar especialidade..." value={search} onChange={(e) => onSearchChange(e.target.value)} />
        <button className="btn btn-primary" onClick={openCreate}>Nova especialidade</button>
      </div>

      {isLoading ? <p className="text-(--muted)">Carregando...</p> : (
        <>
          {items.map((item) => (
            <div key={item.id} className="border border-(--border) rounded-lg mb-2">
              <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-(--surface-alt)" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                <div>
                  <span className="font-medium">{item.name}</span>
                  <span className="text-sm text-(--muted) ml-2">({item.doctors.length} medico{(item.doctors.length) !== 1 ? "s" : ""})</span>
                </div>
                <div className="flex gap-1.5">
                  <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openEdit(item); }}>Editar</button>
                  <button className="btn btn-ghost btn-sm text-(--danger)" onClick={(e) => { e.stopPropagation(); deleteMut.mutate(item.id); }}>Excluir</button>
                </div>
              </div>
              {expandedId === item.id && (
                <div className="px-4 pb-3 border-t border-(--border) pt-2">
                  {item.doctors.length === 0 ? (
                    <p className="text-sm text-(--muted)">Nenhum medico vinculado a esta especialidade.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-(--muted)">
                          <th className="pb-1 font-medium">Medico</th>
                          <th className="pb-1 font-medium">CRM</th>
                          <th className="pb-1 font-medium w-20" />
                        </tr>
                      </thead>
                      <tbody>
                        {item.doctors.map((d) => (
                          <tr key={d.id} className="border-t border-(--border)">
                            <td className="py-1.5">{d.name}</td>
                            <td className="py-1.5">{d.crm}</td>
                            <td className="py-1.5">
                              <button className="btn btn-ghost btn-sm" onClick={() => onEditDoctor(d.id)}>Editar medico</button>
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
          {items.length === 0 && <p className="text-center text-(--muted) py-6">Nenhuma especialidade cadastrada.</p>}

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
        <Modal title={editingId ? "Editar especialidade" : "Nova especialidade"} onClose={() => setIsFormOpen(false)}>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <div>
              <label className="label">Nome da especialidade</label>
              <input className="input" {...form.register("name")} />
              {form.formState.errors.name && <p className="field-error">{form.formState.errors.name.message}</p>}
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
