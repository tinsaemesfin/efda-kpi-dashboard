import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MAKPICard } from "@/components/kpi/ma-kpi-card";

describe("MA FIR card", () => {
  it("shows the selected product, its application lanes, and the other products from the same report", () => {
    const html = renderToStaticMarkup(
      createElement(MAKPICard, {
        kpiCode: "MA-KPI-5",
        title: "FIR response to team leader on time",
        value: "71.2",
        suffix: "%",
        numerator: 3328,
        denominator: 4671,
        targetDays: 30,
        status: "warning",
        dataAttribution: "live",
        moduleBreakdown: [
          { code: "Renewal", label: "Renewal: 1,767 of 2,298", percentage: 76.89 },
          { code: "Variation", label: "Variation: 1,561 of 2,373", percentage: 65.78 },
        ],
      })
    );

    expect(html).toContain("MA-KPI-5");
    expect(html).toContain("On-time completion");
    expect(html).toContain("71.2");
    expect(html).toContain("SLA 30 days");
    expect(html).toContain("Renewal");
    expect(html).toContain("76.9%");
    expect(html).toContain("Variation");
    expect(html).not.toContain("Same report");
  });
});
