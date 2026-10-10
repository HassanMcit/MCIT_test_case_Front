import { getProjects } from "./getProjects.action";
import ProjectsForm from "./ProjectsForm";

export default async function Page() {
  const initialProjects = await getProjects();

  return <ProjectsForm serverProjects={initialProjects} />;
}
