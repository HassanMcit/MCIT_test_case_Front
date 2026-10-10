import { getProjects } from "./getProjects.action";
import ProjectsForm from "./ProjectsForm";

export const dynamic = "force-dynamic";

export default async function Page() {
  const initialProjects = await getProjects();

  return <ProjectsForm serverProjects={initialProjects} />;
}
