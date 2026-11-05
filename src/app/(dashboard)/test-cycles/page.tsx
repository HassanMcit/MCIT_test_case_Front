import { getProjects } from "../projects/getProjects.action";
import { getCurrentUserSession } from "@/app/myUtil";
import WorkflowManager from "./WorkflowManager";
import { workflowRequest } from "./workflow.action";
import type { Cycle, PageData } from "./workflow.types";

export default async function TestCyclesPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const [projects, user, query] = await Promise.all([
    getProjects(),
    getCurrentUserSession(),
    searchParams,
  ]);
  const projectId = projects.some(
    (project) => String(project.id) === query.projectId,
  )
    ? (query.projectId ?? "")
    : String(projects[0]?.id || "");
  const initialCycles = projectId
    ? await workflowRequest<PageData<Cycle>>(
        `test-cycles?${new URLSearchParams({ projectId, page: "1", search: "", status: "" })}`,
      )
    : null;
  return (
    <WorkflowManager
      projects={projects}
      isAdmin={user?.role === "admin"}
      initialProjectId={projectId}
      initialCycles={initialCycles?.ok ? initialCycles.data : undefined}
    />
  );
}
