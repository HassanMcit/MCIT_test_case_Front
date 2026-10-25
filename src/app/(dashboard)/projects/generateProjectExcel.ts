import type { ExportReportData } from "./exportProjectReport.action";

function formatSteps(steps: any): string {
  if (!steps) return "";
  if (Array.isArray(steps)) {
    return steps.join("\r\n");
  }
  if (typeof steps === "string") {
    try {
      const parsed = JSON.parse(steps);
      if (Array.isArray(parsed)) {
        return parsed.join("\r\n");
      }
    } catch {
      // not JSON, use raw
    }
    return steps;
  }
  return String(steps);
}

function formatExecutionDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function capitalizeFirstLetter(val?: string | null, fallback = "High"): string {
  if (!val) return fallback;
  const s = String(val).trim();
  if (!s) return fallback;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function normalizeStatus(status?: string | null): "Pass" | "Fail" | "Blocked" | "Pending" {
  if (!status) return "Pass";
  const s = status.toLowerCase().trim();
  if (s === "passed" || s === "pass") return "Pass";
  if (s === "failed" || s === "fail") return "Fail";
  if (s === "blocked") return "Blocked";
  return "Pending";
}

export async function exportProjectExcelReport(
  reportData: ExportReportData,
  dateRange: { from?: string; to?: string }
): Promise<void> {
  const XLSX = await import("xlsx");

  const testCases = reportData.testCases || [];

  // Track bugs sequentially
  let bugCounter = 1;
  const defectsList: Array<{
    defectId: string;
    title: string;
    module: string;
    description: string;
    severity: string;
    priority: string;
    status: string;
    reportedBy: string;
    assignedTo: string;
    dateReported: string;
    resolutionDate: string;
    comments: string;
  }> = [];

  // 1. Build "Test Cases" sheet data
  const testCasesHeaders = [
    "Test Case ID",
    "Module",
    "Test Scenario",
    "Pre-Conditions",
    "Test Steps",
    "Expected Result",
    "Actual Result",
    "Status",
    "Defect ID",
    "Tester",
    "Execution Date",
  ];

  const testCasesRows = testCases.map((tc, idx) => {
    const normStatus = normalizeStatus(tc.status);
    let defectId: string | null = null;

    if (normStatus === "Fail") {
      defectId = `BUG_${String(bugCounter).padStart(3, "0")}`;
      bugCounter++;

      const dateReported = tc.executedAt
        ? new Date(tc.executedAt).toISOString().slice(0, 10)
        : new Date(tc.createdAt).toISOString().slice(0, 10);

      // Extract a concise title from scenario
      const firstLine = (tc.scenario || "").split("\n")[0].trim();
      const title = firstLine.length > 50 ? firstLine.slice(0, 47) + "..." : (firstLine || "خطأ في النظام");

      defectsList.push({
        defectId,
        title,
        module: tc.module || reportData.projectApp || reportData.projectName,
        description: tc.actualResult || tc.scenario || "حدث خطأ أثناء تنفيذ الاختبار",
        severity: capitalizeFirstLetter(tc.severity, "High"),
        priority: capitalizeFirstLetter(tc.priority, "High"),
        status: "Open",
        reportedBy: tc.testerName || reportData.leadTester || "Hassan Ali",
        assignedTo: reportData.assignedTo || "Mostafa Rokaya",
        dateReported,
        resolutionDate: "",
        comments: tc.notes || "",
      });
    }

    return [
      tc.testId || `TC_${String(idx + 1).padStart(3, "0")}`,
      tc.module || reportData.projectApp || reportData.projectName,
      tc.scenario || "",
      tc.preConditions || "",
      formatSteps(tc.steps),
      tc.expectedResult || "",
      tc.actualResult || "",
      normStatus,
      defectId,
      tc.testerName || "Hassan Ali",
      formatExecutionDate(tc.executedAt || tc.createdAt),
    ];
  });

  // 2. Build "Defect Log" sheet data
  const defectLogHeaders = [
    "Defect ID",
    "Title",
    "Module",
    "Description",
    "Severity",
    "Priority",
    "Status",
    "Reported By",
    "Assigned To",
    "Date Reported",
    "Resolution Date",
    "Comments",
  ];

  const defectLogRows = defectsList.map((d) => [
    d.defectId,
    d.title,
    d.module,
    d.description,
    d.severity,
    d.priority,
    d.status,
    d.reportedBy,
    d.assignedTo,
    d.dateReported,
    d.resolutionDate,
    d.comments,
  ]);

  // 3. Count Metrics
  const totalCount = testCases.length;
  let passedCount = 0;
  let failedCount = 0;
  let blockedCount = 0;

  testCases.forEach((tc) => {
    const s = normalizeStatus(tc.status);
    if (s === "Pass") passedCount++;
    else if (s === "Fail") failedCount++;
    else if (s === "Blocked") blockedCount++;
  });

  // 4. Build "Execution Summary" sheet data
  const executionSummaryRows = [
    ["Metric", "Value"],
    ["Total Test Cases", totalCount],
    ["Passed", passedCount],
    ["Failed", failedCount],
    ["Blocked", blockedCount],
  ];

  // 5. Build "Dashboard" sheet data
  const dashboardRows = [
    ["Status", "Count"],
    ["Passed", passedCount],
    ["Failed", failedCount],
    ["Blocked", blockedCount],
  ];

  // 6. Build "Test Environment" sheet data
  const testEnvironmentRows = [
    ["Environment Item", "Details"],
    ["Operating System", "Windows 11 / Enterprise"],
    ["OS Version", "23H2"],
    ["RAM", "16 GB"],
    ["Processor", "Intel Core i7"],
    ["Database", "PostgreSQL (Supabase)"],
    ["Application Version", "1.0.0"],
    ["Tools Used", "MCIT Quality Hub"],
  ];

  // Create worksheets
  const wsTestCases = XLSX.utils.aoa_to_sheet([testCasesHeaders, ...testCasesRows]);
  const wsDefectLog = XLSX.utils.aoa_to_sheet([defectLogHeaders, ...defectLogRows]);
  const wsExecutionSummary = XLSX.utils.aoa_to_sheet(executionSummaryRows);
  const wsDashboard = XLSX.utils.aoa_to_sheet(dashboardRows);
  const wsTestEnvironment = XLSX.utils.aoa_to_sheet(testEnvironmentRows);

  // Set column widths for readability
  wsTestCases["!cols"] = [
    { wch: 14 },
    { wch: 22 },
    { wch: 38 },
    { wch: 38 },
    { wch: 45 },
    { wch: 38 },
    { wch: 38 },
    { wch: 10 },
    { wch: 12 },
    { wch: 18 },
    { wch: 24 },
  ];

  wsDefectLog["!cols"] = [
    { wch: 12 },
    { wch: 30 },
    { wch: 22 },
    { wch: 45 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 18 },
    { wch: 18 },
    { wch: 15 },
    { wch: 15 },
    { wch: 25 },
  ];

  wsExecutionSummary["!cols"] = [{ wch: 22 }, { wch: 12 }];
  wsDashboard["!cols"] = [{ wch: 16 }, { wch: 12 }];
  wsTestEnvironment["!cols"] = [{ wch: 24 }, { wch: 32 }];

  // Assemble workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsTestCases, "Test Cases");
  XLSX.utils.book_append_sheet(wb, wsDefectLog, "Defect Log");
  XLSX.utils.book_append_sheet(wb, wsExecutionSummary, "Execution Summary");
  XLSX.utils.book_append_sheet(wb, wsDashboard, "Dashboard");
  XLSX.utils.book_append_sheet(wb, wsTestEnvironment, "Test Environment");

  // Determine file name
  const cleanProj = (reportData.projectName || "Project").replace(/[/\\?%*:|"<>]/g, "_");
  const dateSuffix =
    dateRange.from && dateRange.to
      ? `${dateRange.from}_to_${dateRange.to}`
      : dateRange.from
      ? `from_${dateRange.from}`
      : dateRange.to
      ? `up_to_${dateRange.to}`
      : new Date().toISOString().slice(0, 10);

  const fileName = `QA_Report_${cleanProj}_${dateSuffix}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
