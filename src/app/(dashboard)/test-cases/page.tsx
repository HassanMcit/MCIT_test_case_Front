import { getProjects } from "../projects/getProjects.action";
import { getQualityApplications } from "../quality/quality.action";
import { getTestCases } from "./test-cases.action";
import TestCasesTable from "./TestCasesTable";

export const fetchCache = "force-cache";
export const unstable_dynamicStaleTime = 600;

interface PageProps {
  searchParams: Promise<{
    projectId?: string;
    status?: string;
    priority?: string;
    search?: string;
    export?: string;
  }>;
}

export default async function TestCasesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const parsedProjectId = resolvedSearchParams?.projectId
    ? Number(resolvedSearchParams.projectId)
    : undefined;

  // جلب المشاريع والتطبيقات وحالات الاختبار في نفس الوقت
  const [allProjects, qualityData, initialData] = await Promise.all([
    getProjects(),
    getQualityApplications(),
    getTestCases({
      projectId: parsedProjectId,
      status: resolvedSearchParams?.status,
      priority: resolvedSearchParams?.priority,
      search: resolvedSearchParams?.search,
      limit: 1000,
    }),
  ]);
  const allApplications = qualityData?.applications || [];

  return (
    <TestCasesTable
      initialData={initialData}
      allProjects={allProjects}
      allApplications={allApplications}
      initialProjectId={parsedProjectId}
      autoOpenExport={resolvedSearchParams?.export === "1"}
    />
  );
}
