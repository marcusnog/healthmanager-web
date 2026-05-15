import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { LoginPanel } from "@/modules/auth/login-panel";

const { authLogin } = vi.hoisted(() => ({
  authLogin: vi.fn(),
}));

vi.mock("@/services/api", () => ({
  DefaultService: {
    authLogin,
  },
}));

describe("LoginPanel", () => {
  beforeEach(() => {
    authLogin.mockReset();
    window.localStorage.clear();
  });

  it("shows validation errors before submitting invalid credentials", async () => {
    const onLogin = vi.fn();

    render(<LoginPanel session={null} onLogin={onLogin} onLogout={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "email-invalido" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Entrar no painel" }));

    expect(await screen.findByText("Informe um email valido.")).toBeVisible();
    expect(screen.getByText("Use ao menos 8 caracteres.")).toBeVisible();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it("keeps the local onboarding flow even if the API is unavailable", async () => {
    const onLogin = vi.fn();

    authLogin.mockRejectedValueOnce(new Error("api offline"));

    render(<LoginPanel session={null} onLogin={onLogin} onLogout={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "secretaria@clinicaaurora.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "12345678" },
    });
    fireEvent.change(screen.getByLabelText("Perfil"), {
      target: { value: "Secretary" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Entrar no painel" }));

    await waitFor(() => expect(authLogin).toHaveBeenCalledTimes(1));
    expect(authLogin).toHaveBeenCalledWith({
      email: "secretaria@clinicaaurora.com",
      password: "12345678",
    });
    expect(onLogin).toHaveBeenCalledWith({
      clinicName: "Clinica Aurora",
      name: "secretaria",
      role: "Secretary",
    });
  });
});
