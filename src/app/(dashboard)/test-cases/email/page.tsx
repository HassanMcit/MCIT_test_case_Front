import { getFailedTestCases, getTestCaseById } from "../test-cases.action";
import EmailComposer from "./EmailComposer";
import type { TestCaseItem } from "../test-cases.interface";

interface PageProps {
  searchParams: Promise<{
    id?: string;
  }>;
}

export default async function DefectEmailPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const targetId = resolvedSearchParams?.id ? Number(resolvedSearchParams.id) : undefined;

  // 1. Fetch all failed test cases (force-cached)
  const failedCases = await getFailedTestCases();

  // 2. Resolve initial test case
  let initialTestCase: TestCaseItem | null = null;
  if (targetId && !Number.isNaN(targetId)) {
    const foundInFailed = failedCases.find((c) => c.id === targetId);
    if (foundInFailed) {
      initialTestCase = foundInFailed;
    } else {
      // Fetch directly and verify it is indeed failed
      const single = await getTestCaseById(targetId);
      if (single && single.status === "failed") {
        initialTestCase = single;
      }
    }
  }

  // If no ID was passed or it was invalid, default to the first failed case
  if (!initialTestCase && failedCases.length > 0) {
    initialTestCase = failedCases[0];
  }

  return (
    <EmailComposer
      initialTestCase={initialTestCase}
      failedCases={failedCases}
    />
  );
}
