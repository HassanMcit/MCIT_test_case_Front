import ExecutionHistory from "./ExecutionHistory";

export const fetchCache = "force-cache";

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ExecutionHistory id={Number(id)} />;
}
