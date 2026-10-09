import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import { AppointmentBoard } from "@/modules/scheduling/appointment-board";
import { renderWithProviders } from "@/test/render";

const { appointmentsCancel, appointmentsConfirm, appointmentsCreate, appointmentsCreateGroup, appointmentsDelete, appointmentsUpdateStatus, appointmentsUpdate, paymentsCreate, patientsCreate, healthInsurancesList } =
  vi.hoisted(() => ({
    appointmentsCancel: vi.fn(),
    appointmentsConfirm: vi.fn(),
    appointmentsCreate: vi.fn(),
    appointmentsCreateGroup: vi.fn(),
    appointmentsDelete: vi.fn(),
    appointmentsUpdateStatus: vi.fn(),
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
    appointmentsDelete,
    appointmentsUpdateStatus,
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
    appointmentsDelete.mockReset();
    appointmentsUpdateStatus.mockReset();
    appointmentsUpdate.mockReset();
    paymentsCreate.mockReset();
    patientsCreate.mockReset();
    healthInsurancesList.mockReset();
    healthInsurancesList.mockResolvedValue({ items: [] });
    baseProps.onAppointmentDateChange.mockReset();
  });

  it("requires confirmation before deleting and allows keeping the appointment", async () => {
    appointmentsDelete.mockResolvedValueOnce(undefined);
    renderWithProviders(<AppointmentBoard {...baseProps} appointments={[{
      id: "appointment-1", patientId: "patient-1", doctorId: "doctor-1", startAt: "2026-05-07T11:00:00Z", status: "Scheduled",
    }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Excluir agendamento" }));
    expect(screen.getByRole("heading", { name: "Excluir agendamento" })).toBeVisible();
    expect(appointmentsDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Manter agendamento" }));
    expect(appointmentsDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Excluir agendamento" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusao" }));
    await waitFor(() => expect(appointmentsDelete).toHaveBeenCalledWith("appointment-1"));
    expect(await screen.findByText("Agendamento excluido com sucesso.")).toBeVisible();
  });

  it("keeps deletion confirmation open and explains protected history", async () => {
    appointmentsDelete.mockRejectedValueOnce({ body: { detail: "Agendamento com pagamento registrado nao pode ser excluido." } });
    renderWithProviders(<AppointmentBoard {...baseProps} appointments={[{
      id: "appointment-1", patientId: "patient-1", doctorId: "doctor-1", startAt: "2026-05-07T11:00:00Z", status: "Completed",
    }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Excluir agendamento" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusao" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Agendamento com pagamento registrado nao pode ser excluido.");
    expect(screen.getByRole("heading", { name: "Excluir agendamento" })).toBeVisible();
  });

  it("opens deletion confirmation from the weekly edit modal", async () => {
    appointmentsDelete.mockResolvedValueOnce(undefined);
    renderWithProviders(<AppointmentBoard {...baseProps} appointmentViewMode="week" appointmentDateFrom="2026-05-04" appointmentDateTo="2026-05-10" appointments={[{
      id: "appointment-1", patientId: "patient-1", doctorId: "doctor-1", startAt: "2026-05-07T11:00:00Z", status: "Cancelled",
    }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar consulta de Marina Souza" }));
    fireEvent.click(screen.getByRole("button", { name: "Excluir agendamento" }));
    expect(screen.getByRole("heading", { name: "Excluir agendamento" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusao" }));
    await waitFor(() => expect(appointmentsDelete).toHaveBeenCalledWith("appointment-1"));
  });

  it("shares weekly rows by start time and keeps other times and days separate", () => {
    renderWithProviders(<AppointmentBoard {...baseProps} appointmentViewMode="week" appointmentDateFrom="2026-05-04" appointments={[
      { id: "later", patientId: "patient-1", startAt: "2026-05-07T11:00:00-02:00", status: "Confirmed" },
      { id: "a", patientId: "patient-1", startAt: "2026-05-07T09:00:00-03:00", status: "Scheduled" },
      { id: "b", patientId: "patient-1", startAt: "2026-05-07T09:00:00-03:00", status: "InProgress" },
      { id: "c", patientId: "patient-1", startAt: "2026-05-07T12:00:00Z", status: "Cancelled" },
      { id: "other-day", patientId: "patient-1", startAt: "2026-05-08T12:00:00Z", status: "Scheduled" },
    ]} />);
    const cards = within(screen.getByLabelText("Agenda semanal")).getAllByRole("button", { name: "Editar consulta de Marina Souza" }).map(button => button.parentElement!.parentElement!);
    expect(cards[0].parentElement).toBe(cards[1].parentElement);
    expect(cards[1].parentElement).toBe(cards[2].parentElement);
    expect(cards[0].parentElement!.style.gridTemplateColumns).toBe("repeat(3, minmax(0, 1fr))");
    expect(cards[3]).toHaveTextContent("Confirmado");
    expect(cards[3].parentElement).not.toBe(cards[0].parentElement);
    expect(cards[4].parentElement).not.toBe(cards[0].parentElement);
    expect(cards[3].parentElement!.style.gridTemplateColumns).toBe("repeat(1, minmax(0, 1fr))");
    fireEvent.click(within(cards[1]).getByRole("button", { name: "Editar consulta de Marina Souza" }));
    expect(screen.getByRole("heading", { name: "Editar consulta" })).toBeVisible();
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
    expect(blocks[0].style.height).toBe("calc(13.3333% - 2px)");
    expect(blocks[1].style.height).toBe("calc(6.66667% - 2px)");
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
      const background = status === "Scheduled" ? "var(--brand-strong)" : `var(--status-${variant}-color)`;
      const foreground = status === "Completed" || status === "NoShow" ? "var(--surface-inverse)" : "var(--surface)";
      expect(block.style.backgroundColor).toBe(background);
      expect(block.style.borderColor).toBe(background);
      expect(block.style.color).toBe(foreground);
      const card = screen.getByText("Marina Souza", { selector: "article span" }).closest("article")!;
      expect(card.style.backgroundColor).toBe(background);
      expect(card.style.color).toBe(foreground);
    }
  });

  it("confirms a scheduled appointment from the operational board", async () => {
    appointmentsUpdateStatus.mockResolvedValueOnce({
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

    fireEvent.change(screen.getByRole("combobox", { name: "Alterar status de Marina Souza" }), { target: { value: "Confirmed" } });

    await waitFor(() =>
      expect(appointmentsUpdateStatus).toHaveBeenCalledWith("appointment-1", { status: "Confirmed" }),
    );

    expect(
      await screen.findByText("Status atualizado. Se marcou por engano, selecione o status correto."),
    ).toBeVisible();
  });

  it("cancels a scheduled appointment from the operational board", async () => {
    appointmentsUpdateStatus.mockResolvedValueOnce({
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

    fireEvent.change(screen.getByRole("combobox", { name: "Alterar status de Marina Souza" }), { target: { value: "Cancelled" } });

    await waitFor(() =>
      expect(appointmentsUpdateStatus).toHaveBeenCalledWith("appointment-1", { status: "Cancelled" }),
    );

    expect(
      await screen.findByText("Status atualizado. Se marcou por engano, selecione o status correto."),
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

  it("uses individual scheduling without a group option", async () => {
    appointmentsCreate.mockResolvedValueOnce({});
    renderWithProviders(<AppointmentBoard {...baseProps} appointments={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Agendar consulta" }));
    expect(screen.queryByRole("checkbox", { name: "Atendimento em grupo" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Salvar consulta" }));
    await waitFor(() => expect(appointmentsCreate).toHaveBeenCalledWith(expect.objectContaining({ patientId: "patient-1", doctorId: "doctor-1" })));
    expect(appointmentsCreateGroup).not.toHaveBeenCalled();
  });

  it("expands and restores the appointment board", () => {
    renderWithProviders(<AppointmentBoard {...baseProps} appointments={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Ampliar quadro" }));
    expect(screen.getByRole("region", { name: "Quadro de atendimentos" })).toHaveClass("fixed");
    fireEvent.click(screen.getByRole("button", { name: "Sair da tela ampliada" }));
    expect(screen.getByRole("region", { name: "Quadro de atendimentos" })).not.toHaveClass("fixed");
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
        appointments={[
          { id: "appointment-month", patientId: "patient-1", doctorId: "doctor-1", startAt: "2026-05-07T11:00:00Z", status: "Scheduled", amount: 250 },
          { id: "appointment-month-2", patientId: "patient-1", doctorId: "doctor-1", startAt: "2026-05-07T12:00:00Z", status: "Confirmed", amount: 250 },
          { id: "appointment-month-3", patientId: "patient-1", doctorId: "doctor-1", startAt: "2026-05-07T13:00:00Z", status: "Scheduled", amount: 250 },
        ]}
        onAppointmentDateChange={onAppointmentDateChange}
        onAppointmentViewModeChange={onAppointmentViewModeChange}
      />,
    );

    expect(screen.getByLabelText("Agenda mensal")).toBeVisible();
    const day = screen.getByRole("button", { name: /73 consultas/ });
    expect(within(day).getAllByText("Marina Souza")).toHaveLength(2);
    expect(within(day).getByText("+1 mais")).toBeVisible();
    fireEvent.click(day);
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

  it("offers every status for direct changes and corrections, including terminal states", () => {
    for (const status of ["Scheduled", "Confirmed", "InProgress", "Completed", "Cancelled", "NoShow"] as const) {
      const { unmount } = renderWithProviders(<AppointmentBoard {...baseProps} appointments={[{
        id: "appointment-1", patientId: "patient-1", doctorId: "doctor-1",
        startAt: "2026-05-07T11:00:00Z", status, type: "Retorno", amount: 180,
      }]} />);
      const control = screen.getByRole("combobox", { name: "Alterar status de Marina Souza" });
      expect(control).toHaveValue(status);
      expect(within(control).getAllByRole("option")).toHaveLength(6);
      unmount();
    }
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
    fireEvent.click(screen.getByRole("button", { name: "Editar / Remarcar" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Editar / Remarcar" }));
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
