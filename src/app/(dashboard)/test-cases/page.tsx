import { getProjects } from "../projects/getProjects.action";
import { getTestCases } from "./test-cases.action";
import TestCasesTable from "./TestCasesTable";

interface PageProps {
  searchParams: Promise<{
    projectId?: string;
    status?: string;
    priority?: string;
    search?: string;
  }>;
}

export default async function TestCasesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const parsedProjectId = resolvedSearchParams?.projectId
    ? Number(resolvedSearchParams.projectId)
    : undefined;

  // جلب المشاريع وحالات الاختبار في نفس الوقت
  const [allProjects, initialData] = await Promise.all([
    getProjects(),
    getTestCases({
      projectId: parsedProjectId,
      status: resolvedSearchParams?.status,
      priority: resolvedSearchParams?.priority,
      search: resolvedSearchParams?.search,
      limit: 100,
    }),
  ]);

  return (
    <TestCasesTable
      initialData={initialData}
      allProjects={allProjects}
      initialProjectId={parsedProjectId}
    />
  );
}
