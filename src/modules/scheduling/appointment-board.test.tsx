import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import { AppointmentBoard } from "@/modules/scheduling/appointment-board";
import { renderWithProviders } from "@/test/render";

const { appointmentsCancel, appointmentsConfirm, appointmentsCreate, appointmentsCreateGroup, appointmentsUpdate, paymentsCreate, patientsCreate, healthInsurancesList } =
  vi.hoisted(() => ({
    appointmentsCancel: vi.fn(),
    appointmentsConfirm: vi.fn(),
    appointmentsCreate: vi.fn(),
    appointmentsCreateGroup: vi.fn(),
    appointmentsUpdate: vi.fn(),
    paymentsCreate: vi.fn(),
    patientsCreate: vi.fn(),
    healthInsurancesList: vi.fn(),
  }));

vi.mock("@/services/api", () => ({
  DefaultService: {
    appointmentsCancel,
    appointmentsConfirm,
    appointmentsCreate,
    appointmentsCreateGroup,
    appointmentsUpdate,
    paymentsCreate,
    patientsCreate,
  },
  healthInsurancesList,
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
    appointmentsCreateGroup.mockReset();
    appointmentsUpdate.mockReset();
    paymentsCreate.mockReset();
    patientsCreate.mockReset();
    healthInsurancesList.mockReset();
    healthInsurancesList.mockResolvedValue({ items: [] });
    baseProps.onAppointmentDateChange.mockReset();
  });

  it("positions simultaneous appointments side by side and opens editing", () => {
    renderWithProviders(<AppointmentBoard {...baseProps} appointments={[
      { id: "a", patientId: "patient-1", doctorId: "doctor-1", startAt: "2026-05-07T12:00:00Z", endAt: "2026-05-07T13:20:00Z", status: "Scheduled" },
      { id: "b", patientId: "patient-1", doctorId: "doctor-1", startAt: "2026-05-07T12:00:00Z", endAt: "2026-05-07T12:40:00Z", status: "Confirmed" },
    ]} />);
    const grid = screen.getByLabelText("Regua de horarios do dia");
    const blocks = within(grid).getAllByRole("button");
    expect(blocks).toHaveLength(2);
    expect(blocks[0].style.width).toBe("calc(50% - 6px)");
    expect(blocks[1].style.left).toBe("calc(50% + 3px)");
    expect(blocks[0].style.height).toBe("198px");
    expect(blocks[1].style.height).toBe("98px");
    fireEvent.click(blocks[0]);
    expect(screen.getByRole("heading", { name: "Editar consulta" })).toBeVisible();
  });

  it("updates calendar colors when the appointment status changes", () => {
    const appointment = { id: "colored", patientId: "patient-1", doctorId: "doctor-1", startAt: "2026-05-07T12:00:00Z", endAt: "2026-05-07T12:30:00Z" };
    const view = renderWithProviders(<AppointmentBoard {...baseProps} appointments={[{ ...appointment, status: "Scheduled" }]} />);
    for (const status of ["Scheduled", "Confirmed", "InProgress", "Completed", "Cancelled", "NoShow"] as const) {
      view.rerender(<AppointmentBoard {...baseProps} appointments={[{ ...appointment, status }]} />);
      const block = within(screen.getByLabelText("Regua de horarios do dia")).getByRole("button");
      const variant = status.toLowerCase();
      expect(block.style.backgroundColor).toBe(status === "Scheduled" ? "var(--brand-wash)" : `var(--status-${variant}-bg)`);
      expect(block.style.borderColor).toBe(status === "Scheduled" ? "var(--brand)" : `var(--status-${variant}-color)`);
    }
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

    fireEvent.click(screen.getByText("Mais acoes"));
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
    expect(screen.getByLabelText("Regua de horarios do dia")).toBeVisible();
  });

  it("creates and selects a patient without losing the appointment draft", async () => {
    patientsCreate.mockResolvedValueOnce({ id: "patient-2", name: "Ana Nova" });
    renderWithProviders(<AppointmentBoard {...baseProps} appointments={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Agendar consulta" }));
    fireEvent.change(screen.getByLabelText("Inicio"), { target: { value: "2026-05-07T16:30" } });
    fireEvent.change(screen.getByLabelText("Observacoes"), { target: { value: "Retorno preservado" } });
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar paciente" }));
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Ana Nova" } });
    fireEvent.change(screen.getByLabelText("CPF"), { target: { value: "52998224725" } });
    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "11999998888" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar paciente" }));

    await waitFor(() => expect(patientsCreate).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByLabelText("Paciente")).toHaveValue("Ana Nova"));
    expect(screen.getByLabelText("Inicio")).toHaveValue("2026-05-07T16:30");
    expect(screen.getByLabelText("Observacoes")).toHaveValue("Retorno preservado");
  });

  it("creates a group appointment for the selected patients", async () => {
    appointmentsCreateGroup.mockResolvedValueOnce([]);
    renderWithProviders(
      <AppointmentBoard
        {...baseProps}
        appointments={[]}
        patients={[...baseProps.patients, { id: "patient-2", name: "Ana Nova", cpf: "52998224725", phone: "11999998888" }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Agendar consulta" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Atendimento em grupo" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Marina Souza" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Ana Nova" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar consulta" }));

    await waitFor(() => expect(appointmentsCreateGroup).toHaveBeenCalledWith(expect.objectContaining({
      patientIds: ["patient-1", "patient-2"],
      doctorId: "doctor-1",
    })));
  });

  it("shows the monthly view and opens a selected day", () => {
    const onAppointmentDateChange = vi.fn();
    const onAppointmentViewModeChange = vi.fn();
    renderWithProviders(
      <AppointmentBoard
        {...baseProps}
        appointmentDateFrom="2026-05-01"
        appointmentDateTo="2026-05-31"
        appointmentViewMode="month"
        appointments={[{ id: "appointment-month", patientId: "patient-1", doctorId: "doctor-1", startAt: "2026-05-07T11:00:00Z", status: "Scheduled", amount: 250 }]}
        onAppointmentDateChange={onAppointmentDateChange}
        onAppointmentViewModeChange={onAppointmentViewModeChange}
      />,
    );

    expect(screen.getByLabelText("Agenda mensal")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /71 consulta/ }));
    expect(onAppointmentDateChange).toHaveBeenCalledWith("2026-05-07");
    expect(onAppointmentViewModeChange).toHaveBeenCalledWith("day");
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

  it("confirms a scheduled appointment from the weekly view", async () => {
    appointmentsConfirm.mockResolvedValueOnce({ type: "Retorno" });

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

    fireEvent.click(screen.getByRole("button", { name: "Confirmar consulta de Marina Souza" }));

    await waitFor(() => expect(appointmentsConfirm).toHaveBeenCalledWith("appointment-1"));
    expect(await screen.findByText("Retorno confirmada com sucesso.")).toBeVisible();
  });

  it("does not offer confirmation for an already confirmed appointment in the weekly view", () => {
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
          status: "Confirmed",
          type: "Retorno",
          amount: 180,
        }]}
      />,
    );

    expect(screen.queryByRole("button", { name: "Confirmar consulta de Marina Souza" })).not.toBeInTheDocument();
  });

  it("offers only valid status transitions during the appointment flow", () => {
    const { rerender } = renderWithProviders(
      <AppointmentBoard {...baseProps} appointments={[{
        id: "appointment-1", patientId: "patient-1", doctorId: "doctor-1",
        startAt: "2026-05-07T11:00:00Z", status: "Scheduled", type: "Retorno", amount: 180,
      }]} />,
    );
    expect(within(screen.getByRole("article")).queryByRole("button", { name: "Faltou" })).not.toBeInTheDocument();

    rerender(<AppointmentBoard {...baseProps} appointments={[{
      id: "appointment-1", patientId: "patient-1", doctorId: "doctor-1",
      startAt: "2026-05-07T11:00:00Z", status: "InProgress", type: "Retorno", amount: 180,
    }]} />);
    fireEvent.click(within(screen.getByRole("article")).getByText("Mais acoes"));
    expect(within(screen.getByRole("article")).getByRole("button", { name: "Faltou" })).toBeVisible();
    expect(within(screen.getByRole("article")).getByRole("button", { name: "Compareceu" })).toBeVisible();
    expect(within(screen.getByRole("article")).queryByRole("button", { name: "Confirmar" })).not.toBeInTheDocument();
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

    fireEvent.click(screen.getByText("Mais acoes"));
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

    fireEvent.click(screen.getByText("Mais acoes"));
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

    fireEvent.click(screen.getAllByText("Mais acoes")[0]);
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
