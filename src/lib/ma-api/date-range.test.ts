import { describe, expect, it } from "vitest";
import {
  clampIsoDateToToday,
  getMADatePresetRange,
  toLocalIsoDate,
} from "@/lib/ma-api/date-range";

describe("MA date ranges", () => {
  const today = new Date(2026, 8, 2, 12, 0, 0);

  it("uses today as the YTD maximum", () => {
    expect(getMADatePresetRange("ytd", today)).toEqual({
      from: "2026-01-01",
      to: "2026-09-02",
    });
  });

  it("caps the current quarter at today", () => {
    expect(getMADatePresetRange("this-quarter", today)).toEqual({
      from: "2026-07-01",
      to: "2026-09-02",
    });
  });

  it("calculates the previous quarter across year boundaries", () => {
    expect(getMADatePresetRange("last-quarter", new Date(2026, 0, 15))).toEqual({
      from: "2025-10-01",
      to: "2025-12-31",
    });
  });

  it("returns 30 inclusive calendar days", () => {
    expect(getMADatePresetRange("last-30", today)).toEqual({
      from: "2026-08-04",
      to: "2026-09-02",
    });
  });

  it("formats local dates and clamps future input", () => {
    expect(toLocalIsoDate(new Date(2026, 8, 2))).toBe("2026-09-02");
    expect(clampIsoDateToToday("2027-01-01", "2026-09-02")).toBe("2026-09-02");
    expect(clampIsoDateToToday("2026-08-01", "2026-09-02")).toBe("2026-08-01");
  });
});
