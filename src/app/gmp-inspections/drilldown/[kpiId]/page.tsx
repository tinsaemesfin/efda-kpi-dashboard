import { notFound } from "next/navigation";
import { KPI_DEFINITIONS } from "@/data/gmp-kpi-definitions";
import { GMPDetailPage } from "@/components/kpi/gmp-detail-page";

export default async function Page({ params, searchParams }: {
  params: Promise<{ kpiId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { kpiId } = await params;
  const definition = KPI_DEFINITIONS.find((item) => item.id === kpiId);
  if (!definition) notFound();
  const query = await searchParams;
  const serialized = new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => typeof entry[1] === "string")).toString();
  return <GMPDetailPage kpiId={definition.id} title={definition.title} query={serialized} />;
}
