import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import { ClinicalWorkspace, ClinicalDocumentPreview } from "./clinical-workspace";
import { ClinicalCatalog } from "./clinical-catalog";
import { renderWithProviders } from "@/test/render";

const api = vi.hoisted(() => ({ clinicalRecordGet: vi.fn(), clinicalEntriesHistory: vi.fn(), clinicalRecordListByPatient: vi.fn(), clinicalCatalogList: vi.fn(), clinicalEntriesCreate: vi.fn(), clinicalCatalogCreate: vi.fn() }));
vi.mock("@/services/api", () => ({ DefaultService: api }));
const appointment = { id: "appointment", patientId: "patient", patientName: "Paciente", doctorName: "Médico" };
beforeEach(() => {
  vi.clearAllMocks();
  api.clinicalRecordGet.mockResolvedValue({ status: "Draft" });
  api.clinicalEntriesHistory.mockResolvedValue({ items: [], total: 0 });
  api.clinicalRecordListByPatient.mockResolvedValue([]);
  api.clinicalCatalogList.mockResolvedValue([]);
});

it("registers a document snapshot with explicitly simulated digital signature", async () => {
  api.clinicalCatalogList.mockResolvedValue([{ id: "template", kind: "Document", title: "Orientações", content: "Olá {{paciente}}", folder: "Geral", fields: [] }]);
  api.clinicalEntriesCreate.mockResolvedValue({ id: "entry", kind: "Document", title: "Orientações", content: "Olá Paciente", signatureMode: "DigitalMock", createdAt: "2026-10-22T12:00:00Z" });
  renderWithProviders(<ClinicalWorkspace appointment={appointment} canWrite onClose={vi.fn()} />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Receituário e documentos" })).toBeEnabled(), { timeout: 3000 });
  fireEvent.click(screen.getByRole("button", { name: "Receituário e documentos" }));
  await screen.findByRole("option", { name: "Geral / Orientações" });
  expect(screen.getByRole("region", { name: "Histórico e digitação do prontuário" })).toBeVisible();
  expect(screen.getByText("Histórico clínico e documentos")).toBeVisible();
  expect(screen.getByText("Arquivos do paciente")).toBeVisible();
  expect(screen.getAllByRole("dialog")).toHaveLength(1);
  expect(within(screen.getByRole("navigation", { name: "Opções do atendimento" })).getByRole("button", { name: "Receituário e documentos" })).toBeVisible();
  expect(within(screen.getByRole("region", { name: "Histórico do paciente" })).getByText("Histórico clínico e documentos")).toBeVisible();
  expect(within(screen.getByRole("region", { name: "Digitação do prontuário" })).getByLabelText("Conteúdo / observações")).toBeVisible();
  fireEvent.change(screen.getByLabelText("Modelo / cadastro"), { target: { value: "template" } });
  fireEvent.change(screen.getByLabelText("Forma de assinatura"), { target: { value: "DigitalMock" } });
  fireEvent.click(screen.getByRole("button", { name: "Registrar no histórico" }));
  await waitFor(() => expect(api.clinicalEntriesCreate).toHaveBeenCalledWith("appointment", expect.objectContaining({ kind: "Document", catalogItemId: "template", signatureMode: "DigitalMock", content: "Olá {{paciente}}" })));
  expect(await screen.findByText(/ASSINATURA DIGITAL SIMULADA/)).toBeVisible();
});

it("keeps finalized records read-only and does not offer percentiles", async () => {
  api.clinicalRecordGet.mockResolvedValue({ status: "Finalized" });
  renderWithProviders(<ClinicalWorkspace appointment={appointment} canWrite onClose={vi.fn()} />);
  expect(await screen.findByText(/Prontuário finalizado/)).toBeVisible();
  expect(screen.getByRole("button", { name: "Receituário e documentos" })).toBeDisabled();
  expect(screen.queryByText("Percentis")).not.toBeInTheDocument();
});

it("saves a personal catalog item with its actual content", async () => {
  api.clinicalCatalogCreate.mockResolvedValue({ id: "template" });
  renderWithProviders(<ClinicalCatalog isDoctor />);
  fireEvent.click(screen.getByRole("button", { name: "Novo cadastro" }));
  fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Declaração" } });
  fireEvent.change(screen.getByLabelText("Conteúdo / orientações"), { target: { value: "Compareceu em {{data}}" } });
  fireEvent.change(screen.getByLabelText("Disponibilidade"), { target: { value: "personal" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar cadastro" }));
  await waitFor(() => expect(api.clinicalCatalogCreate).toHaveBeenCalledWith(expect.objectContaining({ personal: true, kind: "Document", title: "Declaração", content: "Compareceu em {{data}}" })));
});

it("prints only the saved document with the mock watermark", () => {
  let printed = "";
  vi.spyOn(window, "print").mockImplementation(() => { printed = document.querySelector("#clinical-document-print")?.textContent ?? ""; });
  renderWithProviders(<ClinicalDocumentPreview entry={{ title: "Documento", content: "Texto salvo", signatureMode: "DigitalMock", createdAt: "2026-10-22T12:00:00Z" }} onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Imprimir / salvar PDF" }));
  expect(printed).toContain("Texto salvo");
  expect(printed).toContain("SEM VALIDADE DE ASSINATURA");
  expect(document.querySelector("#clinical-document-print")).not.toBeInTheDocument();
});


it("organizes prescription documents by folder and creates in the selected folder", async () => {
  api.clinicalCatalogList.mockResolvedValue([
    { id: "a", kind: "Document", title: "Modelo A", folder: "Orientações", fields: [] },
    { id: "b", kind: "Document", title: "Modelo B", folder: "Receitas", fields: [] },
  ]);
  renderWithProviders(<ClinicalCatalog isDoctor mode="documents" />);
  fireEvent.click(await screen.findByRole("button", { name: "Receitas" }));
  expect(screen.getByText("Modelo B")).toBeVisible();
  expect(screen.queryByText("Modelo A")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Planilha de exames" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Novo receituário" }));
  expect(screen.getByLabelText("Pasta")).toHaveValue("Receitas");
  fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Novo modelo" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar cadastro" }));
  await waitFor(() => expect(api.clinicalCatalogCreate).toHaveBeenCalledWith(expect.objectContaining({ kind: "Document", folder: "Receitas", title: "Novo modelo" })));
});


