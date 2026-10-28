import { fetchAssignData } from "./assign.action";
import AssignProjectsClient from "./AssignProjectsClient";

export const fetchCache = "force-cache";

export default async function AssignProjectsPage() {
  const res = await fetchAssignData();
  return (
    <AssignProjectsClient
      initialUsers={res.success ? res.users : []}
      initialProjects={res.success ? res.projects : []}
    />
  );
}
