import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { UserManager } from "./user-manager";
import { renderWithProviders } from "@/test/render";

const api = vi.hoisted(() => ({ usersList: vi.fn(), usersAccessProfiles: vi.fn(), usersCreate: vi.fn(), usersUpdate: vi.fn() }));
vi.mock("@/services/api", () => ({ DefaultService: api }));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  api.usersList.mockResolvedValue([]);
  api.usersAccessProfiles.mockResolvedValue([
    { role: "Secretary", availableScreens: ["pacientes", "agenda"], defaultScreens: ["pacientes", "agenda"] },
    { role: "Admin", availableScreens: ["usuarios"], defaultScreens: ["usuarios"] },
  ]);
  api.usersCreate.mockResolvedValue({});
});

it("creates a user with only the selected screens", async () => {
  renderWithProviders(<UserManager />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Novo usuário" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Novo usuário" }));
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Nova pessoa" } });
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "new@test.local" } });
  fireEvent.change(screen.getByLabelText("Senha inicial", { exact: false }), { target: { value: "Password123!" } });
  fireEvent.click(screen.getByLabelText("Agenda"));
  fireEvent.click(screen.getByRole("button", { name: "Salvar usuário" }));
  await waitFor(() => expect(api.usersCreate).toHaveBeenCalledWith({ name: "Nova pessoa", email: "new@test.local", password: "Password123!", role: "Secretary", screens: ["pacientes"] }));
  expect(await screen.findByRole("status")).toHaveTextContent("Usuário salvo");
});

it("saves an explicit empty access list and displays API errors", async () => {
  api.usersList.mockResolvedValue([{ id: "user-1", name: "Recepção", email: "reception@test.local", role: "Secretary", screens: ["pacientes"], isActive: true }]);
  api.usersUpdate.mockRejectedValue({ body: { detail: "Este e-mail nao esta disponivel." } });
  renderWithProviders(<UserManager />);
  fireEvent.click(await screen.findByRole("button", { name: "Editar Recepção" }));
  fireEvent.click(screen.getByLabelText("Pacientes"));
  fireEvent.click(screen.getByRole("button", { name: "Salvar usuário" }));
  await waitFor(() => expect(api.usersUpdate).toHaveBeenCalledWith("user-1", expect.objectContaining({ screens: [] })));
  expect(await screen.findByRole("alert")).toHaveTextContent("Este e-mail nao esta disponivel.");
});
