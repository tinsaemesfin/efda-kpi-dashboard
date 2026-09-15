import type { GMPKPIId } from "@/types/gmp-api";

// Source: KPI dashbaords.xlsx, final!B2:I30. Report IDs follow Reports(@qmesfin).
// Preserve report results when the workbook's business and workflow formulas differ.
export const GMP_KPI_GUIDANCE: Record<GMPKPIId, { frequency: string; calculation: string; context: string }> = {
  "GMP-KPI-1": {
    frequency: "Monthly, quarterly and annually",
    calculation: "Inspected applications ÷ configured inspection plan × 100, separately for local and abroad facilities.",
    context: "Inspection Report Submitted marks inspection. Screening, inspection and final-stage timelines compare processing days with their respective targets, excluding applicant waiting periods. Joint on-site foreign inspections are not applicable.",
  },
  "GMP-KPI-2": {
    frequency: "Quarterly",
    calculation: "Complaint-triggered inspections conducted ÷ complaint-triggered inspections planned or required × 100.",
    context: "Local, abroad and waiver reports are not yet available.",
  },
  "GMP-KPI-3": {
    frequency: "Quarterly and annually",
    calculation: "Requested abroad waiver applications ÷ certified abroad and waiver applications × 100.",
    context: "The workflow definition uses requested waivers and full or partial certificates. The business definition instead refers to waived inspections over conducted or planned inspections. Screening and final-stage timelines are shown separately.",
  },
  "GMP-KPI-4": {
    frequency: "Annually",
    calculation: "Applications with full or partial compliance certificates ÷ inspected applications × 100, separately for local and abroad facilities.",
    context: "Inspection outcomes include recommendations for approval, non-compliance, CAPA or partial approval. Joint and remote inspections are not applicable.",
  },
  "GMP-KPI-5": {
    frequency: "Quarterly",
    calculation: "Evaluated CAPA applications ÷ applications with a submitted CAPA plan or plan and implementation evidence × 100.",
    context: "ImplementationReportSubmitted marks evaluation. Evaluation time starts at CAPA submission and excludes ReturnForCorrection. The business definition requires decisions within a specified timeline; the workflow ratio does not specify that time condition. The evaluation target is unresolved in the workbook.",
  },
  "GMP-KPI-6": {
    frequency: "Quarterly",
    calculation: "Applications certified within the configured timeline ÷ requested applications × 100, separately for local, abroad and abroad waiver applications.",
    context: "Full and partial certificates count as completion. The business definition uses completed applications as the denominator, while the workflow definition uses requested applications. Percentages are displayed as returned by the report.",
  },
  "GMP-KPI-7": {
    frequency: "Quarterly",
    calculation: "Total processing days for completed applications ÷ completed applications.",
    context: "Measure from Requested to a full or partial compliance certificate. Separate total, EFDA and applicant time where reported. Turnaround is measured in days; the workbook's ×100 does not apply to a mean in days. Its full applicant-status exclusion list remains unspecified.",
  },
  "GMP-KPI-8": {
    frequency: "Annually",
    calculation: "Median processing days among completed GMP applications, separately for local and abroad facilities.",
    context: "The median is a statistical value, not a numerator-to-denominator ratio. The workbook refers to the iRegister method without specifying it; values use the configured reports.",
  },
  "GMP-KPI-9": {
    frequency: "Annually",
    calculation: "Configured published-report count ÷ applications with full or partial certificates in the year × 100, separately for local and abroad facilities.",
    context: "The business definition requires publication within a specified timeline over finalized reports. The workflow definition uses a supplied count over certified applications.",
  },
};
