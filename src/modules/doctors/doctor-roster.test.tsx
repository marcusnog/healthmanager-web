import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import { DoctorRoster } from "@/modules/doctors/doctor-roster";
import { renderWithProviders } from "@/test/render";

const { doctorsCreate, doctorsUpdate } = vi.hoisted(() => ({
  doctorsCreate: vi.fn(),
  doctorsUpdate: vi.fn(),
}));

vi.mock("@/services/api", () => ({
  DefaultService: {
    doctorsCreate,
    doctorsUpdate,
  },
}));

describe("DoctorRoster", () => {
  beforeEach(() => {
    doctorsCreate.mockReset();
    doctorsUpdate.mockReset();
  });

  it("creates a doctor through the operational roster form", async () => {
    doctorsCreate.mockResolvedValueOnce({
      id: "doctor-2",
      name: "Dra. Lucia Prado",
      specialty: "Neurologia",
      crm: "CRM-SP-777777",
      phone: "11996665555",
      email: "lucia.prado@clinica.com",
      isActive: true,
    });

    renderWithProviders(<DoctorRoster doctors={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Novo medico" }));
    fireEvent.change(screen.getByLabelText("Nome"), {
      target: { value: "Dra. Lucia Prado" },
    });
    fireEvent.change(screen.getByLabelText("Especialidade"), {
      target: { value: "Neurologia" },
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
        specialty: "Neurologia",
        crm: "CRM-SP-777777",
        phone: "11996665555",
        email: "lucia.prado@clinica.com",
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
      specialty: "Cardiologia clinica",
      crm: "CRM-SP-123456",
      phone: "11994443322",
      email: "carlos.eduardo@clinica.com",
      isActive: true,
    });

    renderWithProviders(
      <DoctorRoster
        doctors={[
          {
            id: "doctor-1",
            name: "Dr. Henrique Lima",
            specialty: "Cardiologia",
            crm: "CRM-SP-123456",
            phone: "11998887766",
            email: "henrique@clinica.com",
            isActive: true,
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Editar medico" }));
    fireEvent.change(screen.getByLabelText("Nome"), {
      target: { value: "Dr. Carlos Eduardo" },
    });
    fireEvent.change(screen.getByLabelText("Especialidade"), {
      target: { value: "Cardiologia clinica" },
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
        specialty: "Cardiologia clinica",
        phone: "11994443322",
        email: "carlos.eduardo@clinica.com",
        isActive: true,
      }),
    );

    expect(
      await screen.findByText("Dr. Carlos Eduardo atualizado com sucesso."),
    ).toBeVisible();
  });
});
