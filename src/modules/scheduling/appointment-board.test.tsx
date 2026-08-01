import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import { AppointmentBoard } from "@/modules/scheduling/appointment-board";
import { renderWithProviders } from "@/test/render";

const { appointmentsCancel, appointmentsConfirm, appointmentsCreate, appointmentsUpdate, paymentsCreate } =
  vi.hoisted(() => ({
    appointmentsCancel: vi.fn(),
    appointmentsConfirm: vi.fn(),
    appointmentsCreate: vi.fn(),
    appointmentsUpdate: vi.fn(),
    paymentsCreate: vi.fn(),
  }));

vi.mock("@/services/api", () => ({
  DefaultService: {
    appointmentsCancel,
    appointmentsConfirm,
    appointmentsCreate,
    appointmentsUpdate,
    paymentsCreate,
  },
}));

describe("AppointmentBoard", () => {
  const baseProps = {
    appointmentDate: "2026-05-07",
    appointmentDoctorId: undefined,
    appointmentStatus: undefined as "Scheduled" | "Confirmed" | "Cancelled" | "Completed" | "NoShow" | undefined,
    appointmentTypes: [
      { id: "type-return", name: "Retorno" },
      { id: "type-first", name: "Primeira consulta" },
    ],
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
    appointmentsUpdate.mockReset();
    paymentsCreate.mockReset();
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

    fireEvent.click(screen.getByRole("button", { name: "Remarcou" }));

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

  it("shows the doctor and opens editing from the weekly view", () => {
    renderWithProviders(
      <AppointmentBoard
        {...baseProps}
        appointmentDateFrom="2026-05-04"
        appointmentDateTo="2026-05-10"
        appointmentViewMode="week"
        appointments={[{
          id: "appointment-1",
          patientId: "patient-1",
          doctorId: "doctor-1",
          startAt: "2026-05-07T11:00:00Z",
          endAt: "2026-05-07T11:30:00Z",
          status: "Scheduled",
          appointmentTypeId: "type-return",
          type: "Retorno",
          amount: 180,
        }]}
      />,
    );

    expect(screen.getAllByText("Dra. Luciana Costa")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Editar consulta de Marina Souza" }));
    expect(screen.getByRole("heading", { name: "Editar consulta" })).toBeVisible();
  });

  it("keeps the edit modal open and shows the scheduling conflict", async () => {
    appointmentsUpdate.mockRejectedValueOnce({
      body: { detail: "Conflito de horario para o medico selecionado." },
    });

    renderWithProviders(
      <AppointmentBoard
        {...baseProps}
        appointments={[{
          id: "appointment-1",
          patientId: "patient-1",
          doctorId: "doctor-1",
          startAt: "2026-05-07T11:00:00Z",
          endAt: "2026-05-07T11:30:00Z",
          status: "Scheduled",
          type: "Retorno",
          amount: 180,
        }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.change(screen.getByLabelText("Inicio"), { target: { value: "2026-05-08T11:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alteracoes" }));

    expect(await screen.findByText("Conflito de horario para o medico selecionado.")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Editar consulta" })).toBeVisible();
  });

  it("does not shift the appointment time when another field is edited", async () => {
    appointmentsUpdate.mockResolvedValueOnce({});
    renderWithProviders(
      <AppointmentBoard
        {...baseProps}
        appointments={[{
          id: "appointment-1",
          patientId: "patient-1",
          doctorId: "doctor-1",
          startAt: "2026-05-07T11:00:00Z",
          endAt: "2026-05-07T11:30:00Z",
          status: "Scheduled",
          type: "Retorno",
          amount: 180,
        }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "type-first" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alteracoes" }));

    await waitFor(() => expect(appointmentsUpdate).toHaveBeenCalledWith(
      "appointment-1",
      { appointmentTypeId: "type-first" },
    ));
  });

  it("registers the remaining appointment payment from the patient card", async () => {
    paymentsCreate.mockResolvedValueOnce({});
    renderWithProviders(
      <AppointmentBoard
        {...baseProps}
        appointments={[
          { id: "appointment-1", patientId: "patient-1", doctorId: "doctor-1", startAt: "2026-05-07T11:00:00Z", status: "InProgress", amount: 250 },
          { id: "appointment-2", patientId: "patient-1", doctorId: "doctor-1", startAt: "2026-05-07T12:00:00Z", status: "Scheduled", amount: 250 },
        ]}
        receivables={[
          { id: "receivable-1", appointmentId: "appointment-1", receivedAmount: 100, outstandingAmount: 150, status: "Partial" },
          { id: "receivable-2", appointmentId: "appointment-2", receivedAmount: 0, outstandingAmount: 250, status: "Pending" },
        ]}
      />,
    );

    const receiveButtons = screen.getAllByRole("button", { name: "Receber saldo" });
    expect(receiveButtons).toHaveLength(1);
    fireEvent.click(receiveButtons[0]);
    expect(screen.getByRole("spinbutton", { name: "Valor recebido" })).toHaveValue(150);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar recebimento" }));

    await waitFor(() => expect(paymentsCreate).toHaveBeenCalledWith(expect.objectContaining({
      receivableId: "receivable-1",
      amount: 150,
      paymentMethod: "Pix",
    })));
    expect(await screen.findByText("Pagamento restante registrado com sucesso.")).toBeVisible();
  });
});
