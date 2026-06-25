import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import { AppointmentBoard } from "@/modules/scheduling/appointment-board";
import { renderWithProviders } from "@/test/render";

const { appointmentsCancel, appointmentsConfirm, appointmentsCreate } =
  vi.hoisted(() => ({
    appointmentsCancel: vi.fn(),
    appointmentsConfirm: vi.fn(),
    appointmentsCreate: vi.fn(),
  }));

vi.mock("@/services/api", () => ({
  DefaultService: {
    appointmentsCancel,
    appointmentsConfirm,
    appointmentsCreate,
  },
}));

describe("AppointmentBoard", () => {
  const baseProps = {
    appointmentDate: "2026-05-07",
    appointmentDoctorId: undefined,
    appointmentStatus: undefined as "Scheduled" | "Confirmed" | "Cancelled" | "Completed" | "NoShow" | undefined,
    doctors: [
      {
        id: "doctor-1",
        name: "Dra. Luciana Costa",
        crm: "CRM-SP-987654",
        specialty: "Dermatologia",
        phone: "11997776655",
        email: "luciana@clinica.com",
        isActive: true,
      },
    ],
    isLoading: false,
    onAppointmentDateChange: vi.fn(),
    onDoctorChange: vi.fn(),
    onPageChange: vi.fn(),
    onStatusChange: vi.fn(),
    page: 1,
    pageSize: 10,
    patients: [
      {
        id: "patient-1",
        name: "Marina Souza",
        cpf: "12345678901",
        phone: "11988880000",
        email: "marina@email.com",
        healthInsurance: "Particular",
        notes: "Paciente novo",
      },
    ],
    total: 0,
  };

  beforeEach(() => {
    appointmentsCancel.mockReset();
    appointmentsConfirm.mockReset();
    appointmentsCreate.mockReset();
    baseProps.onAppointmentDateChange.mockReset();
  });

  it("confirms a scheduled appointment from the operational board", async () => {
    appointmentsConfirm.mockResolvedValueOnce({
      id: "appointment-1",
      patientId: "patient-1",
      doctorId: "doctor-1",
      startAt: "2026-05-07T11:00:00Z",
      endAt: "2026-05-07T11:30:00Z",
      status: "Confirmed",
      confirmationStatus: "Confirmed",
      type: "Primeira consulta",
      amount: 250,
      notes: "Paciente novo",
    });

    renderWithProviders(
      <AppointmentBoard
        {...baseProps}
        appointments={[
          {
            id: "appointment-1",
            patientId: "patient-1",
            doctorId: "doctor-1",
            startAt: "2026-05-07T11:00:00Z",
            endAt: "2026-05-07T11:30:00Z",
            status: "Scheduled",
            confirmationStatus: "Pending",
            type: "Primeira consulta",
            amount: 250,
            notes: "Paciente novo",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() =>
      expect(appointmentsConfirm).toHaveBeenCalledWith("appointment-1"),
    );

    expect(
      await screen.findByText("Primeira consulta confirmada com sucesso."),
    ).toBeVisible();
  });

  it("cancels a scheduled appointment from the operational board", async () => {
    appointmentsCancel.mockResolvedValueOnce({
      id: "appointment-1",
      patientId: "patient-1",
      doctorId: "doctor-1",
      startAt: "2026-05-07T11:00:00Z",
      endAt: "2026-05-07T11:30:00Z",
      status: "Cancelled",
      confirmationStatus: "Pending",
      type: "Primeira consulta",
      amount: 250,
      notes: "Paciente novo",
    });

    renderWithProviders(
      <AppointmentBoard
        {...baseProps}
        appointments={[
          {
            id: "appointment-1",
            patientId: "patient-1",
            doctorId: "doctor-1",
            startAt: "2026-05-07T11:00:00Z",
            endAt: "2026-05-07T11:30:00Z",
            status: "Scheduled",
            confirmationStatus: "Pending",
            type: "Primeira consulta",
            amount: 250,
            notes: "Paciente novo",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() =>
      expect(appointmentsCancel).toHaveBeenCalledWith("appointment-1"),
    );

    expect(
      await screen.findByText("Primeira consulta cancelada com sucesso."),
    ).toBeVisible();
  });

  it("propagates agenda date changes and shows the empty state for a day without consultations", async () => {
    renderWithProviders(
      <AppointmentBoard
        {...baseProps}
        appointments={[]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Data da agenda"), {
      target: { value: "2026-05-08" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Dia anterior" }));
    fireEvent.click(screen.getByRole("button", { name: "Proximo dia" }));

    expect(baseProps.onAppointmentDateChange).toHaveBeenCalledWith("2026-05-08");
    expect(baseProps.onAppointmentDateChange).toHaveBeenCalledWith("2026-05-06");
    expect(baseProps.onAppointmentDateChange).toHaveBeenCalledWith("2026-05-08");
    expect(
      screen.getByText("Nenhuma consulta encontrada para a data selecionada."),
    ).toBeVisible();
  });
});
