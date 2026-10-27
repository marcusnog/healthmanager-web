import { render, screen, waitFor } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { vi } from "vitest";
import { AppProvider } from "./app-provider";
import { ApiError } from "@/generated/core/ApiError";

it.each([403, 401])("handles clinical access status %s without confusing permission with authentication", async status => {
  const onUnauthorized = vi.fn();
  window.addEventListener("auth:unauthorized", onUnauthorized);
  const url = "/patients/patient/clinical-records";
  function Records() {
    const query = useQuery({ queryKey: ["records", status], retry: false, queryFn: async () => {
      throw new ApiError({ method: "GET", url }, { url, ok: false, status, statusText: "Denied", body: { detail: "Medico sem vinculo" } }, "Denied");
    } });
    return query.error ? <p role="alert">Acesso negado</p> : null;
  }
  try {
    render(<AppProvider><Records /></AppProvider>);
    await screen.findByRole("alert");
    await waitFor(() => expect(onUnauthorized).toHaveBeenCalledTimes(status === 401 ? 1 : 0));
  } finally {
    window.removeEventListener("auth:unauthorized", onUnauthorized);
  }
});
