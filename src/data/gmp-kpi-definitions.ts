import type { GMPKPIId } from "@/types/gmp-api";

export const KPI_DEFINITIONS: Array<{ id: GMPKPIId; title: string; description: string }> = [
  { id: "GMP-KPI-1", title: "Facilities inspected as per plan", description: "Pharmaceutical manufacturing facilities inspected against the approved plan." },
  { id: "GMP-KPI-2", title: "Complaint-triggered inspections", description: "Complaint-triggered inspections conducted against those planned or required. Reporting is not yet available." },
  { id: "GMP-KPI-3", title: "On-site inspections waived", description: "Abroad GMP inspection waivers and screening and final-stage timelines." },
  { id: "GMP-KPI-4", title: "Facilities compliant with GMP", description: "Local and abroad facilities certified following GMP inspection." },
  { id: "GMP-KPI-5", title: "CAPA decisions within timeline", description: "Timeliness of final decisions on corrective and preventive action responses." },
  { id: "GMP-KPI-6", title: "Applications completed within timeline", description: "End-to-end completion of GMP inspection applications within the set timeline." },
  { id: "GMP-KPI-7", title: "Average turnaround time", description: "Average regulator processing time for completed GMP applications." },
  { id: "GMP-KPI-8", title: "Median turnaround time", description: "Median regulator processing time for completed GMP applications." },
  { id: "GMP-KPI-9", title: "Inspection reports published on time", description: "Timely publication of GMP inspection outcomes." },
];
