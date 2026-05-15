import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { CrmWorkspace } from "@/components/crm-workspace";
import { renderWithProviders } from "@/test/render";

const {
  dashboardSummary,
  patientsList,
  appointmentsList,
  receivablesList,
  doctorsList,
} =
  vi.hoisted(() => ({
    dashboardSummary: vi.fn(),
    patientsList: vi.fn(),
    appointmentsList: vi.fn(),
    receivablesList: vi.fn(),
    doctorsList: vi.fn(),
  }));

vi.mock("@/services/api", () => ({
  DefaultService: {
    dashboardSummary,
    patientsList,
    appointmentsList,
    receivablesList,
    doctorsList,
  },
}));

describe("CrmWorkspace", () => {
  beforeEach(() => {
    dashboardSummary.mockReset();
    patientsList.mockReset();
    appointmentsList.mockReset();
    receivablesList.mockReset();
    doctorsList.mockReset();
    window.localStorage.clear();
  });

  it("renders API-backed operational data when the endpoints respond", async () => {
    dashboardSummary.mockResolvedValueOnce({
      appointmentsToday: 21,
      confirmedToday: 16,
      cancelledToday: 1,
      monthlyRevenue: 45120.5,
      noShowRate: 0.05,
      confirmationRate: 0.81,
    });
    patientsList.mockImplementation(async (page = 1, pageSize = 20, search) => ({
      items: [
        {
          id: "patient-1",
          name: search ? `Marina Souza ${search}` : "Marina Souza",
          cpf: "12345678901",
          phone: "(11) 98888-0000",
          email: "marina@email.com",
          healthInsurance: "Particular",
        },
      ],
      page,
      pageSize,
      total: 1,
    }));
    appointmentsList.mockResolvedValueOnce({
      items: [
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
      ],
      page: 1,
      pageSize: 10,
      total: 1,
    });
    receivablesList.mockResolvedValueOnce({
      items: [
        {
          id: "receivable-1",
          appointmentId: "appointment-1",
          originalAmount: 250,
          receivedAmount: 100,
          outstandingAmount: 150,
          status: "Partial",
          dueDate: "2026-05-07T00:00:00Z",
        },
      ],
      page: 1,
      pageSize: 5,
      total: 1,
    });
    doctorsList.mockResolvedValueOnce([
      {
        id: "doctor-1",
        name: "Dra. Luciana Costa",
        crm: "CRM-SP-987654",
        specialty: "Dermatologia",
        phone: "11997776655",
        email: "luciana@clinica.com",
        isActive: true,
      },
    ]);

    renderWithProviders(<CrmWorkspace />);

    expect(await screen.findByText("Marina Souza")).toBeVisible();
    expect(screen.getByText("21")).toBeVisible();
    expect(screen.getAllByText("R$ 45.120,50")[0]).toBeVisible();
    expect(screen.getByText("81%", { exact: true })).toBeVisible();
    expect(screen.getAllByText("Paciente novo")[0]).toBeVisible();
    expect(screen.getByText("R$ 150,00")).toBeVisible();
    expect(patientsList).toHaveBeenCalledWith(1, 3, undefined);
    expect(patientsList).toHaveBeenCalledWith(1, 100, "");
    expect(appointmentsList).toHaveBeenCalledWith(1, 10, expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), undefined);
  });

  it("falls back to the blocked session state after logout", async () => {
    dashboardSummary.mockRejectedValue(new Error("offline"));
    patientsList.mockRejectedValue(new Error("offline"));
    appointmentsList.mockRejectedValue(new Error("offline"));
    receivablesList.mockRejectedValue(new Error("offline"));
    doctorsList.mockRejectedValue(new Error("offline"));

    renderWithProviders(<CrmWorkspace />);

    await screen.findByText("Marina Souza");

    fireEvent.click(screen.getByRole("button", { name: "Encerrar sessao" }));

    await waitFor(() =>
      expect(screen.getByText("Sessao bloqueada")).toBeVisible(),
    );
    expect(screen.getByRole("button", { name: "Entrar no painel" })).toBeVisible();
  });

  it("updates the patient query when search and pagination change", async () => {
    dashboardSummary.mockResolvedValue({
      appointmentsToday: 21,
      confirmedToday: 16,
      cancelledToday: 1,
      monthlyRevenue: 45120.5,
      noShowRate: 0.05,
      confirmationRate: 0.81,
    });
    appointmentsList.mockResolvedValue({ items: [], page: 1, pageSize: 10, total: 0 });
    receivablesList.mockResolvedValue({ items: [], page: 1, pageSize: 5, total: 0 });
    doctorsList.mockResolvedValue([]);
    patientsList.mockImplementation(async (page = 1, pageSize = 20, search) => {
      if (pageSize === 100) {
        return {
          items: [
            {
              id: "patient-catalog-1",
              name: "Ana Catalogo",
              cpf: "11111111111",
              phone: "11999990000",
              email: "catalogo@email.com",
              healthInsurance: "Particular",
            },
          ],
          page: 1,
          pageSize,
          total: 1,
        };
      }

      if (search === "Bruna") {
        return {
          items: [
            {
              id: "patient-search-1",
              name: "Bruna Lopes",
              cpf: "22222222222",
              phone: "11999991111",
              email: "bruna@email.com",
              healthInsurance: "Premium",
            },
          ],
          page,
          pageSize,
          total: 4,
        };
      }

      if (page === 2) {
        return {
          items: [
            {
              id: "patient-page-2",
              name: "Carlos Pagina 2",
              cpf: "33333333333",
              phone: "11999992222",
              email: "carlos@email.com",
              healthInsurance: "Particular",
            },
          ],
          page,
          pageSize,
          total: 4,
        };
      }

      return {
        items: [
          {
            id: "patient-default-1",
            name: "Ana Martins",
            cpf: "12345678900",
            phone: "11999998888",
            email: "ana@email.com",
            healthInsurance: "Particular",
          },
        ],
        page,
        pageSize,
        total: 4,
      };
    });

    renderWithProviders(<CrmWorkspace />);

    expect(await screen.findByText("Ana Martins")).toBeVisible();

    fireEvent.change(
      screen.getByPlaceholderText("Buscar por nome, CPF ou telefone"),
      {
        target: { value: "Bruna" },
      },
    );

    expect(await screen.findByText("Bruna Lopes")).toBeVisible();
    expect(patientsList).toHaveBeenCalledWith(1, 3, "Bruna");

    fireEvent.change(
      screen.getByPlaceholderText("Buscar por nome, CPF ou telefone"),
      {
        target: { value: "" },
      },
    );

    await screen.findByText("Ana Martins");
    fireEvent.click(screen.getByRole("button", { name: "Proxima pagina" }));

    expect(await screen.findByText("Carlos Pagina 2")).toBeVisible();
    expect(patientsList).toHaveBeenCalledWith(2, 3, undefined);
  });

  it("updates the appointment query when the agenda date changes", async () => {
    dashboardSummary.mockResolvedValue({
      appointmentsToday: 21,
      confirmedToday: 16,
      cancelledToday: 1,
      monthlyRevenue: 45120.5,
      noShowRate: 0.05,
      confirmationRate: 0.81,
    });
    receivablesList.mockResolvedValue({ items: [], page: 1, pageSize: 5, total: 0 });
    doctorsList.mockResolvedValue([]);
    patientsList.mockResolvedValue({
      items: [
        {
          id: "patient-default-1",
          name: "Ana Martins",
          cpf: "12345678900",
          phone: "11999998888",
          email: "ana@email.com",
          healthInsurance: "Particular",
        },
      ],
      page: 1,
      pageSize: 3,
      total: 1,
    });
    appointmentsList.mockImplementation(async (_page, _pageSize, date) => {
      if (date === "2026-05-08") {
        return {
          items: [
            {
              id: "appointment-2",
              patientId: "patient-default-1",
              doctorId: "doctor-1",
              startAt: "2026-05-08T11:00:00Z",
              endAt: "2026-05-08T11:30:00Z",
              status: "Scheduled",
              confirmationStatus: "Pending",
              type: "Retorno 08",
              amount: 180,
              notes: "Agenda de amanha",
            },
          ],
          page: 1,
          pageSize: 10,
          total: 1,
        };
      }

      return {
        items: [
          {
            id: "appointment-1",
            patientId: "patient-default-1",
            doctorId: "doctor-1",
            startAt: "2026-05-07T11:00:00Z",
            endAt: "2026-05-07T11:30:00Z",
            status: "Scheduled",
            confirmationStatus: "Pending",
            type: "Retorno 07",
            amount: 180,
            notes: "Agenda de hoje",
          },
        ],
        page: 1,
        pageSize: 10,
        total: 1,
      };
    });

    renderWithProviders(<CrmWorkspace />);

    expect(await screen.findByText("Agenda de hoje")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Data da agenda"), {
      target: { value: "2026-05-08" },
    });

    expect(await screen.findByText("Agenda de amanha")).toBeVisible();
    expect(appointmentsList).toHaveBeenCalledWith(1, 10, "2026-05-08", undefined);
  });
});
