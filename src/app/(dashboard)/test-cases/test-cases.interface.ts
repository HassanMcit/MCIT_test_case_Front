export interface TestCaseTester {
  id: number;
  userId: number;
  name: string;
  email: string;
  photo?: string;
}

export interface TestCaseProject {
  id: number;
  name: string;
}

export interface TestCaseItem {
  importMetadata?: {
    sourceKey: string;
    sourceRow: number;
    sourceTestId: string;
    batchHash: string;
    original: Record<string, string | null>;
    plannedAt: string | null;
    plannedTimezone: string | null;
    importedById: number | null;
    importedAt: string;
  } | null;
  id: number;
  testId: string;
  module: string;
  pageName: string | null;
  scenario: string;
  preConditions: string | null;
  steps: string[];
  expectedResult: string;
  actualResult: string | null;
  priority: "critical" | "high" | "medium" | "low";
  status: "passed" | "failed" | "pending" | "skipped" | "blocked";
  severity?: "critical" | "high" | "medium" | "low" | null;
  notes: string | null;
  executedAt: string | null;
  testerId: number | null;
  userId: number | null;
  updatedById?: number | null;
  projectId: number | null;
  createdAt: string;
  updatedAt: string;
  tester: TestCaseTester | null;
  updatedBy?: TestCaseTester | null;
  project: TestCaseProject | null;
}

export interface TestCaseListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TestCaseListResponse {
  data: TestCaseItem[];
  meta: TestCaseListMeta;
}

export interface TestCaseQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  module?: string;
  projectId?: number;
  search?: string;
}
