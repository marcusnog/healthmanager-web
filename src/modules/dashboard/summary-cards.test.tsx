import { render, screen } from "@testing-library/react";
import { SummaryCards } from "@/modules/dashboard/summary-cards";

describe("SummaryCards", () => {
  it("formats dashboard values in pt-BR", () => {
    render(
      <SummaryCards
        data={{
          appointmentsToday: 18,
          confirmedToday: 13,
          monthlyRevenue: 32780,
          confirmationRate: 0.72,
          cancelledToday: 2,
          noShowRate: 0.08,
        }}
      />,
    );

    expect(screen.getByText("Consultas do dia")).toBeVisible();
    expect(screen.getByText("18")).toBeVisible();
    expect(screen.getByText("R$ 32.780,00")).toBeVisible();
    expect(screen.getByText("72%")).toBeVisible();
  });
});
