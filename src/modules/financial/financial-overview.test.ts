import { describe, expect, it } from "vitest";
import { sumSettlementTotals } from "./financial-overview";

describe("sumSettlementTotals", () => {
  it("sums the backend settlement totals without treating payouts as expenses", () => {
    expect(sumSettlementTotals([
      { professionalId: "1", professionalName: "A", accrued: 300, paid: 100, outstanding: 200, items: [] },
      { professionalId: "2", professionalName: "B", accrued: 150, paid: 50, outstanding: 100, items: [] },
    ])).toEqual({ accrued: 450, paid: 150, outstanding: 300 });
  });
});
