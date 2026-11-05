import { workflowRequest } from "../../../test-cycles/workflow.action";
import type { Execution, PageData } from "../../../test-cycles/workflow.types";
import ExecutionHistory from "./ExecutionHistory";


export default async function HistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const initialResult = await workflowRequest<PageData<Execution>>(
    `test-cases/${Number(id)}/executions?page=1`,
  );
  return <ExecutionHistory id={Number(id)} initialResult={initialResult} />;
}
