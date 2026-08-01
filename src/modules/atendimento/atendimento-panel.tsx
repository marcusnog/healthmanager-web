"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { DefaultService } from "@/generated";

const timeFormatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
const dayFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

function conversationTime(value: string) {
  const date = new Date(value);
  return date.toDateString() === new Date().toDateString() ? timeFormatter.format(date) : dayFormatter.format(date);
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function Icon({ name, className = "h-5 w-5" }: { name: "back" | "check" | "message" | "search" | "send"; className?: string }) {
  const paths = {
    back: <path d="m15 18-6-6 6-6" />,
    check: <path d="m5 12 4 4L19 6" />,
    message: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
  };
  return <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function AtendimentoPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [phone, setPhone] = useState<string>();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const conversations = useQuery({ queryKey: ["whatsapp-conversations", search], queryFn: () => DefaultService.whatsappConversationsList(1, 100, search) });
  const messages = useQuery({ queryKey: ["whatsapp-messages", phone], queryFn: () => DefaultService.whatsappMessagesList(phone!), enabled: Boolean(phone), refetchInterval: 10_000 });
  const selected = conversations.data?.items.find((item) => item.phone === phone);
  const displayName = selected?.patientName || phone || "";

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!phone || !message.trim()) return;
    setSending(true);
    setSendError("");
    try {
      await DefaultService.whatsappMessageSend(phone, { message: message.trim() });
      setMessage("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["whatsapp-messages", phone] }),
        queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] }),
      ]);
    } catch {
      setSendError("Não foi possível enviar. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid h-[calc(100vh-148px)] min-h-[560px] overflow-hidden rounded-2xl border border-border bg-surface shadow-sm md:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)_260px]">
      <aside className={`${phone ? "hidden md:flex" : "flex"} min-h-0 flex-col border-border md:border-r`}>
        <div className="border-b border-border px-4 pb-4 pt-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">Conversas</h2>
              <p className="text-xs text-muted">Atendimento via WhatsApp</p>
            </div>
            <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-strong">{conversations.data?.total ?? 0}</span>
          </div>
          <label className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 text-muted focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
            <Icon name="search" className="h-4 w-4 shrink-0" />
            <input className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-muted-light" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar conversa" aria-label="Buscar conversas" />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {conversations.isLoading && <p className="p-6 text-center text-sm text-muted">Carregando conversas...</p>}
          {conversations.isError && <p className="p-6 text-center text-sm text-danger">Não foi possível carregar as conversas.</p>}
          {conversations.data?.items.map((item) => {
            const name = item.patientName || item.phone;
            const active = phone === item.phone;
            return (
              <button key={item.phone} type="button" onClick={() => setPhone(item.phone)} className={`group flex w-full gap-3 border-b border-border/60 px-4 py-3.5 text-left transition-colors hover:bg-brand/5 ${active ? "bg-brand/10" : ""}`}>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${active ? "bg-brand text-white" : "bg-brand-soft text-brand-strong"}`}>{initials(name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <strong className="truncate text-sm font-semibold text-ink">{name}</strong>
                    <time className={`shrink-0 text-[11px] ${active ? "text-brand-strong" : "text-muted"}`}>{conversationTime(item.lastMessageAt)}</time>
                  </span>
                  <span className="mt-1 flex items-center gap-1 text-sm text-muted">
                    {item.lastDirection === "Outbound" && <Icon name="check" className="h-3.5 w-3.5 shrink-0 text-brand" />}
                    <span className="truncate">{item.lastMessage}</span>
                  </span>
                </span>
              </button>
            );
          })}
          {!conversations.isLoading && !conversations.isError && !conversations.data?.items.length && <p className="p-8 text-center text-sm text-muted">Nenhuma conversa encontrada.</p>}
        </div>
      </aside>

      <section className={`${phone ? "flex" : "hidden md:flex"} min-h-0 min-w-0 flex-col bg-bg`}>
        {!phone ? (
          <div className="m-auto flex max-w-sm flex-col items-center px-8 text-center">
            <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-brand"><Icon name="message" className="h-8 w-8" /></span>
            <h2 className="text-lg font-semibold text-ink">Atendimento centralizado</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Selecione uma conversa para visualizar o histórico e responder ao paciente.</p>
          </div>
        ) : <>
          <header className="flex h-[73px] shrink-0 items-center gap-3 border-b border-border bg-surface px-4 md:px-5">
            <button type="button" onClick={() => setPhone(undefined)} className="-ml-2 rounded-lg p-2 text-muted hover:bg-bg md:hidden" aria-label="Voltar para conversas"><Icon name="back" /></button>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-strong">{initials(displayName)}</span>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-ink">{displayName}</h2>
              <p className="flex items-center gap-1.5 text-xs text-muted"><span className="h-1.5 w-1.5 rounded-full bg-success" />Canal WhatsApp</p>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-brand/5 p-4 md:p-6">
            <div className="mx-auto mb-2 rounded-full bg-surface px-3 py-1 text-[11px] font-medium text-muted shadow-sm">Histórico da conversa</div>
            {messages.isLoading && <p className="m-auto text-sm text-muted">Carregando mensagens...</p>}
            {messages.isError && <p className="m-auto text-sm text-danger">Não foi possível carregar as mensagens.</p>}
            {messages.data?.map((item) => {
              const outbound = item.direction === "Outbound";
              return (
                <div key={item.id} className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm md:max-w-[72%] ${outbound ? "ml-auto rounded-br-md bg-brand text-white" : "rounded-bl-md border border-border/70 bg-surface text-ink"}`}>
                  <p className="whitespace-pre-wrap break-words leading-5">{item.message}</p>
                  <span className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${outbound ? "text-white/75" : "text-muted"}`}>
                    {timeFormatter.format(new Date(item.createdAt))}
                    {outbound && <Icon name="check" className={`h-3 w-3 ${item.status === "Failed" ? "text-red-200" : ""}`} />}
                  </span>
                </div>
              );
            })}
            {!messages.isLoading && !messages.isError && !messages.data?.length && <p className="m-auto text-sm text-muted">Ainda não há mensagens nesta conversa.</p>}
          </div>

          <form onSubmit={send} className="shrink-0 border-t border-border bg-surface p-3 md:px-4">
            {sendError && <p className="mb-2 text-xs text-danger" role="alert">{sendError}</p>}
            <div className="flex items-end gap-2">
              <textarea className="input-field max-h-28 min-h-11 flex-1 resize-none py-2.5" rows={1} value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4096} placeholder="Digite uma mensagem" aria-label="Mensagem" />
              <button className="btn btn-primary h-11 w-11 shrink-0 rounded-full p-0" type="submit" disabled={sending || !message.trim()} aria-label={sending ? "Enviando mensagem" : "Enviar mensagem"}><Icon name="send" className="h-5 w-5" /></button>
            </div>
          </form>
        </>}
      </section>

      <aside className="hidden min-h-0 border-l border-border bg-surface xl:flex xl:flex-col">
        {phone && <>
          <div className="flex flex-col items-center border-b border-border px-5 py-7 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-xl font-semibold text-white">{initials(displayName)}</span>
            <strong className="mt-3 text-sm text-ink">{displayName}</strong>
            {selected?.patientName && <span className="mt-1 text-xs text-muted">{phone}</span>}
          </div>
          <div className="space-y-5 p-5">
            <div><p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Canal</p><p className="mt-1.5 flex items-center gap-2 text-sm text-ink"><span className="h-2 w-2 rounded-full bg-success" />WhatsApp</p></div>
            <div><p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Última interação</p><p className="mt-1.5 text-sm text-ink">{selected ? new Date(selected.lastMessageAt).toLocaleString("pt-BR") : "—"}</p></div>
            <div className="rounded-xl bg-brand/5 p-3 text-xs leading-5 text-muted">As mensagens são sincronizadas automaticamente a cada 10 segundos.</div>
          </div>
        </>}
      </aside>
    </div>
  );
}
