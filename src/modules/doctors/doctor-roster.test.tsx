import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import { DoctorRoster } from "@/modules/doctors/doctor-roster";
import { renderWithProviders } from "@/test/render";

const { doctorsCreate, doctorsUpdate, doctorsDelete, specialtiesList } = vi.hoisted(() => ({
  doctorsCreate: vi.fn(),
  doctorsUpdate: vi.fn(),
  doctorsDelete: vi.fn(),
  specialtiesList: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 200, total: 0 }),
}));

vi.mock("@/services/api", () => ({
  DefaultService: {
    doctorsCreate,
    doctorsUpdate,
    doctorsDelete,
  },
  specialtiesList,
}));

const defaultProps = {
  search: "",
  page: 1,
  pageSize: 10,
  total: 0,
  isLoading: false,
  onSearchChange: vi.fn(),
  onPageChange: vi.fn(),
};

describe("DoctorRoster", () => {
  beforeEach(() => {
    doctorsCreate.mockReset();
    doctorsUpdate.mockReset();
    doctorsDelete.mockReset();
  });

  it("creates a doctor through the operational roster form", async () => {
    doctorsCreate.mockResolvedValueOnce({
      id: "doctor-2",
      name: "Dra. Lucia Prado",
      crm: "CRM-SP-777777",
      phone: "11996665555",
      email: "lucia.prado@clinica.com",
      isActive: true,
      specialties: [],
    });

    renderWithProviders(<DoctorRoster doctors={[]} {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Novo medico" }));
    fireEvent.change(screen.getByLabelText("Nome"), {
      target: { value: "Dra. Lucia Prado" },
    });
    fireEvent.change(screen.getByLabelText("CRM"), {
      target: { value: "CRM-SP-777777" },
    });
    fireEvent.change(screen.getByLabelText("Telefone"), {
      target: { value: "11996665555" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "lucia.prado@clinica.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Salvar medico" }));

    await waitFor(() =>
      expect(doctorsCreate).toHaveBeenCalledWith({
        name: "Dra. Lucia Prado",
        crm: "CRM-SP-777777",
        phone: "11996665555",
        email: "lucia.prado@clinica.com",
        specialtyIds: undefined,
      }),
    );

    expect(
      await screen.findByText("Medico cadastrado com sucesso."),
    ).toBeVisible();
  });

  it("updates an existing doctor inline", async () => {
    doctorsUpdate.mockResolvedValueOnce({
      id: "doctor-1",
      name: "Dr. Carlos Eduardo",
      crm: "CRM-SP-123456",
      phone: "11994443322",
      email: "carlos.eduardo@clinica.com",
      isActive: true,
      specialties: [],
    });

    renderWithProviders(
      <DoctorRoster
        doctors={[
          {
            id: "doctor-1",
            name: "Dr. Henrique Lima",
            crm: "CRM-SP-123456",
            phone: "11998887766",
            email: "henrique@clinica.com",
            isActive: true,
            specialties: [{ id: "spec-1", name: "Cardiologia" }],
          },
        ]}
        {...defaultProps}
        total={1}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.change(screen.getByLabelText("Nome"), {
      target: { value: "Dr. Carlos Eduardo" },
    });
    fireEvent.change(screen.getByLabelText("Telefone"), {
      target: { value: "11994443322" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "carlos.eduardo@clinica.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Salvar alteracoes" }));

    await waitFor(() =>
      expect(doctorsUpdate).toHaveBeenCalledWith("doctor-1", {
        name: "Dr. Carlos Eduardo",
        phone: "11994443322",
        email: "carlos.eduardo@clinica.com",
        isActive: true,
        specialtyIds: ["spec-1"],
      }),
    );

    expect(
      await screen.findByText("Dr. Carlos Eduardo atualizado com sucesso."),
    ).toBeVisible();
  });
});
