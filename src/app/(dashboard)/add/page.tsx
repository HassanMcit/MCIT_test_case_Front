import { getProjects } from '../projects/getProjects.action'
import AddTestCasePage from './TestCaseForm'

export const dynamic = "force-dynamic";

async function Page() {
  
  const allProjects = await getProjects({ assignedToMe: true });
  
  

  return (
    <AddTestCasePage allProjects={allProjects}/>
  )
}

export default Page
