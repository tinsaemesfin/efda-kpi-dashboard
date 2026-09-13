import { afterEach, describe, expect, it, vi } from 'vitest';
import * as client from './client';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

const cases = [
  ['fetchMAFaceTabularData',8,155],
  ['fetchMAFoodFaceTabularData',14,156],
  ['fetchMAFoodNotificationFaceTabularData',15,157],
  ['fetchMAMedicalDeviceFaceTabularData',16,158],
  ['fetchMACosmeticsFaceTabularData',17,159],
  ['fetchMAKpi1DrilldownTabularData',9,160],
  ['fetchMAKpi2DrilldownTabularData',10,161],
  ['fetchMAKpi3DrilldownTabularData',11,162],
  ['fetchMAKpi4DrilldownTabularData',13,163],
  ['fetchMAFoodKpi1DrilldownTabularData',18,164],
  ['fetchMAFoodKpi2DrilldownTabularData',19,165],
  ['fetchMAFoodKpi3DrilldownTabularData',20,166],
  ['fetchMAFoodKpi4DrilldownTabularData',21,167],
  ['fetchMAMedicalDeviceKpi1DrilldownTabularData',22,172],
  ['fetchMAMedicalDeviceKpi2DrilldownTabularData',23,173],
  ['fetchMAMedicalDeviceKpi3DrilldownTabularData',24,174],
  ['fetchMAMedicalDeviceKpi4DrilldownTabularData',25,175],
  ['fetchMAMedicineMedianAverageFaceTabularData',179,118],
  ['fetchMAMedicineMedianDrilldownTabularData',180,119],
  ['fetchMAMedicineAverageDrilldownTabularData',181,120],
  ['fetchMAMedicineParFaceTabularData',194,114],
  ['fetchMAFoodParFaceTabularData',196,115],
  ['fetchMAMedicalDeviceParFaceTabularData',200,116],
  ['fetchMACosmeticsParFaceTabularData',202,117],
] as const;

describe('MA report requests follow the selected date basis', () => {
  for (const [name,submission,decision] of cases) {
    it.each(['submission','decision'] as const)(`${name}: %s`, async dateBasis => {
      vi.stubEnv('NEXT_PUBLIC_API_KPI','https://example.test/api/kpi');
      const fetch = vi.fn().mockResolvedValue({ok:true,json:async()=>({data:[]})});
      vi.stubGlobal('fetch',fetch);
      await client[name]('test-token',{startDate:'2025-01-01',endDate:'2025-12-31',dateBasis},{force:true});
      const [url,request] = fetch.mock.calls[0];
      expect(url).toBe(`https://example.test/api/kpi/tabular/${dateBasis==='submission'?submission:decision}`);
      const body=new URLSearchParams(request.body);
      expect(body.get('startDate')).toBe('2025-01-01');
      expect(body.get('endDate')).toBe('2025-12-31');
      expect(body.has('dateBasis')).toBe(false);
    });
  }
});
