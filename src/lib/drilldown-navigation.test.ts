import { describe, expect, it } from "vitest";
import { drilldownQuery, readDrilldownFilters, readMAProduct } from "./drilldown-navigation";

describe("drilldown links", () => {
  it("round trips product and date context for refresh and back navigation", () => {
    const filters = { startDate: "2025-01-01", endDate: "2025-12-31", dateBasis: "decision" as const };
    const params = new URLSearchParams(drilldownQuery(filters, "foodNotification"));
    expect(readDrilldownFilters(params)).toEqual(filters);
    expect(readMAProduct(params.get("product"))).toBe("foodNotification");
  });
  it("rejects impossible dates and unknown products", () => {
    expect(readDrilldownFilters(new URLSearchParams("startDate=2025-02-30&endDate=oops&dateBasis=other"))).toEqual({ startDate: undefined, endDate: undefined, dateBasis: "submission" });
    expect(readMAProduct("__proto__")).toBe("medicine");
  });
});
