import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { availabilityCreate, availabilityUpdate, availabilityDelete } from "@/services/api";
import { Modal } from "@/components/ui/modal";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

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
    onSuccess: async () => { setFeedback("Disponibilidade cadastrada com sucesso."); form.reset(); setIsFormOpen(false); await queryClient.invalidateQueries({ queryKey: ["availabilities"] }); },
    onError: () => { setFeedback("Nao foi possivel cadastrar a disponibilidade agora."); },
  });

  const updateMut = useMutation({
    mutationFn: (v: FormValues) => availabilityUpdate(editingId!, {
      dayOfWeek: parseInt(v.dayOfWeek), startTime: v.startTime, endTime: v.endTime, isAvailable: v.isAvailable,
    }),
    onSuccess: async () => { setFeedback("Disponibilidade atualizada com sucesso."); form.reset(); setEditingId(null); setIsFormOpen(false); await queryClient.invalidateQueries({ queryKey: ["availabilities"] }); },
    onError: () => { setFeedback("Nao foi possivel atualizar a disponibilidade agora."); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => availabilityDelete(id),
    onSuccess: async () => { setFeedback("Disponibilidade excluida com sucesso."); await queryClient.invalidateQueries({ queryKey: ["availabilities"] }); },
    onError: () => { setFeedback("Nao foi possivel excluir a disponibilidade agora."); },
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
    <section className="panel rounded-lg p-5 md:p-6">
      <div className="section-heading">
        <div>
          <h3 className="text-base font-semibold text-[var(--ink)]">Agenda dos medicos</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Gerencie os horarios disponiveis por medico
          </p>
        </div>
      </div>

      {feedback ? (
        <div className="rounded-md border border-[var(--border)] bg-[var(--brand-wash)] px-4 py-3 text-sm text-[var(--muted)]">{feedback}</div>
      ) : null}

      <div className="toolbar mt-4">
        <div className="toolbar-stack gap-3">
          <div className="toolbar-inline flex-wrap gap-3">
            <label className="min-w-0 flex-1">
              <span className="mb-2 block text-sm font-semibold">Medico</span>
              <select className="input-field w-64" value={doctorId ?? ""} onChange={(e) => onDoctorChange(e.target.value || undefined)}>
                <option value="">Selecione um medico...</option>
                {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
            {doctorId && <button className="btn btn-primary btn-sm self-end" onClick={() => { setFeedback(null); openCreate(); }} type="button">Nova disponibilidade</button>}
          </div>
        </div>
      </div>

      {!doctorId ? (
        <div className="empty-state mt-5">
          <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <p className="text-sm font-semibold">Selecione um medico para gerenciar a agenda.</p>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-5" aria-busy aria-label="Carregando horarios">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-[var(--border)] rounded-lg p-3">
              <div className="skeleton h-5 w-24 rounded-full" />
              <div className="skeleton mt-3 h-12 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-5">
          {DAYS.map((dayName, i) => {
            const slots = grouped[i] ?? [];
            return (
              <div key={i} className="border border-[var(--border)] rounded-lg p-3">
                <h4 className="text-sm font-semibold text-[var(--ink)] mb-2">{dayName}</h4>
                {slots.length === 0 ? (
                  <p className="text-xs text-[var(--muted)]">Sem horarios</p>
                ) : (
                  slots.map((slot) => (
                    <div key={slot.id} className={`flex items-center justify-between py-1.5 text-sm border-b border-[var(--border)] last:border-0 ${!slot.isAvailable ? "opacity-40" : ""}`}>
                      <span>
                        {slot.startTime} - {slot.endTime}
                        {!slot.isAvailable && <span className="text-xs text-[var(--danger)] ml-1">(bloqueado)</span>}
                      </span>
                      <div className="toolbar-inline" style={{ gap: "0.25rem" }}>
                        <button className="btn btn-ghost btn-xs" onClick={() => openEdit(slot)} type="button">Editar</button>
                          <button className="btn btn-ghost btn-xs text-[var(--danger)]" onClick={() => deleteMut.mutate(slot.id)} type="button">
                            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })}
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
        <Modal title={editingId ? "Editar disponibilidade" : "Nova disponibilidade"} onClose={() => setIsFormOpen(false)}>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <div>
              <span className="label">Dia da semana</span>
              <select className="input-field" {...form.register("dayOfWeek")}>
                {DAYS.map((name, i) => <option key={i} value={i}>{name}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <span className="label">Inicio</span>
                <input className="input-field" type="time" {...form.register("startTime")} />
                {form.formState.errors.startTime && <p className="field-error">{form.formState.errors.startTime.message}</p>}
              </div>
              <div className="flex-1">
                <span className="label">Termino</span>
                <input className="input-field" type="time" {...form.register("endTime")} />
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
    </section>
  );
}
