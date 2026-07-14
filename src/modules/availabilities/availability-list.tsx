import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { availabilityCreate, availabilityUpdate, availabilityDelete } from "@/services/api";
import { Modal } from "@/components/ui/modal";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const schema = z.object({
  dayOfWeek: z.string(),
  startTime: z.string().min(1, "Informe o horario de inicio."),
  endTime: z.string().min(1, "Informe o horario de termino."),
  isAvailable: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface AvItem {
  id: string;
  doctorId: string;
  doctorName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export function AvailabilityList({
  items,
  page,
  pageSize,
  total,
  doctorId,
  doctors,
  isLoading,
  onDoctorChange,
  onPageChange,
}: {
  items: AvItem[];
  page: number;
  pageSize: number;
  total: number;
  doctorId: string | undefined;
  doctors: { id: string; name: string }[];
  isLoading: boolean;
  onDoctorChange: (id: string | undefined) => void;
  onPageChange: (p: number) => void;
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { dayOfWeek: "0", startTime: "08:00", endTime: "12:00", isAvailable: true },
  });

  const createMut = useMutation({
    mutationFn: (v: FormValues) => availabilityCreate({
      doctorId: doctorId!,
      dayOfWeek: parseInt(v.dayOfWeek),
      startTime: v.startTime,
      endTime: v.endTime,
      isAvailable: v.isAvailable,
    }),
    onSuccess: async () => { setFeedback("Disponibilidade cadastrada."); form.reset(); setIsFormOpen(false); await queryClient.invalidateQueries({ queryKey: ["availabilities"] }); },
    onError: () => { setFeedback("Erro ao cadastrar disponibilidade."); },
  });

  const updateMut = useMutation({
    mutationFn: (v: FormValues) => availabilityUpdate(editingId!, {
      dayOfWeek: parseInt(v.dayOfWeek), startTime: v.startTime, endTime: v.endTime, isAvailable: v.isAvailable,
    }),
    onSuccess: async () => { setFeedback("Disponibilidade atualizada."); form.reset(); setEditingId(null); setIsFormOpen(false); await queryClient.invalidateQueries({ queryKey: ["availabilities"] }); },
    onError: () => { setFeedback("Erro ao atualizar disponibilidade."); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => availabilityDelete(id),
    onSuccess: async () => { setFeedback("Disponibilidade excluida."); await queryClient.invalidateQueries({ queryKey: ["availabilities"] }); },
    onError: () => { setFeedback("Erro ao excluir disponibilidade."); },
  });

  function openCreate() {
    form.reset({ dayOfWeek: "0", startTime: "08:00", endTime: "12:00", isAvailable: true });
    setEditingId(null);
    setIsFormOpen(true);
  }

  function openEdit(item: AvItem) {
    form.reset({ dayOfWeek: String(item.dayOfWeek), startTime: item.startTime, endTime: item.endTime, isAvailable: item.isAvailable });
    setEditingId(item.id);
    setIsFormOpen(true);
  }

  const onSubmit = form.handleSubmit((v) => {
    setFeedback(null);
    return editingId ? updateMut.mutateAsync(v) : createMut.mutateAsync(v);
  });

  const totalPages = Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));
  const grouped = items.reduce<Record<number, AvItem[]>>((acc, item) => {
    (acc[item.dayOfWeek] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div>
      {feedback && <p className="text-sm text-(--success) mb-3">{feedback}</p>}

      <div className="flex items-center gap-2 mb-4">
        <select className="input w-64" value={doctorId ?? ""} onChange={(e) => onDoctorChange(e.target.value || undefined)}>
          <option value="">Selecione um medico...</option>
          {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        {doctorId && <button className="btn btn-primary" onClick={openCreate}>Nova disponibilidade</button>}
      </div>

      {!doctorId ? (
        <p className="text-(--muted) text-center py-6">Selecione um medico para gerenciar a agenda.</p>
      ) : isLoading ? (
        <p className="text-(--muted)">Carregando...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {DAYS.map((dayName, i) => {
              const slots = grouped[i] ?? [];
              return (
                <div key={i} className="border border-(--border) rounded-lg p-3">
                  <h3 className="font-semibold mb-2 text-sm">{dayName}</h3>
                  {slots.length === 0 ? (
                    <p className="text-xs text-(--muted)">Sem horarios</p>
                  ) : (
                    slots.map((slot) => (
                      <div key={slot.id} className={`flex items-center justify-between py-1.5 text-sm border-b border-(--border) last:border-0 ${!slot.isAvailable ? "opacity-40" : ""}`}>
                        <span>
                          {slot.startTime} - {slot.endTime}
                          {!slot.isAvailable && <span className="text-xs text-(--danger) ml-1">(bloqueado)</span>}
                        </span>
                        <div className="flex gap-1">
                          <button className="btn btn-ghost btn-xs" onClick={() => openEdit(slot)}>Editar</button>
                          <button className="btn btn-ghost btn-xs text-(--danger)" onClick={() => deleteMut.mutate(slot.id)}>X</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>

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
        <Modal title={editingId ? "Editar disponibilidade" : "Nova disponibilidade"} onClose={() => setIsFormOpen(false)}>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <div>
              <label className="label">Dia da semana</label>
              <select className="input" {...form.register("dayOfWeek")}>
                {DAYS.map((name, i) => <option key={i} value={i}>{name}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="label">Inicio</label>
                <input className="input" type="time" {...form.register("startTime")} />
                {form.formState.errors.startTime && <p className="field-error">{form.formState.errors.startTime.message}</p>}
              </div>
              <div className="flex-1">
                <label className="label">Termino</label>
                <input className="input" type="time" {...form.register("endTime")} />
                {form.formState.errors.endTime && <p className="field-error">{form.formState.errors.endTime.message}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isAvail" {...form.register("isAvailable")} />
              <label htmlFor="isAvail" className="text-sm">Disponivel para agendamento</label>
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
