import { describe, expect, it } from "vitest";
import { getMAApiFilterChipLabels } from "./filter-labels";

describe("getMAApiFilterChipLabels", () => {
  it("returns empty when filters are missing", () => {
    expect(getMAApiFilterChipLabels(undefined)).toEqual([]);
  });

  it("formats start/end date range from main-page filters", () => {
    expect(
      getMAApiFilterChipLabels({
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      })
    ).toEqual(["01 Jan 2026 – 31 Dec 2026"]);
  });

  it("includes quarter/year when present", () => {
    expect(
      getMAApiFilterChipLabels({
        startDate: "2025-10-01",
        endDate: "2025-12-31",
        quarter: "Q4",
        year: 2025,
      })
    ).toEqual(["01 Oct 2025 – 31 Dec 2025", "Q4 2025"]);
  });
});
