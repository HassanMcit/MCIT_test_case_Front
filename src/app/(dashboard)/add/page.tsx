import { getProjects } from '../projects/getProjects.action'
import { getQualityApplications } from '../quality/quality.action'
import AddTestCasePage from './TestCaseForm'

export const dynamic = "force-dynamic";

async function Page() {
  const allProjects = await getProjects({ assignedToMe: true });
  const qualityData = await getQualityApplications();
  const allApplications = qualityData?.applications || [];

  return (
    <AddTestCasePage
      allProjects={allProjects}
      allApplications={allApplications}
    />
  )
}

export default Page
