import { notFound } from "next/navigation";
import { MADetailPage } from "@/components/kpi/ma-detail-page";

export default async function Page({ params, searchParams }: {
  params: Promise<{ kpiId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { kpiId } = await params;
  const query = await searchParams;
  if (!/^MA-KPI-[1234678]$/.test(kpiId)) notFound();
  const serialized = new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => typeof entry[1] === "string")).toString();
  return <MADetailPage kpiId={kpiId} query={serialized} />;
}
