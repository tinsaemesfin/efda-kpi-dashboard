import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchGMPReport, fetchGMPReports } from "./client";
import { GMP_DRILLDOWN_REPORTS } from "./constants";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("GMP report requests", () => {
  it("passes dates and pagination to the detail report and retains the filtered total", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_KPI", "https://example.test/api");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [{ inspection_number: "test" }], recordsFiltered: 81, recordsTotal: 100 }) });
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchGMPReport("test-token", 214, { startDate: "2026-01-01", endDate: "2026-09-20" }, "50", 50);
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toContain("214");
    const body = new URLSearchParams(request.body);
    expect(body.get("startDate")).toBe("2026-01-01");
    expect(body.get("endDate")).toBe("2026-09-20");
    expect(body.get("start")).toBe("50");
    expect(body.get("length")).toBe("50");
    expect(result.totalRecords).toBe(81);
  });

  it("loads all four KPI 1 breakdowns and preserves failed report slots", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_KPI", "https://example.test/api");
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string) => ({
      ok: !url.endsWith("205"), status: 503,
      text: async () => "Unavailable", json: async () => ({ data: [] }),
    })));
    const reports = await fetchGMPReports("test-token", GMP_DRILLDOWN_REPORTS["GMP-KPI-1"]);
    expect(reports.map(report => report.reportId)).toEqual([135, 152, 151, 205, 153, 123]);
    expect(reports.find(report => report.reportId === 205)?.error).toContain("503");
  });
});
