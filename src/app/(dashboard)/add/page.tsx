import { getProjects, type ProjectApiItem } from '../projects/getProjects.action'
import { getQualityApplications } from '../quality/quality.action'
import type { QualityApplication } from '../quality/quality.interface'
import AddTestCasePage from './TestCaseForm'


async function Page() {
  let allProjects: ProjectApiItem[] = [];
  let allApplications: QualityApplication[] = [];
  try {
    const [projectsRes, qualityData] = await Promise.all([
      getProjects({ assignedToMe: true }).catch(() => []),
      getQualityApplications().catch(() => ({ applications: [] })),
    ]);
    allProjects = projectsRes || [];
    allApplications = qualityData?.applications || [];
  } catch (err) {
    console.error("Error fetching add page initial data:", err);
  }

  return (
    <AddTestCasePage
      allProjects={allProjects}
      allApplications={allApplications}
    />
  )
}

export default Page
