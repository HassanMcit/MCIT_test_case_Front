import { getProjects } from "./getProjects.action";
import { getQualityApplications } from "../quality/quality.action";
import ProjectsForm from "./ProjectsForm";


export default async function Page() {
  const [initialProjects, qualityData] = await Promise.all([
    getProjects(),
    getQualityApplications(),
  ]);
  const allApplications = qualityData?.applications || [];

  return (
    <ProjectsForm
      serverProjects={initialProjects}
      allApplications={allApplications}
    />
  );
}
