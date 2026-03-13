import type { MAKPIId, MAModuleToKpiMapping } from "@/types/ma-api";
import { MA_DEFAULT_MODULE_TO_KPI_MAPPING } from "@/lib/ma-api/constants";

const MAPPING_ENV_KEY = "NEXT_PUBLIC_MA_MODULE_KPI_MAPPING";

function isKpiId(value: string): value is MAKPIId {
  return (
    value === "MA-KPI-1" ||
    value === "MA-KPI-2" ||
    value === "MA-KPI-3" ||
    value === "MA-KPI-4"
  );
}

function parseMappingString(rawMapping: string): MAModuleToKpiMapping {
  const parsed: MAModuleToKpiMapping = {};
  const entries = rawMapping
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  entries.forEach((entry) => {
    const [rawModule, rawKpi] = entry.split(":").map((part) => part?.trim().toUpperCase());
    if (!rawModule || !rawKpi || !isKpiId(rawKpi)) return;
    parsed[rawModule] = rawKpi;
  });

  return parsed;
}

export function getConfiguredMAModuleToKpiMapping(): MAModuleToKpiMapping {
  const rawMapping = process.env[MAPPING_ENV_KEY];
  if (!rawMapping) {
    return MA_DEFAULT_MODULE_TO_KPI_MAPPING;
  }

  const parsed = parseMappingString(rawMapping);
  return Object.keys(parsed).length > 0 ? parsed : MA_DEFAULT_MODULE_TO_KPI_MAPPING;
}
