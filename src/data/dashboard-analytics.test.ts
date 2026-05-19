import { describe, expect, it } from "vitest";
import {
  PROGRAM_ORDER,
  PRODUCT_LINE_ORDER,
  getAllCells,
  getExecutiveSignals,
  getExceptionStripModel,
} from "./dashboard-product-performance";
import {
  getDashboardOverviewModel,
  getStatusDistribution,
  getProgramRiskMatrix,
  getProgramFocusCards,
  getSourceQualitySummary,
  getExceptionTotalsByProgram,
  getMajorExecutiveCards,
} from "./dashboard-analytics";

describe("dashboard-analytics", () => {
  it("overview totals match cell grid size", () => {
    const overview = getDashboardOverviewModel();
    expect(overview.programsCount).toBe(PROGRAM_ORDER.length);
    expect(overview.productLinesCount).toBe(PRODUCT_LINE_ORDER.length);
    expect(overview.totalPairs).toBe(PROGRAM_ORDER.length * PRODUCT_LINE_ORDER.length);
    expect(overview.totalPairs).toBe(getAllCells().length);
    expect(overview.reportingPeriod).toBeDefined();
    expect(overview.lastUpdated).toBeDefined();
  });

  it("overview at-risk count matches exception strip and raw filter", () => {
    const overview = getDashboardOverviewModel();
    const strip = getExceptionStripModel();
    const cells = getAllCells();
    const atRisk = cells.filter((c) => c.status === "warning" || c.status === "critical").length;
    expect(overview.atRiskCount).toBe(strip.atRiskCount);
    expect(overview.atRiskCount).toBe(atRisk);
  });

  it("status distribution sums to all cells", () => {
    const dist = getStatusDistribution();
    const sum = dist.excellent + dist.good + dist.warning + dist.critical;
    expect(sum).toBe(getAllCells().length);
  });

  it("risk matrix has one row per program and four lines each", () => {
    const matrix = getProgramRiskMatrix();
    expect(matrix).toHaveLength(PROGRAM_ORDER.length);
    for (const row of matrix) {
      expect(row.cells).toHaveLength(PRODUCT_LINE_ORDER.length);
      for (const c of row.cells) {
        expect(c.cell.program).toBe(row.program);
      }
    }
  });

  it("program focus cards reference real programs and worst line", () => {
    const cards = getProgramFocusCards();
    expect(cards).toHaveLength(PROGRAM_ORDER.length);
    for (const card of cards) {
      expect(PROGRAM_ORDER).toContain(card.program);
      expect(card.focusCell.program).toBe(card.program);
      if (card.program === "marketAuthorizations") {
        expect(card.dataSourceLabel).toContain("Seeded");
      } else {
        expect(card.dataSourceLabel).toContain("Mock");
      }
    }
  });

  it("source summary includes expected chip ids", () => {
    const summary = getSourceQualitySummary();
    const ids = summary.chips.map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(["ct", "gmp", "ma", "home"]));
    expect(summary.fullNote.length).toBeGreaterThan(20);
  });

  it("exception totals by program are non-negative and match sum of cell.exceptions", () => {
    const totals = getExceptionTotalsByProgram();
    expect(totals).toHaveLength(PROGRAM_ORDER.length);
    let summed = 0;
    for (const t of totals) {
      expect(t.totalExceptions).toBeGreaterThanOrEqual(0);
      expect(t.atRiskCells).toBeGreaterThanOrEqual(0);
      expect(t.atRiskCells).toBeLessThanOrEqual(PRODUCT_LINE_ORDER.length);
      summed += t.totalExceptions;
    }
    const fromCells = getAllCells().reduce((s, c) => s + c.exceptions, 0);
    expect(summed).toBe(fromCells);
  });

  it("major executive cards align with legacy getExecutiveSignals", () => {
    const major = getMajorExecutiveCards();
    const legacy = getExecutiveSignals();
    expect(major).toHaveLength(legacy.length);
    for (let i = 0; i < major.length; i++) {
      expect(major[i]!.id).toBe(legacy[i]!.id);
      expect(major[i]!.label).toBe(legacy[i]!.label);
      expect(major[i]!.value).toBe(legacy[i]!.value);
      expect(major[i]!.helper).toBe(legacy[i]!.helper);
    }
  });
});
