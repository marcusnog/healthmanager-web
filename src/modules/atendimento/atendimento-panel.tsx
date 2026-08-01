"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { DefaultService } from "@/generated";

export function AtendimentoPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [phone, setPhone] = useState<string>();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const conversations = useQuery({ queryKey: ["whatsapp-conversations", search], queryFn: () => DefaultService.whatsappConversationsList(1, 100, search) });
  const messages = useQuery({ queryKey: ["whatsapp-messages", phone], queryFn: () => DefaultService.whatsappMessagesList(phone!), enabled: Boolean(phone), refetchInterval: 10_000 });

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!phone || !message.trim()) return;
    setSending(true);
    try {
      await DefaultService.whatsappMessageSend(phone, { message: message.trim() });
      setMessage("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["whatsapp-messages", phone] }),
        queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] }),
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid min-h-[620px] grid-cols-1 overflow-hidden rounded-xl border border-slate-200 bg-white md:grid-cols-[320px_1fr]">
      <aside className="border-b border-slate-200 md:border-b-0 md:border-r">
        <div className="p-3"><input className="input w-full" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar paciente ou telefone" aria-label="Buscar conversas" /></div>
        <div className="max-h-[560px] overflow-y-auto">
          {conversations.data?.items.map((item) => (
            <button key={item.phone} type="button" onClick={() => setPhone(item.phone)} className={`w-full border-t border-slate-100 p-4 text-left hover:bg-slate-50 ${phone === item.phone ? "bg-slate-100" : ""}`}>
              <strong className="block text-sm text-slate-900">{item.patientName || item.phone}</strong>
              {item.patientName && <span className="block text-xs text-slate-500">{item.phone}</span>}
              <span className="mt-1 block truncate text-sm text-slate-600">{item.lastMessage}</span>
            </button>
          ))}
          {!conversations.isLoading && !conversations.data?.items.length && <p className="p-6 text-center text-sm text-slate-500">Nenhuma conversa.</p>}
        </div>
      </aside>
      <section className="flex min-h-[500px] flex-col">
        {!phone ? <p className="m-auto text-sm text-slate-500">Selecione uma conversa para atender.</p> : <>
          <header className="border-b border-slate-200 px-5 py-4 font-semibold text-slate-900">{phone}</header>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-slate-50 p-5">
            {messages.data?.map((item) => <div key={item.id} className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${item.direction === "Outbound" ? "ml-auto bg-emerald-700 text-white" : "bg-white text-slate-800 shadow-sm"}`}>
              <p>{item.message}</p><time className="mt-1 block text-[11px] opacity-70">{new Date(item.createdAt).toLocaleString("pt-BR")}</time>
            </div>)}
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-slate-200 p-3">
            <input className="input flex-1" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={4096} placeholder="Digite uma mensagem" aria-label="Mensagem" />
            <button className="btn btn-primary" type="submit" disabled={sending || !message.trim()}>{sending ? "Enviando..." : "Enviar"}</button>
          </form>
        </>}
      </section>
    </div>
  );
}
