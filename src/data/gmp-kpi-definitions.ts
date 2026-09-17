import type { GMPKPIId } from "@/types/gmp-api";

export const KPI_DEFINITIONS: Array<{ id: GMPKPIId; title: string; description: string }> = [
  { id: "GMP-KPI-1", title: "Percentage of Pharmaceutical Manufacturing Facilities Inspected for GMP as per Plan", description: "Pharmaceutical manufacturing facilities inspected against the approved plan." },
  { id: "GMP-KPI-2", title: "Percentage of Complaint-Triggered GMP Inspections Conducted at Pharmaceutical Manufacturing Facilities", description: "Complaint-triggered inspections conducted against those planned or required. Reporting is not yet available." },
  { id: "GMP-KPI-3", title: "Percentage of GMP On-Site Inspections Waived for Pharmaceutical Manufacturing Facilities", description: "Abroad GMP inspection waivers and screening and final-stage timelines." },
  { id: "GMP-KPI-4", title: "Percentage of Pharmaceutical Manufacturing Facilities Compliant with GMP Requirements", description: "Local and abroad facilities certified following GMP inspection." },
  { id: "GMP-KPI-5", title: "Percentage of Final CAPA Decisions Issued Within a Specified Timeline", description: "Timeliness of final decisions on corrective and preventive action responses." },
  { id: "GMP-KPI-6", title: "Percentage of GMP Inspection Applications for Pharmaceutical Manufacturing Facilities Completed Within the Set Timeline", description: "End-to-end completion of GMP inspection applications within the set timeline." },
  { id: "GMP-KPI-7", title: "Average Turnaround Time (in Days) to Complete GMP Inspection Applications for Pharmaceutical Manufacturing Facilities", description: "Average regulator processing time for completed GMP applications." },
  { id: "GMP-KPI-8", title: "Median Turnaround Time (in Days) to Complete GMP Inspection Applications for Pharmaceutical Manufacturing Facilities", description: "Median regulator processing time for completed GMP applications." },
  { id: "GMP-KPI-9", title: "Percentage of GMP Inspection Reports Published on the Regulator’s Website Within a Specified Timeline", description: "Timely publication of GMP inspection outcomes." },
];
