/**
 * GMP API Service
 * Fetches GMP KPI data from the iLicense API
 */

import { httpService } from './http.service';

// API Response types based on the tabular report format
export interface TabularReportRow {
  category: string;  // e.g., "ABROAD", "LOCAL"
  amount: number;    // numerator
  total: number;     // denominator
  percentage: number;
}

export interface GMPInspectionPerPlanResponse {
  data: TabularReportRow[];
  reportId: number;
  reportName?: string;
}

// Report IDs for different GMP KPIs
export const GMP_REPORT_IDS = {
  INSPECTION_PER_PLAN: 4,  // KPI-1: Percentage of GMP Inspected per Plan
  // Add more report IDs as backend provides them
} as const;

class GMPApiService {
  /**
   * Parse tabular report response
   * Expected format: "CATEGORY AMOUNT TOTAL PERCENTAGE" per line
   * e.g., "ABROAD 94 180 52.22\nLOCAL 5 180 2.78"
   */
  private parseTabularResponse(rawData: any): TabularReportRow[] {
    // Handle array response format
    if (Array.isArray(rawData)) {
      return rawData.map((row: any) => ({
        category: row.category || row.Category || row[0] || '',
        amount: Number(row.amount || row.Amount || row.numerator || row[1] || 0),
        total: Number(row.total || row.Total || row.denominator || row[2] || 0),
        percentage: Number(row.percentage || row.Percentage || row[3] || 0),
      }));
    }

    // Handle string response format (space-separated values)
    if (typeof rawData === 'string') {
      const lines = rawData.trim().split('\n');
      return lines.map((line) => {
        const parts = line.trim().split(/\s+/);
        return {
          category: parts[0] || '',
          amount: Number(parts[1]) || 0,
          total: Number(parts[2]) || 0,
          percentage: Number(parts[3]) || 0,
        };
      });
    }

    // Handle object response format with data array
    if (rawData?.data && Array.isArray(rawData.data)) {
      return this.parseTabularResponse(rawData.data);
    }

    // Handle object with rows property
    if (rawData?.rows && Array.isArray(rawData.rows)) {
      return this.parseTabularResponse(rawData.rows);
    }

    console.warn('Unknown response format:', rawData);
    return [];
  }

  /**
   * Fetch GMP Inspection Per Plan data (KPI-1)
   * API: /api/Report/Tabular/4
   */
  async getInspectionPerPlanData(): Promise<GMPInspectionPerPlanResponse> {
    try {
      const endpoint = `/api/Report/Tabular/${GMP_REPORT_IDS.INSPECTION_PER_PLAN}`;
      const rawResponse = await httpService.get<any>(endpoint);
      
      const data = this.parseTabularResponse(rawResponse);
      
      return {
        data,
        reportId: GMP_REPORT_IDS.INSPECTION_PER_PLAN,
        reportName: 'Percentage of GMP Inspected per Plan',
      };
    } catch (error) {
      console.error('Error fetching GMP Inspection Per Plan data:', error);
      throw error;
    }
  }

  /**
   * Fetch generic tabular report by ID
   */
  async getTabularReport(reportId: number): Promise<TabularReportRow[]> {
    try {
      const endpoint = `/api/Report/Tabular/${reportId}`;
      const rawResponse = await httpService.get<any>(endpoint);
      return this.parseTabularResponse(rawResponse);
    } catch (error) {
      console.error(`Error fetching tabular report ${reportId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate totals from disaggregated data
   */
  calculateTotals(data: TabularReportRow[]): {
    totalAmount: number;
    totalDenominator: number;
    overallPercentage: number;
  } {
    const totalAmount = data.reduce((sum, row) => sum + row.amount, 0);
    // Use the first row's total as the denominator (they should all be the same)
    const totalDenominator = data.length > 0 ? data[0].total : 0;
    const overallPercentage = totalDenominator > 0 
      ? (totalAmount / totalDenominator) * 100 
      : 0;

    return {
      totalAmount,
      totalDenominator,
      overallPercentage,
    };
  }

  /**
   * Transform API data to KPI card format
   */
  transformToKPIFormat(data: TabularReportRow[]): {
    numerator: number;
    denominator: number;
    percentage: number;
    disaggregations: Record<string, { label: string; value: number; percentage: number }>;
  } {
    const totals = this.calculateTotals(data);
    
    const disaggregations: Record<string, { label: string; value: number; percentage: number }> = {};
    
    data.forEach((row) => {
      const key = row.category.toLowerCase().replace(/\s+/g, '_');
      disaggregations[key] = {
        label: row.category,
        value: row.amount,
        percentage: row.percentage,
      };
    });

    return {
      numerator: totals.totalAmount,
      denominator: totals.totalDenominator,
      percentage: totals.overallPercentage,
      disaggregations,
    };
  }
}

export const gmpApiService = new GMPApiService();

