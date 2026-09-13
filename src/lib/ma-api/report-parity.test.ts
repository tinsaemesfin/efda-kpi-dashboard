// Optional integration check against the aggregate output of the read-only SQL
// verifier. Set MA_REPORT_VERIFY_FILE to verification-2025.json (or another year).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildMAKpi1DrilldownData, buildMAKpi2DrilldownData, buildMAKpi3DrilldownData, buildMAKpi4DrilldownData, buildMAKpi8DrilldownData } from './drilldown';
import { buildMAKpi6DrilldownData, buildMAKpi7DrilldownData } from './time-drilldown';
import { timeDistribution } from './distribution';
import { normalizeMAPARFaceData } from './par-normalizer';
import { normalizeMAFaceData } from './normalizer';
import { normalizeMAMedicineMedianAverageFaceData } from './median-average-normalizer';
import { MA_COSMETICS_FACE_MODULE_TO_KPI_MAPPING, MA_PRODUCT_STANDARD_FACE_REPORT_IDS_BY_DATE, MA_PRODUCT_STANDARD_DRILLDOWN_REPORT_IDS_BY_DATE, MA_PRODUCT_TIME_REPORT_IDS_BY_DATE, MA_PRODUCT_PAR_REPORT_IDS_BY_DATE } from './constants';
import type { MAApiDataRow, MAApiDrilldownRow, MAApiMedianAverageDataRow, MAApiMedianDrilldownRow, MAApiAverageDrilldownRow, MAReportProduct, MADateBasis, MAKPIId } from '@/types/ma-api';

const file = process.env.MA_REPORT_VERIFY_FILE;
const snapshot: {results: Record<number, unknown[]>} = file ? JSON.parse(readFileSync(file,'utf8')) : {results:{}};
const rows = <T,>(id: number) => snapshot.results[id] as T[];
describe.skipIf(!file)('SQL results remain aligned after frontend normalization', () => {
  for (const product of ['medicine','food','foodNotification','medicalDevice','cosmetics'] as MAReportProduct[]) {
    for (const basis of ['submission','decision'] as MADateBasis[]) {
      it(`${product}/${basis}: all live KPI headlines`, () => {
        const face=normalizeMAFaceData(rows<MAApiDataRow>(MA_PRODUCT_STANDARD_FACE_REPORT_IDS_BY_DATE[basis][product]), {
          moduleToKpiMapping: product==='cosmetics'?MA_COSMETICS_FACE_MODULE_TO_KPI_MAPPING:undefined,
        }).kpiFaceDataById;
        const builders = { 'MA-KPI-1': buildMAKpi1DrilldownData, 'MA-KPI-2': buildMAKpi2DrilldownData, 'MA-KPI-3': buildMAKpi3DrilldownData, 'MA-KPI-4': buildMAKpi4DrilldownData };
        for (const [key,id] of Object.entries(MA_PRODUCT_STANDARD_DRILLDOWN_REPORT_IDS_BY_DATE[basis][product])) {
          const kpi=key as MAKPIId;
          const dd=builders[kpi](rows<MAApiDrilldownRow>(id));
          expect(dd.currentValue.numerator??0).toBe(face[kpi]?.numerator??0);
          expect(dd.currentValue.denominator??0).toBe(face[kpi]?.denominator??0);
          expect(dd.currentValue.percentage??0).toBeCloseTo(face[kpi]?.percentage??0,8);
        }
        const t=MA_PRODUCT_TIME_REPORT_IDS_BY_DATE[basis][product];
        const time=normalizeMAMedicineMedianAverageFaceData(rows<MAApiMedianAverageDataRow>(t.face)).kpiTimeDataById;
        if(rows<MAApiMedianDrilldownRow>(t.median).length)expect(buildMAKpi6DrilldownData(rows<MAApiMedianDrilldownRow>(t.median)).currentValue.median).toBe(time['MA-KPI-6']?.median);
        if(rows<MAApiAverageDrilldownRow>(t.average).length)expect(buildMAKpi7DrilldownData(rows<MAApiAverageDrilldownRow>(t.average)).currentValue.average).toBe(time['MA-KPI-7']?.average);
        const medianView = buildMAKpi6DrilldownData(rows<MAApiMedianDrilldownRow>(t.median));
        const averageView = buildMAKpi7DrilldownData(rows<MAApiAverageDrilldownRow>(t.average));
        for (const view of medianView.categoryViews) for (const item of view.items) {
          const averageItem = averageView.categoryViews.find(v => v.id === view.id)?.items.find(row => row.category === item.category);
          expect(averageItem).toBeDefined();
          const stats = timeDistribution(item, 'median');
          expect(stats).not.toBeNull();
          expect(timeDistribution(averageItem!, 'average')).toEqual(stats);
          expect(stats!.min).not.toBeNull();
          expect(stats!.max).not.toBeNull();
          expect(stats!.mean!).toBeGreaterThanOrEqual(stats!.min!);
          expect(stats!.mean!).toBeLessThanOrEqual(stats!.max!);
        }
        const p=MA_PRODUCT_PAR_REPORT_IDS_BY_DATE[basis][product];
        const par=normalizeMAPARFaceData(rows<MAApiDataRow>(p.face)).parData;
        const dd=buildMAKpi8DrilldownData(rows<MAApiDrilldownRow>(p.drilldown));
        expect(dd.currentValue.numerator??0).toBe(par?.numerator??0);
        expect(dd.currentValue.denominator??0).toBe(par?.denominator??0);
      });
    }
  }
});
