import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { AtendimentoPanel } from "./atendimento-panel";

const api = vi.hoisted(() => ({ whatsappConversationsList: vi.fn(), whatsappMessagesList: vi.fn(), whatsappMessageSend: vi.fn() }));
vi.mock("@/generated", () => ({ DefaultService: api }));
const conversation = (phone: string, name: string) => ({ phone, patientName: name, lastMessage: "Olá", lastMessageAt: new Date().toISOString(), lastInboundAt: new Date().toISOString(), lastDirection: "Inbound" });
const sent = { id: "sent", phone: "5511999998888", message: "Resposta A", status: "Sent", direction: "Outbound", createdAt: new Date().toISOString() };

async function select(name: string) { fireEvent.click(await screen.findByRole("button", { name: new RegExp(name) })); }

describe("AtendimentoPanel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.whatsappConversationsList.mockResolvedValue({ items: [conversation("5511999998888", "Ana"), conversation("5511888887777", "Bruna")], total: 2, page: 1, pageSize: 20 });
    api.whatsappMessagesList.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 50 });
    api.whatsappMessageSend.mockResolvedValue(sent);
  });

  it("keeps drafts separate and does not clear another conversation after sending", async () => {
    let complete!: (value: typeof sent) => void;
    api.whatsappMessageSend.mockReturnValue(new Promise((resolve) => { complete = resolve; }));
    renderWithProviders(<AtendimentoPanel />);
    await select("Ana");
    fireEvent.change(screen.getByRole("textbox", { name: "Mensagem" }), { target: { value: "Resposta A" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar mensagem" }));
    await select("Bruna");
    fireEvent.change(screen.getByRole("textbox", { name: "Mensagem" }), { target: { value: "Rascunho B" } });
    await act(async () => complete(sent));
    expect(screen.getByRole("textbox", { name: "Mensagem" })).toHaveValue("Rascunho B");
    expect(api.whatsappMessageSend).toHaveBeenCalledWith("5511999998888", { message: "Resposta A", clientRequestId: expect.any(String) });
    await select("Ana");
    expect(screen.getByRole("textbox", { name: "Mensagem" })).toHaveValue("");
    await select("Bruna");
    expect(screen.getByRole("textbox", { name: "Mensagem" })).toHaveValue("Rascunho B");
  });

  it("reuses the attempt id after an uncertain HTTP error", async () => {
    api.whatsappMessageSend.mockRejectedValueOnce(new Error("Network"));
    renderWithProviders(<AtendimentoPanel />);
    await select("Ana");
    fireEvent.change(screen.getByRole("textbox", { name: "Mensagem" }), { target: { value: "Resposta A" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar mensagem" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("mesma tentativa");
    fireEvent.click(screen.getByRole("button", { name: "Enviar mensagem" }));
    await waitFor(() => expect(api.whatsappMessageSend).toHaveBeenCalledTimes(2));
    expect(api.whatsappMessageSend.mock.calls[0][1].clientRequestId).toBe(api.whatsappMessageSend.mock.calls[1][1].clientRequestId);
  });

  it("shows delivery failures and paginates older messages", async () => {
    api.whatsappMessagesList.mockImplementation((_phone, page) => Promise.resolve({ items: [{ ...sent, id: String(page), message: page === 1 ? "Recente" : "Antiga", status: "Failed" }], total: 2, page, pageSize: 1 }));
    renderWithProviders(<AtendimentoPanel />);
    await select("Ana");
    expect(await screen.findByText("Falha no envio")).toBeVisible();
    fireEvent.click(await screen.findByRole("button", { name: "Carregar mensagens anteriores" }));
    expect(await screen.findByText("Antiga")).toBeVisible();
    expect(api.whatsappMessagesList).toHaveBeenCalledWith("5511999998888", 2, 50);
  });

  it("blocks replies outside the service window", async () => {
    api.whatsappConversationsList.mockResolvedValue({ items: [{ ...conversation("5511999998888", "Ana"), lastInboundAt: new Date(Date.now() - 90_000_000).toISOString() }], total: 1, page: 1, pageSize: 20 });
    renderWithProviders(<AtendimentoPanel />);
    await select("Ana");
    fireEvent.change(screen.getByRole("textbox", { name: "Mensagem" }), { target: { value: "Olá" } });
    expect(screen.getByRole("button", { name: "Enviar mensagem" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Janela de resposta encerrada");
  });

  it("opens the reply window from newly received history even when the list snapshot is old", async () => {
    api.whatsappConversationsList.mockResolvedValue({ items: [{ ...conversation("5511999998888", "Ana"), lastInboundAt: null }], total: 1, page: 1, pageSize: 20 });
    api.whatsappMessagesList.mockResolvedValue({ items: [{ ...sent, direction: "Inbound", providerTimestamp: new Date().toISOString() }], total: 1, page: 1, pageSize: 50 });
    renderWithProviders(<AtendimentoPanel />);
    await select("Ana");
    await screen.findByText("Resposta A");
    fireEvent.change(screen.getByRole("textbox", { name: "Mensagem" }), { target: { value: "Olá" } });
    expect(screen.getByRole("button", { name: "Enviar mensagem" })).toBeEnabled();
  });
});
