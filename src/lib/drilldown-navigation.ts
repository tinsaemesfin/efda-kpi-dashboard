import type { MAReportProduct, MAApiFilterParams } from "@/types/ma-api";

export const MA_PRODUCTS: Record<MAReportProduct, string> = {
  medicine: "Medicine", food: "Food", foodNotification: "Food notification",
  medicalDevice: "Medical device", cosmetics: "Cosmetics",
};

export function readDrilldownFilters(params: Pick<URLSearchParams, "get">): MAApiFilterParams {
  const date = (key: string) => {
    const value = params.get(key);
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : undefined;
  };
  return { startDate: date("startDate"), endDate: date("endDate"), dateBasis: params.get("dateBasis") === "decision" ? "decision" : "submission" };
}

export function readMAProduct(value: string | null): MAReportProduct {
  return value && Object.hasOwn(MA_PRODUCTS, value) ? value as MAReportProduct : "medicine";
}

export function drilldownQuery(filters?: MAApiFilterParams, product?: MAReportProduct): string {
  const query = new URLSearchParams();
  if (product) query.set("product", product);
  if (filters?.startDate) query.set("startDate", filters.startDate);
  if (filters?.endDate) query.set("endDate", filters.endDate);
  if (filters?.dateBasis) query.set("dateBasis", filters.dateBasis);
  return query.toString();
}
