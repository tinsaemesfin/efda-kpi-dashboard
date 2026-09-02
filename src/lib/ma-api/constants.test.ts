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
  MA_TABULAR_MEDICINE_PAR_FACE_REPORT_ID,
  MA_TABULAR_MEDICAL_DEVICE_PAR_FACE_REPORT_ID,
  MA_TABULAR_FOOD_PAR_FACE_REPORT_ID,
  MA_TABULAR_COSMETICS_PAR_FACE_REPORT_ID,
  MA_TABULAR_KPI1_DRILLDOWN_REPORT_ID,
  MA_TABULAR_KPI2_DRILLDOWN_REPORT_ID,
  MA_TABULAR_KPI3_DRILLDOWN_REPORT_ID,
  MA_TABULAR_KPI4_DRILLDOWN_REPORT_ID,
  MA_PRODUCT_STANDARD_DRILLDOWN_REPORT_IDS,
  MA_PRODUCT_TIME_REPORT_IDS,
  MA_PRODUCT_PAR_REPORT_IDS,
  MA_PRODUCT_STANDARD_FACE_REPORT_IDS_BY_DATE,
  MA_PRODUCT_STANDARD_DRILLDOWN_REPORT_IDS_BY_DATE,
  MA_PRODUCT_TIME_REPORT_IDS_BY_DATE,
  MA_PRODUCT_PAR_REPORT_IDS_BY_DATE,
  buildMAFaceRequestBody,
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

  it("uses reports 29–32 for PAR / MA-KPI-8 face data by product", () => {
    expect(MA_TABULAR_MEDICINE_PAR_FACE_REPORT_ID).toBe(29);
    expect(MA_TABULAR_MEDICAL_DEVICE_PAR_FACE_REPORT_ID).toBe(30);
    expect(MA_TABULAR_FOOD_PAR_FACE_REPORT_ID).toBe(31);
    expect(MA_TABULAR_COSMETICS_PAR_FACE_REPORT_ID).toBe(32);
    expect(
      buildMATabularUrl("https://example.test/api/kpi", MA_TABULAR_MEDICINE_PAR_FACE_REPORT_ID)
    ).toBe("https://example.test/api/kpi/tabular/29");
  });

  it("maps the consecutive completion reports 89–113 by product and KPI", () => {
    expect(MA_PRODUCT_STANDARD_DRILLDOWN_REPORT_IDS.foodNotification).toEqual({
      "MA-KPI-1": 89,
      "MA-KPI-2": 90,
      "MA-KPI-3": 91,
      "MA-KPI-4": 92,
    });
    expect(MA_PRODUCT_STANDARD_DRILLDOWN_REPORT_IDS.cosmetics).toEqual({
      "MA-KPI-1": 93,
      "MA-KPI-2": 94,
      "MA-KPI-3": 95,
    });
    expect(MA_PRODUCT_TIME_REPORT_IDS.food).toEqual({ face: 96, median: 97, average: 98 });
    expect(MA_PRODUCT_TIME_REPORT_IDS.foodNotification).toEqual({ face: 99, median: 100, average: 101 });
    expect(MA_PRODUCT_TIME_REPORT_IDS.medicalDevice).toEqual({ face: 102, median: 103, average: 104 });
    expect(MA_PRODUCT_TIME_REPORT_IDS.cosmetics).toEqual({ face: 105, median: 106, average: 107 });
    expect(MA_PRODUCT_TIME_REPORT_IDS.medicine).toEqual({ face: 118, median: 119, average: 120 });
    expect(MA_PRODUCT_PAR_REPORT_IDS.foodNotification).toEqual({ face: 108, drilldown: 111 });
    expect(MA_PRODUCT_PAR_REPORT_IDS.medicine).toEqual({ face: 114, drilldown: 109 });
    expect(MA_PRODUCT_PAR_REPORT_IDS.food).toEqual({ face: 115, drilldown: 110 });
    expect(MA_PRODUCT_PAR_REPORT_IDS.medicalDevice).toEqual({ face: 116, drilldown: 112 });
    expect(MA_PRODUCT_PAR_REPORT_IDS.cosmetics).toEqual({ face: 117, drilldown: 113 });
  });

  it("maps Submission date by default and Decision date to paired MA reports", () => {
    expect(MA_PRODUCT_STANDARD_FACE_REPORT_IDS_BY_DATE.submission.medicine).toBe(8);
    expect(MA_PRODUCT_STANDARD_FACE_REPORT_IDS_BY_DATE.decision.medicine).toBe(155);
    expect(MA_PRODUCT_STANDARD_DRILLDOWN_REPORT_IDS_BY_DATE.decision.medicalDevice["MA-KPI-4"]).toBe(175);
    expect(MA_PRODUCT_TIME_REPORT_IDS_BY_DATE.submission.foodNotification).toEqual({ face: 185, median: 186, average: 187 });
    expect(MA_PRODUCT_TIME_REPORT_IDS_BY_DATE.decision.medicine).toEqual({ face: 118, median: 119, average: 120 });
    expect(MA_PRODUCT_PAR_REPORT_IDS_BY_DATE.submission.cosmetics).toEqual({ face: 202, drilldown: 203 });
  });

  it("uses dateBasis only for report routing, not as an API form field", () => {
    const body = buildMAFaceRequestBody({
      startDate: "2026-01-01",
      endDate: "2026-09-02",
      dateBasis: "decision",
    });
    expect(body.get("startDate")).toBe("2026-01-01");
    expect(body.get("endDate")).toBe("2026-09-02");
    expect(body.has("dateBasis")).toBe(false);
  });
});
