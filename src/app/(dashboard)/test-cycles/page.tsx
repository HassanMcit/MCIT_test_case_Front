import { getProjects } from "../projects/getProjects.action";
import { getCurrentUserSession } from "@/app/myUtil";
import WorkflowManager from "./WorkflowManager";
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
  return (
    <WorkflowManager
      projects={projects}
      isAdmin={user?.role === "admin"}
      initialProjectId={query.projectId}
    />
  );
}
