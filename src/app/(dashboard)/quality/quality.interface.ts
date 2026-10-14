export type QualityAppStatus = "Healthy" | "Warning" | "Attention" | "Operational";

export type QualityAppCategory =
  | "All"
  | "Government Services"
  | "Internal Operations"
  | "HR & Admin"
  | "Infrastructure";

export interface QualityApplication {
  id: number;
  name: string;
  nameAr?: string;
  category: string;
  url: string;
  environment: "Production" | "Staging" | string;
  version: string;
  status: QualityAppStatus;
  passRate: number;
  suitesCount: number;
  bugsCount: number;
  lastCheck?: string;
  defaultFunctions: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface QualityFunctionResult {
  id: string;
  name: string;
  status: "pass" | "fail";
  issueDescription?: string;
}

export interface QualityAssessment {
  id: number;
  appId: number;
  testerId?: number | null;
  testerName: string;
  isUpAndRunning: boolean;
  functionsResults: QualityFunctionResult[];
  passedCount: number;
  issuesCount: number;
  performanceScore: number;
  notes?: string;
  createdAt: string;
}

export interface QualityMetricsSummary {
  totalApps: number;
  avgPassRate: number;
  totalSuites: number;
  totalDefects: number;
  criticalDefects: number;
}

export interface QualityPageData {
  applications: QualityApplication[];
  metrics: QualityMetricsSummary;
}

export interface CreateQualityAppDto {
  name: string;
  nameAr?: string;
  category: string;
  url: string;
  environment?: string;
  version?: string;
  defaultFunctions?: string[];
}
