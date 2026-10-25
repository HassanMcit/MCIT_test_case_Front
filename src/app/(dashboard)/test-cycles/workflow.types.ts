export type ExecutionStatus =
  | "not_run"
  | "passed"
  | "failed"
  | "blocked"
  | "skipped";
export interface PageData<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}
export interface Release {
  id: number;
  projectId: number;
  name: string;
  version: string;
  description: string | null;
  status: string;
  startDate: string | null;
  releaseDate: string | null;
}
export interface Summary {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  notRun: number;
  executed: number;
  progress: number;
  passRate: number;
}
export interface Cycle {
  id: number;
  projectId: number;
  releaseId: number;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  releaseName: string;
  version: string;
  releaseStatus?: string;
  projectName: string;
  environment?: string;
  summary: Summary;
  testers?: { id: number; name: string }[];
}
export interface Definition {
  id: number;
  testId: string;
  scenario: string;
  preConditions?: string;
  steps: string[] | string;
  expectedResult: string;
  priority?: string;
  module?: string;
  pageName?: string;
}
export interface CycleItem {
  id: number;
  testCaseId: number;
  testerId: number | null;
  testerName: string | null;
  snapshot: Definition;
  status: ExecutionStatus;
  actualResult: string | null;
  notes: string | null;
  environment: string | null;
  executedAt: string | null;
  durationSeconds: number | null;
  latestExecutionId: number | null;
}
export interface Execution {
  id: number;
  testCaseId: number;
  status: ExecutionStatus;
  actualResult: string | null;
  notes: string | null;
  environment: string | null;
  testerName: string | null;
  executedAt: string | null;
  recordedAt: string;
  durationSeconds: number | null;
  releaseName: string | null;
  version: string | null;
  cycleName: string | null;
  snapshot: Definition;
  source: string;
}
export interface Metrics {
  totalExecutions: number;
  summary: Summary;
  cycles: Cycle[];
  releases: (Release & { summary: Summary })[];
}
export const emptySummary: Summary = {
  total: 0,
  passed: 0,
  failed: 0,
  blocked: 0,
  skipped: 0,
  notRun: 0,
  executed: 0,
  progress: 0,
  passRate: 0,
};
