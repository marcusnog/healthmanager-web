import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, vi } from "vitest";
import { PatientList } from "@/modules/patients/patient-list";
import { renderWithProviders } from "@/test/render";

const {
  patientsDelete,
  patientsCreate,
  patientsDocumentsDelete,
  patientsDocumentsList,
  patientsDocumentsUpload,
  patientsDocumentsDownload,
  patientsUpdate,
  addressFindByCep,
  healthInsurancesList,
} = vi.hoisted(() => ({
  patientsDelete: vi.fn(),
  patientsCreate: vi.fn(),
  patientsDocumentsDelete: vi.fn(),
  patientsDocumentsList: vi.fn(),
  patientsDocumentsUpload: vi.fn(),
  patientsDocumentsDownload: vi.fn(),
  patientsUpdate: vi.fn(),
  addressFindByCep: vi.fn(),
  healthInsurancesList: vi.fn().mockResolvedValue({ items: [{ id: "hi-1", name: "Particular Premium" }], page: 1, pageSize: 200, total: 1 }),
}));

vi.mock("@/services/api", () => ({
  DefaultService: {
    patientsDelete,
    patientsCreate,
    patientsDocumentsDelete,
    patientsDocumentsList,
    patientsDocumentsUpload,
    patientsUpdate,
    addressFindByCep,
  },
  healthInsurancesList,
  patientsDocumentsDownload,
}));

