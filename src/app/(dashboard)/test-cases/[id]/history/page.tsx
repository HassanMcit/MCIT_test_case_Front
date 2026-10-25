import ExecutionHistory from "./ExecutionHistory";
export default async function HistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ExecutionHistory id={Number(id)} />;
}
