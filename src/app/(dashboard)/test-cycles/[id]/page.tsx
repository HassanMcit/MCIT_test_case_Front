import { getCurrentUserSession } from "@/app/myUtil";
import { workflowRequest } from "../workflow.action";
import type { Cycle } from "../workflow.types";
import CycleWorkspace from "./CycleWorkspace";

export const fetchCache = "force-cache";

export default async function CyclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id))
    return <p className="p-8">Invalid cycle / دورة غير صالحة</p>;
  const [result, user] = await Promise.all([
    workflowRequest<Cycle>(`test-cycles/${id}`),
    getCurrentUserSession(),
  ]);
  return (
    <CycleWorkspace
      id={Number(id)}
      initial={result.ok ? result.data : null}
      initialError={result.ok ? "" : result.error}
      isAdmin={user?.role === "admin"}
      userId={user?.id || 0}
    />
  );
}
