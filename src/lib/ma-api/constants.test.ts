import { describe, expect, it } from "vitest";
import {
  MA_TABULAR_FOOD_KPI1_DRILLDOWN_REPORT_ID,
  MA_TABULAR_FOOD_KPI2_DRILLDOWN_REPORT_ID,
  MA_TABULAR_FOOD_KPI3_DRILLDOWN_REPORT_ID,
  MA_TABULAR_FOOD_KPI4_DRILLDOWN_REPORT_ID,
  MA_TABULAR_MEDICAL_DEVICE_KPI1_DRILLDOWN_REPORT_ID,
  MA_TABULAR_MEDICAL_DEVICE_KPI2_DRILLDOWN_REPORT_ID,
  MA_TABULAR_MEDICAL_DEVICE_KPI3_DRILLDOWN_REPORT_ID,
  MA_TABULAR_MEDICAL_DEVICE_KPI4_DRILLDOWN_REPORT_ID,
  MA_TABULAR_MEDICINE_MEDIAN_AVERAGE_FACE_REPORT_ID,
  MA_TABULAR_MEDICINE_MEDIAN_DRILLDOWN_REPORT_ID,
  MA_TABULAR_MEDICINE_AVERAGE_DRILLDOWN_REPORT_ID,
  MA_TABULAR_KPI1_DRILLDOWN_REPORT_ID,
  MA_TABULAR_KPI2_DRILLDOWN_REPORT_ID,
  MA_TABULAR_KPI3_DRILLDOWN_REPORT_ID,
  MA_TABULAR_KPI4_DRILLDOWN_REPORT_ID,
  buildMATabularUrl,
} from "@/lib/ma-api/constants";

describe("MA tabular report ids", () => {
  it("uses report 18 only for the Food New MA drilldown", () => {
    expect(MA_TABULAR_KPI1_DRILLDOWN_REPORT_ID).toBe(9);
    expect(MA_TABULAR_FOOD_KPI1_DRILLDOWN_REPORT_ID).toBe(18);
    expect(buildMATabularUrl("https://example.test/api/kpi", MA_TABULAR_FOOD_KPI1_DRILLDOWN_REPORT_ID)).toBe(
      "https://example.test/api/kpi/tabular/18"
    );
  });

  it("uses Food-specific reports for Renewal, VMIN, and VMAJ drilldowns", () => {
    expect(MA_TABULAR_KPI2_DRILLDOWN_REPORT_ID).toBe(10);
    expect(MA_TABULAR_KPI3_DRILLDOWN_REPORT_ID).toBe(11);
    expect(MA_TABULAR_KPI4_DRILLDOWN_REPORT_ID).toBe(13);
    expect(MA_TABULAR_FOOD_KPI2_DRILLDOWN_REPORT_ID).toBe(19);
    expect(MA_TABULAR_FOOD_KPI3_DRILLDOWN_REPORT_ID).toBe(20);
    expect(MA_TABULAR_FOOD_KPI4_DRILLDOWN_REPORT_ID).toBe(21);
  });

  it("uses Medical Device-specific reports for New, Renewal, VMIN, and VMAJ drilldowns", () => {
    expect(MA_TABULAR_MEDICAL_DEVICE_KPI1_DRILLDOWN_REPORT_ID).toBe(22);
    expect(MA_TABULAR_MEDICAL_DEVICE_KPI2_DRILLDOWN_REPORT_ID).toBe(23);
    expect(MA_TABULAR_MEDICAL_DEVICE_KPI3_DRILLDOWN_REPORT_ID).toBe(24);
    expect(MA_TABULAR_MEDICAL_DEVICE_KPI4_DRILLDOWN_REPORT_ID).toBe(25);
    expect(
      buildMATabularUrl("https://example.test/api/kpi", MA_TABULAR_MEDICAL_DEVICE_KPI1_DRILLDOWN_REPORT_ID)
    ).toBe("https://example.test/api/kpi/tabular/22");
  });

  it("uses report 26 for Medicine median and average face data", () => {
    expect(MA_TABULAR_MEDICINE_MEDIAN_AVERAGE_FACE_REPORT_ID).toBe(26);
    expect(
      buildMATabularUrl("https://example.test/api/kpi", MA_TABULAR_MEDICINE_MEDIAN_AVERAGE_FACE_REPORT_ID)
    ).toBe("https://example.test/api/kpi/tabular/26");
  });

  it("uses reports 27 and 28 for Medicine median and average drilldowns", () => {
    expect(MA_TABULAR_MEDICINE_MEDIAN_DRILLDOWN_REPORT_ID).toBe(27);
    expect(MA_TABULAR_MEDICINE_AVERAGE_DRILLDOWN_REPORT_ID).toBe(28);
    expect(
      buildMATabularUrl("https://example.test/api/kpi", MA_TABULAR_MEDICINE_MEDIAN_DRILLDOWN_REPORT_ID)
    ).toBe("https://example.test/api/kpi/tabular/27");
    expect(
      buildMATabularUrl("https://example.test/api/kpi", MA_TABULAR_MEDICINE_AVERAGE_DRILLDOWN_REPORT_ID)
    ).toBe("https://example.test/api/kpi/tabular/28");
  });
});