it("opens a prescription beside its folders and guards unsaved edits", async () => {
  api.clinicalCatalogList.mockResolvedValue([
    { id: "a", kind: "Document", title: "Modelo A", content: "Texto original", folder: "Receitas", fields: [] },
    { id: "b", kind: "Document", title: "Modelo B", content: "Outro texto", folder: "Receitas", fields: [] },
  ]);
  renderWithProviders(<ClinicalCatalog isDoctor mode="documents" />);
  fireEvent.click(await screen.findByRole("button", { name: "Modelo A" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Editor de receituário" })).toBeVisible();
  expect(screen.getByLabelText("Conteúdo / orientações")).toHaveValue("Texto original");
  fireEvent.change(screen.getByLabelText("Conteúdo / orientações"), { target: { value: "Alteração" } });
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  fireEvent.click(screen.getByRole("button", { name: "Modelo B" }));
  expect(confirm).toHaveBeenCalled();
  expect(screen.getByLabelText("Título")).toHaveValue("Modelo A");
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "Modelo B" }));
  expect(screen.getByLabelText("Conteúdo / orientações")).toHaveValue("Outro texto");
  confirm.mockRestore();
});


it("keeps unsaved clinical text when switching sections is cancelled", async () => {
  renderWithProviders(<ClinicalWorkspace appointment={appointment} canWrite onClose={vi.fn()} />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Receituário e documentos" })).toBeEnabled(), { timeout: 3000 });
  fireEvent.click(screen.getByRole("button", { name: "Receituário e documentos" }));
  fireEvent.change(screen.getByLabelText("Conteúdo / observações"), { target: { value: "Texto ainda não salvo" } });
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  fireEvent.click(screen.getByRole("button", { name: "Solicitação de exames" }));
  expect(confirm).toHaveBeenCalled();
  expect(screen.getByLabelText("Conteúdo / observações")).toHaveValue("Texto ainda não salvo");
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "Solicitação de exames" }));
  expect(screen.getByLabelText("Conteúdo / observações")).toHaveValue("");
  confirm.mockRestore();
});
