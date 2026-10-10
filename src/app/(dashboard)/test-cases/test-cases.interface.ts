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
  notes: string | null;
  executedAt: string | null;
  testerId: number | null;
  userId: number | null;
  projectId: number | null;
  createdAt: string;
  updatedAt: string;
  tester: TestCaseTester | null;
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
