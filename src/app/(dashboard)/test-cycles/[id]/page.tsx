import { getCurrentUserSession } from "@/app/myUtil";
import { workflowRequest } from "../workflow.action";
import type { Cycle, CycleItem, PageData } from "../workflow.types";
import CycleWorkspace from "./CycleWorkspace";


export default async function CyclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id))
    return <p className="p-8">Invalid cycle / دورة غير صالحة</p>;
  const [result, user, items] = await Promise.all([
    workflowRequest<Cycle>(`test-cycles/${id}`),
    getCurrentUserSession(),
    workflowRequest<PageData<CycleItem>>(`test-cycles/${id}/items?page=1&search=&status=`),
  ]);
  return (
    <CycleWorkspace
      id={Number(id)}
      initial={result.ok ? result.data : null}
      initialError={result.ok ? "" : result.error}
      initialItems={items.ok ? items.data : undefined}
      isAdmin={user?.role === "admin"}
      userId={user?.id || 0}
    />
  );
}
