import type { KpiSignal } from "@/data/dashboard-product-performance";

export function formatSignalValue(signal: KpiSignal): string {
  const decimals =
    signal.decimals ??
    (/[%]/.test(signal.suffix.trim())
      ? 1
      : signal.suffix.toLowerCase().includes("day")
        ? 0
        : 1);
  const v = typeof signal.value === "number" ? signal.value.toFixed(decimals) : String(signal.value);
  return `${v}${signal.suffix}`;
}
