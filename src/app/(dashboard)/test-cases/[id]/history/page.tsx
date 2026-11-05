import { workflowRequest } from "../../../test-cycles/workflow.action";
import type { Execution, PageData } from "../../../test-cycles/workflow.types";
import ExecutionHistory from "./ExecutionHistory";

export const fetchCache = "force-cache";

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  let initialResult = await workflowRequest<PageData<Execution>>(
    `test-cases/${numericId}/executions?page=1`,
  );

  if (initialResult.ok && initialResult.data.data.length === 0) {
    const tcResult = await workflowRequest<any>(`test-cases/${numericId}`);
    if (tcResult.ok && tcResult.data) {
      const tc = tcResult.data;
      const execTime =
        tc.importMetadata?.plannedAt ||
        tc.importMetadata?.importedAt ||
        tc.executedAt ||
        tc.createdAt ||
        new Date().toISOString();
      const fallbackExec: Execution = {
        id: tc.id,
        testCaseId: tc.id,
        status:
          tc.status === "passed" ||
          tc.status === "failed" ||
          tc.status === "blocked" ||
          tc.status === "skipped"
            ? tc.status
            : "not_run",
        actualResult: tc.actualResult || null,
        notes: tc.notes || null,
        environment: "production",
        testerName: tc.tester?.name || "System User",
        executedAt: execTime,
        recordedAt: tc.importMetadata?.importedAt || tc.createdAt || execTime,
        durationSeconds: null,
        releaseName: null,
        version: null,
        cycleName: null,
        source: "legacy",
        snapshot: {
          id: tc.id,
          testId: tc.testId,
          module: tc.module,
          pageName: tc.pageName,
          scenario: tc.scenario,
          preConditions: tc.preConditions,
          steps: tc.steps || [],
          expectedResult: tc.expectedResult,
          priority: tc.priority,
        },
      };
      initialResult = {
        ok: true,
        data: {
          data: [fallbackExec],
          meta: {
            total: 1,
            page: 1,
            limit: 20,
            totalPages: 1,
          },
        },
      };
    }
  }

  return <ExecutionHistory id={numericId} initialResult={initialResult} />;
}
