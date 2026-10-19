import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import { PrintDailyAgenda } from "./print-daily-agenda";

const { appointmentsList } = vi.hoisted(() => ({ appointmentsList: vi.fn() }));
vi.mock("@/services/api", () => ({ DefaultService: { appointmentsList } }));

beforeEach(() => {
  vi.restoreAllMocks();
  appointmentsList.mockReset();
  vi.spyOn(window, "print").mockImplementation(() => {});
});

it("prints all pages in time order with the selected date and filters", async () => {
  appointmentsList.mockResolvedValueOnce({ total: 2, items: [{ id: "late", startAt: "2026-05-07T15:00:00Z", patientName: "Paciente tarde" }] });
  appointmentsList.mockResolvedValueOnce({ total: 2, items: [{ id: "early", startAt: "2026-05-07T12:00:00Z", patientName: "<script>Paciente</script>" }] });
  vi.mocked(window.print).mockImplementation(() => {
    const report = document.getElementById("daily-agenda-print")!;
    expect(report).toHaveTextContent("07/05/2026");
    expect(report).toHaveTextContent("Dra. Ana");
    const rows = report.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("<script>Paciente</script>");
    expect(report.querySelector("script")).toBeNull();
    expect(rows[1]).toHaveTextContent("Paciente tarde");
  });
  render(<PrintDailyAgenda date="2026-05-07" doctorId="doctor" doctorName="Dra. Ana" status="Confirmed" />);
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(window.print).toHaveBeenCalledOnce());
  expect(appointmentsList).toHaveBeenNthCalledWith(1, 1, 100, "2026-05-07", "doctor", "Confirmed");
  expect(appointmentsList).toHaveBeenNthCalledWith(2, 2, 100, "2026-05-07", "doctor", "Confirmed");
  expect(document.getElementById("daily-agenda-print")).not.toBeNull();
  fireEvent(window, new Event("afterprint"));
  expect(document.getElementById("daily-agenda-print")).toBeNull();
});

it("does not print partial results when a later page fails", async () => {
  appointmentsList.mockResolvedValueOnce({ total: 2, items: [{ id: "one" }] }).mockRejectedValueOnce(new Error("Falha"));
  render(<PrintDailyAgenda date="2026-05-07" />);
  fireEvent.click(screen.getByRole("button"));
  expect(await screen.findByRole("alert")).toBeVisible();
  expect(window.print).not.toHaveBeenCalled();
  expect(screen.getByRole("button")).toBeEnabled();
});

it("prints an explicit empty state", async () => {
  appointmentsList.mockResolvedValueOnce({ total: 0, items: [] });
  vi.mocked(window.print).mockImplementation(() => {
    expect(document.getElementById("daily-agenda-print")).toHaveTextContent("Nenhum agendamento");
  });
  render(<PrintDailyAgenda date="2026-05-07" />);
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(window.print).toHaveBeenCalledOnce());
});
