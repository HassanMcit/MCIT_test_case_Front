import type { TestCaseItem } from "../test-cases/test-cases.interface";
import type { ProjectApiItem } from "../projects/getProjects.action";

export interface DashboardStats {
  total: number;
  passed: number;
  failed: number;
  pending: number;
  passRate: number;
  totalProjects: number;
}

export interface DashboardChartItem {
  date: string;
  dayLabel: string;
  passed: number;
  failed: number;
  pending: number;
  total: number;
}

export interface DashboardSeverityItem {
  severity: "critical" | "high" | "medium" | "low";
  count: number;
  percentage: number;
}

export interface DashboardSeverityBreakdown {
  totalFailed: number;
  breakdown: DashboardSeverityItem[];
}

export interface UserProjectStats {
  total: number;
  passed: number;
  failed: number;
  pending: number;
  successRate: number;
}

export interface UserAssignedProjectItem {
  id: number;
  projectId: number;
  name: string;
  description?: string | null;
  environment: string;
  status: string;
  assignedAt: string;
  stats?: UserProjectStats;
}

export interface DashboardUserOverview {
  id: number;
  name: string;
  email: string;
  role: "admin" | "tester" | string;
  photo?: string;
  profileImage?: string | null;
  createdAt?: string;
  assignedProjects: UserAssignedProjectItem[];
  _count?: {
    testCases: number;
    passed?: number;
    failed?: number;
    pending?: number;
    assignedProjects: number;
  };
}

export interface DashboardDataPayload {
  currentUser: {
    id: number;
    name: string;
    email: string;
    role: string;
  } | null;
  stats: DashboardStats;
  chartData: DashboardChartItem[];
  severityData: DashboardSeverityBreakdown;
  projects: ProjectApiItem[];
  testCases: TestCaseItem[];
  usersOverview: DashboardUserOverview[];
}