describe("PatientList", () => {
  let anchorClickSpy: ReturnType<typeof vi.spyOn>;

  const baseProps = {
    email: "",
    healthInsurance: "",
    isLoading: false,
    onEmailChange: vi.fn(),
    onHealthInsuranceChange: vi.fn(),
    onPageChange: vi.fn(),
    onSearchChange: vi.fn(),
    onSortByChange: vi.fn(),
    onSortDirectionChange: vi.fn(),
    page: 1,
    pageSize: 10,
    search: "",
    sortBy: "name",
    sortDirection: "asc",
    total: 1,
  };

  beforeEach(() => {
    patientsDelete.mockReset();
    patientsCreate.mockReset();
    patientsDocumentsDelete.mockReset();
    patientsDocumentsList.mockReset();
    patientsDocumentsUpload.mockReset();
    patientsUpdate.mockReset();
    patientsDocumentsDownload.mockReset();
    baseProps.onPageChange.mockReset();
    baseProps.onSearchChange.mockReset();
    anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(() => "blob:healthmanager"),
    });

    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    anchorClickSpy.mockRestore();
  });

  it("downloads a listed patient document using the authenticated API helper", async () => {
    patientsDocumentsList.mockResolvedValueOnce([
      {
        id: "document-1",
        fileName: "laudo.pdf",
        contentType: "application/pdf",
        sizeInBytes: 2048,
        storagePath: "clinics/clinic-1/patients/patient-1/laudo.pdf",
      },
    ]);
    patientsDocumentsDownload.mockResolvedValueOnce(
      new Blob(["pdf-demo"], { type: "application/pdf" }),
    );

    renderWithProviders(
      <PatientList
        {...baseProps}
        patients={[
          {
            id: "patient-1",
            name: "Ana Martins",
            cpf: "12345678900",
            phone: "11999998888",
            email: "ana@email.com",
            healthInsurance: "Particular",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Documentos" }));

    expect(
      await screen.findByRole("heading", {
        name: "laudo.pdf",
      }),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Baixar" }));

    await waitFor(() =>
      expect(patientsDocumentsDownload).toHaveBeenCalledWith(
        "patient-1",
        "document-1",
      ),
    );

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:healthmanager");
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText("Download iniciado para laudo.pdf."),
    ).toBeVisible();
  });

  it("keeps the document available for retry after a download error", async () => {
    patientsDocumentsList.mockResolvedValueOnce([{ id: "document-1", fileName: "laudo.pdf" }]);
    patientsDocumentsDownload.mockRejectedValueOnce(new Error("Download unavailable"));
    renderWithProviders(<PatientList {...baseProps} patients={[{ id: "patient-1", name: "Paciente" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Documentos" }));
    fireEvent.click(await screen.findByRole("button", { name: "Baixar" }));
    expect(await screen.findByText("Nao foi possivel baixar o documento agora.")).toBeVisible();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Baixar" })).toBeEnabled();
  });

  it("removes a listed patient document and refreshes the document list", async () => {
    patientsDocumentsList
      .mockResolvedValueOnce([
        {
          id: "document-1",
          fileName: "laudo.pdf",
          contentType: "application/pdf",
          sizeInBytes: 2048,
          storagePath: "clinics/clinic-1/patients/patient-1/laudo.pdf",
        },
      ])
      .mockResolvedValueOnce([]);
    patientsDocumentsDelete.mockResolvedValueOnce(undefined);

    renderWithProviders(
      <PatientList
        {...baseProps}
        patients={[
          {
            id: "patient-1",
            name: "Ana Martins",
            cpf: "12345678900",
            phone: "11999998888",
            email: "ana@email.com",
            healthInsurance: "Particular",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Documentos" }));

    expect(
      await screen.findByRole("heading", {
        name: "laudo.pdf",
      }),
    ).toBeVisible();

    fireEvent.click(screen.getAllByRole("button", { name: "Excluir" })[0]);

    await waitFor(() =>
      expect(patientsDocumentsDelete).toHaveBeenCalledWith(
        "patient-1",
        "document-1",
      ),
    );

    expect(
      await screen.findByText("laudo.pdf removido com sucesso."),
    ).toBeVisible();
    expect(
      await screen.findByText(
        "Nenhum documento registrado para este paciente ainda.",
      ),
    ).toBeVisible();
  });

  it("updates a patient card and sends the safe editable fields to the API", async () => {
    patientsUpdate.mockResolvedValueOnce({
      id: "patient-1",
      name: "Ana Martins Atualizada",
      cpf: "12345678900",
      phone: "11988887777",
      email: "ana.atualizada@email.com",
      healthInsurance: "Particular Premium",
      notes: "Observacao ajustada.",
    });

    renderWithProviders(
      <PatientList
        {...baseProps}
        patients={[
          {
            id: "patient-1",
            name: "Ana Martins",
            cpf: "12345678900",
            phone: "11999998888",
            email: "ana@email.com",
            healthInsurance: "Particular",
            notes: "Observacao original.",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Editar cadastro" }));

    fireEvent.change(screen.getByLabelText("Nome"), {
      target: { value: "Ana Martins Atualizada" },
    });
    fireEvent.change(screen.getByLabelText("Telefone"), {
      target: { value: "(11) 98888-7777" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ana.atualizada@email.com" },
    });
    fireEvent.change(screen.getByLabelText("Observacoes"), {
      target: { value: "Observacao ajustada." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Salvar alteracoes" }));

    await waitFor(() =>
      expect(patientsUpdate).toHaveBeenCalledWith("patient-1", expect.objectContaining({
        name: "Ana Martins Atualizada",
        phone: "11988887777",
        email: "ana.atualizada@email.com",
        healthInsuranceId: undefined,
        notes: "Observacao ajustada.",
      })),
    );

    expect(
      await screen.findByText("Ana Martins Atualizada atualizado com sucesso."),
    ).toBeVisible();
  });

  it("hides patient deletion from non-admin users", () => {
    renderWithProviders(<PatientList {...baseProps} patients={[{ id: "patient-1", name: "Paciente" }]} />);
    expect(screen.queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument();
  });

  it("shows the pending payment reason when admin deletion is blocked", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    patientsDelete.mockRejectedValueOnce({ body: { detail: "Nao e possivel excluir paciente com pagamento pendente." } });
    renderWithProviders(<PatientList {...baseProps} canDeletePatient patients={[{ id: "patient-1", name: "Paciente" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(await screen.findByText("Nao e possivel excluir paciente com pagamento pendente.")).toBeVisible();
    expect(patientsDelete).toHaveBeenCalledWith("patient-1");
    expect(screen.getByText("Paciente")).toBeVisible();
    confirm.mockRestore();
  });

  it("fills address fields after looking up a CEP", async () => {
    addressFindByCep.mockResolvedValueOnce({
      zipCode: "01001000", street: "Praca da Se", neighborhood: "Se",
      city: "Sao Paulo", state: "SP",
    });
    renderWithProviders(<PatientList {...baseProps} patients={[]} total={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Novo paciente" }));
    fireEvent.change(screen.getByLabelText("CEP"), { target: { value: "01001000" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar endereco" }));
    await waitFor(() => expect(addressFindByCep).toHaveBeenCalledWith("01001000"));
    expect(screen.getByLabelText("Logradouro")).toHaveValue("Praca da Se");
    expect(screen.getByLabelText("Bairro")).toHaveValue("Se");
    expect(screen.getByLabelText("Cidade")).toHaveValue("Sao Paulo");
    expect(screen.getByLabelText("Estado")).toHaveValue("SP");
  });

  it("creates a patient with only their name", async () => {
    patientsCreate.mockResolvedValueOnce({ id: "quick-patient", name: "Maria Silva", cpf: "", phone: "" });
    renderWithProviders(<PatientList {...baseProps} patients={[]} total={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Novo paciente" }));
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Maria Silva" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar paciente" }));
    await waitFor(() => expect(patientsCreate).toHaveBeenCalledWith(expect.objectContaining({ name: "Maria Silva", cpf: "", phone: "" })));
  });

  it("still rejects an invalid CPF or phone when supplied", async () => {
    renderWithProviders(<PatientList {...baseProps} patients={[]} total={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Novo paciente" }));
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Maria Silva" } });
    fireEvent.change(screen.getByLabelText("CPF"), { target: { value: "123" } });
    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar paciente" }));
    expect(await screen.findByText("CPF invalido.")).toBeVisible();
    expect(await screen.findByText("Informe um telefone valido.")).toBeVisible();
    expect(patientsCreate).not.toHaveBeenCalled();
  });

  it("shows the API reason when patient creation is rejected", async () => {
    patientsCreate.mockRejectedValueOnce({
      body: { detail: "Paciente ja cadastrado para esta clinica." },
    });
    renderWithProviders(<PatientList {...baseProps} patients={[]} total={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Novo paciente" }));
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Maria Silva" } });
    fireEvent.change(screen.getByLabelText("CPF"), { target: { value: "93541134780" } });
    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "11999998888" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar paciente" }));

    expect(await screen.findByText("Paciente ja cadastrado para esta clinica.")).toBeVisible();
  });

  it("propagates search and pagination interactions to the parent workspace", async () => {
    renderWithProviders(
      <PatientList
        {...baseProps}
        page={2}
        pageSize={3}
        patients={[]}
        total={8}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Buscar por nome, CPF ou telefone"), {
      target: { value: "Ana" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
    fireEvent.click(screen.getByRole("button", { name: "Proxima" }));

    expect(baseProps.onSearchChange).toHaveBeenCalledWith("Ana");
    expect(baseProps.onPageChange).toHaveBeenCalledWith(1);
    expect(baseProps.onPageChange).toHaveBeenCalledWith(3);
    expect(
      screen.getByText("Nenhum paciente encontrado para os filtros atuais."),
    ).toBeVisible();
  });
});
