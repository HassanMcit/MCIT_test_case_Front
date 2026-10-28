import { getProjects } from "./getProjects.action";
import { getQualityApplications } from "../quality/quality.action";
import ProjectsForm from "./ProjectsForm";

export const fetchCache = "force-cache";

export default async function Page() {
  const initialProjects = await getProjects();
  const qualityData = await getQualityApplications();
  const allApplications = qualityData?.applications || [];

  return (
    <ProjectsForm
      serverProjects={initialProjects}
      allApplications={allApplications}
    />
  );
}
