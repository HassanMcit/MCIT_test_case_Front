import { fetchAssignData } from "./assign.action";
import AssignProjectsClient from "./AssignProjectsClient";


export default async function AssignProjectsPage() {
  const res = await fetchAssignData();
  return (
    <AssignProjectsClient
      initialUsers={res.success ? res.users : []}
      initialProjects={res.success ? res.projects : []}
    />
  );
}
