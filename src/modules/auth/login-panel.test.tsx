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

    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "email-invalido" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Informe um e-mail válido.")).toBeVisible();
    expect(screen.getByText("Use ao menos 8 caracteres.")).toBeVisible();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it("shows an error when the login API is unavailable", async () => {
    const onLogin = vi.fn();

    authLogin.mockRejectedValueOnce(new Error("api offline"));

    render(<LoginPanel session={null} onLogin={onLogin} onLogout={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "secretaria@clinicaaurora.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "12345678" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("E-mail ou senha incorretos.")).toBeVisible();
    expect(onLogin).not.toHaveBeenCalled();
  });
});
