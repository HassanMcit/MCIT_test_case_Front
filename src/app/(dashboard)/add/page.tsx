import { getProjects } from '../projects/getProjects.action'
import { getQualityApplications } from '../quality/quality.action'
import AddTestCasePage from './TestCaseForm'


async function Page() {
  const [allProjects, qualityData] = await Promise.all([
    getProjects({ assignedToMe: true }),
    getQualityApplications(),
  ]);
  const allApplications = qualityData?.applications || [];

  return (
    <AddTestCasePage
      allProjects={allProjects}
      allApplications={allApplications}
    />
  )
}

export default Page
