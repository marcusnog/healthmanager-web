import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { ClinicalRecordModal } from "@/modules/scheduling/clinical-record-modal";
import { renderWithProviders } from "@/test/render";

const { clinicalRecordCreate, clinicalRecordUpdate, clinicalRecordGet, clinicalRecordListAddendums, productsList, packagesList } = vi.hoisted(() => ({
  clinicalRecordCreate: vi.fn(),
  clinicalRecordUpdate: vi.fn(),
  clinicalRecordGet: vi.fn(),
  clinicalRecordListAddendums: vi.fn(),
  productsList: vi.fn(),
  packagesList: vi.fn(),
}));

vi.mock("@/services/api", () => ({
  DefaultService: {
    clinicalRecordCreate,
    clinicalRecordUpdate,
    clinicalRecordGet,
    clinicalRecordListAddendums,
    productsList,
    packagesList,
  },
}));

const appointment = { id: "appointment-1", patientId: "patient-1", doctorId: "doctor-1" };

describe("ClinicalRecordModal", () => {
  beforeEach(() => {
    clinicalRecordCreate.mockReset();
    clinicalRecordGet.mockReset();
    clinicalRecordListAddendums.mockReset();
    productsList.mockResolvedValue({ items: [{ id: "product-1", name: "Vitamina D", price: 90, applicationCount: 1, isActive: true }] });
    packagesList.mockResolvedValue({ items: [{ id: "package-1", name: "Plano Vitamina", price: 320, isActive: true, items: [{ productId: "product-1", productName: "Vitamina D", applicationCount: 4 }] }] });
  });

  it("keeps an empty record read-only for administrative staff", async () => {
    clinicalRecordGet.mockRejectedValueOnce({ status: 404 });

    renderWithProviders(<ClinicalRecordModal appointment={appointment} canWrite={false} onClose={vi.fn()} />);

    expect(await screen.findByText("Nenhum prontuario registrado para esta consulta.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Criar prontuario" })).not.toBeInTheDocument();
  });

  it("allows the responsible doctor to create the record", async () => {
    clinicalRecordGet
      .mockRejectedValueOnce({ status: 404 })
      .mockResolvedValue({ id: "record-1", status: "Draft", chiefComplaint: "Dor" });
    clinicalRecordCreate.mockResolvedValueOnce({ id: "record-1", status: "Draft" });

    renderWithProviders(<ClinicalRecordModal appointment={appointment} canWrite onClose={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: "Criar prontuario" }));
    fireEvent.change(screen.getByLabelText("Queixa principal"), { target: { value: "Dor" } });
    fireEvent.change(screen.getByLabelText("Prontuário — texto livre"), { target: { value: "Texto livre\nSegunda linha" } });
    fireEvent.change(screen.getByLabelText("Receituário"), { target: { value: "Orientações" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(clinicalRecordCreate).toHaveBeenCalledWith("appointment-1", {
      chiefComplaint: "Dor",
      content: "Texto livre\nSegunda linha",
      prescription: "Orientações",
      history: "",
      physicalExam: "",
      assessment: "",
      plan: "",
    }));
  });

  it("clears saved text while preserving legacy fields", async () => {
    clinicalRecordGet.mockResolvedValue({ id: "record-1", status: "Draft", content: "Anterior", prescription: "Anterior", chiefComplaint: "Dor" });
    clinicalRecordUpdate.mockResolvedValue({ id: "record-1", status: "Draft" });
    renderWithProviders(<ClinicalRecordModal appointment={appointment} canWrite onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Editar" }));
    fireEvent.change(screen.getByLabelText("Prontuário — texto livre"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Receituário"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(clinicalRecordUpdate).toHaveBeenCalledWith("appointment-1", expect.objectContaining({ content: "", prescription: "", chiefComplaint: "Dor" })));
  });

  it("adds a catalog package to the prescription", async () => {
    clinicalRecordGet.mockRejectedValueOnce({ status: 404 });
    renderWithProviders(<ClinicalRecordModal appointment={appointment} canWrite onClose={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: "Criar prontuario" }));
    expect(await screen.findByText("Plano Vitamina")).toBeVisible();
    fireEvent.click(screen.getAllByRole("button", { name: "Anexar" })[1]);

    expect(screen.getByLabelText("Receituário")).toHaveValue("Plano Vitamina — Vitamina D: 4 aplicação(ões)");
  });
});
