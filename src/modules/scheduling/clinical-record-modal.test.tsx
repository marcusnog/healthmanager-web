import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { ClinicalRecordModal } from "@/modules/scheduling/clinical-record-modal";
import { renderWithProviders } from "@/test/render";

const { clinicalRecordCreate, clinicalRecordGet, clinicalRecordListAddendums } = vi.hoisted(() => ({
  clinicalRecordCreate: vi.fn(),
  clinicalRecordGet: vi.fn(),
  clinicalRecordListAddendums: vi.fn(),
}));

vi.mock("@/services/api", () => ({
  DefaultService: {
    clinicalRecordCreate,
    clinicalRecordGet,
    clinicalRecordListAddendums,
  },
}));

const appointment = { id: "appointment-1", patientId: "patient-1", doctorId: "doctor-1" };

describe("ClinicalRecordModal", () => {
  beforeEach(() => {
    clinicalRecordCreate.mockReset();
    clinicalRecordGet.mockReset();
    clinicalRecordListAddendums.mockReset();
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
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(clinicalRecordCreate).toHaveBeenCalledWith("appointment-1", {
      chiefComplaint: "Dor",
      history: undefined,
      physicalExam: undefined,
      assessment: undefined,
      plan: undefined,
    }));
  });
});
