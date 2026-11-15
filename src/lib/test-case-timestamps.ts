export interface TestCaseTimestampLike {
  id?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  executedAt?: string | null;
  updatedById?: number | null;
  updatedBy?: { id?: number | null; name?: string | null } | null;
  tester?: {
    id?: number | null;
    userId?: number | null;
    name?: string | null;
    email?: string | null;
  } | null;
  testerId?: number | null;
  userId?: number | null;
  importMetadata?: {
    plannedAt?: string | null;
    importedAt?: string | null;
    sourceRow?: number | null;
    batchHash?: string | null;
  } | null;
}

/**
 * Canonical creation/import timestamp shown under the creator in the
 * Test Cases table, calendar dots, and date filters. Editing or re-executing
 * a test case must never overwrite its creation timestamp.
 */
export function getTestCaseCreatedTimestamp(
  tc?: TestCaseTimestampLike | null,
): string | null {
  if (!tc) return null;
  return (
    tc.importMetadata?.plannedAt ||
    tc.importMetadata?.importedAt ||
    tc.createdAt ||
    tc.executedAt ||
    null
  );
}

/**
 * Timestamp shown in detail modals alongside the initial creator or importer.
 * Prefers workbook import time when present, otherwise creation time (`createdAt`).
 */
export function getTestCaseModalCreatedTimestamp(
  tc?: TestCaseTimestampLike | null,
): string | null {
  if (!tc) return null;
  return (
    tc.importMetadata?.importedAt ||
    tc.importMetadata?.plannedAt ||
    tc.createdAt ||
    tc.executedAt ||
    null
  );
}

/**
 * Timestamp used for ordering test cases chronologically by import/creation order.
 */
export function getTestCaseSortTimestamp(
  tc?: TestCaseTimestampLike | null,
): string | null {
  if (!tc) return null;
  return tc.importMetadata?.importedAt || tc.createdAt || tc.executedAt || null;
}

/**
 * Normalizes optional text values so null/undefined and empty whitespace compare uniformly.
 */
export function normalizeOptionalTextField(value?: string | null): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Formats a timestamp or Date as a local calendar date key (`YYYY-MM-DD`).
 */
export function getLocalDayKey(value?: string | Date | null): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns true when a test case was genuinely updated after creation
 * (excluding legacy 2026-10-22 backfill stamps).
 */
export function hasTestCaseBeenUpdated(tc?: TestCaseTimestampLike | null): boolean {
  if (!tc) return false;
  if (tc.updatedAt && getLocalDayKey(tc.updatedAt) === "2026-10-22") {
    return false;
  }
  if (tc.updatedBy || tc.updatedById) return true;
  if (!tc.updatedAt || !tc.createdAt) return false;
  const createdMs = new Date(tc.createdAt).getTime();
  const updatedMs = new Date(tc.updatedAt).getTime();
  return !Number.isNaN(createdMs) && !Number.isNaN(updatedMs) && Math.abs(updatedMs - createdMs) > 2000;
}

/**
 * Merges an update response into an existing UI row without ever clobbering
 * original creator (`tester`), `createdAt`, or `importMetadata`.
 */
export function mergeUpdatedTestCaseRecord<T extends TestCaseTimestampLike>(
  existing: T,
  responseData: Partial<T> | null | undefined,
  submittedPayload: Partial<T>,
  options: {
    nowIso: string;
    currentUpdater?: T["updatedBy"];
    executionChanged?: boolean;
  },
): T {
  const creatorId =
    existing.testerId ?? existing.tester?.id ?? existing.userId ?? null;
  return {
    ...existing,
    ...(responseData || {}),
    ...submittedPayload,
    tester: existing.tester ?? null,
    testerId: creatorId,
    userId: existing.userId ?? creatorId,
    createdAt: existing.createdAt,
    importMetadata:
      existing.importMetadata ?? responseData?.importMetadata ?? null,
    executedAt: options.executionChanged
      ? responseData?.executedAt || existing.executedAt || options.nowIso
      : existing.executedAt,
    updatedAt: responseData?.updatedAt || options.nowIso,
    updatedById:
      options.currentUpdater?.id ||
      responseData?.updatedById ||
      existing.updatedById ||
      null,
    updatedBy:
      options.currentUpdater ||
      responseData?.updatedBy ||
      existing.updatedBy ||
      null,
  };
}
