// Uses only HTTPS and the official login/import/read APIs. Never connects to PostgreSQL.
const { createHash } = require("node:crypto");
const assert = require("node:assert/strict");
const { readGarageWorkbook } = require("./lib/garage-workbook.cjs");

function argument(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function endpoint(value) {
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error(
      "Supply an origin without credentials, path, query or fragment",
    );
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new Error("HTTPS is required except for localhost tests");
  return url.origin;
}
async function main() {
  const file = argument("--file");
  if (!file)
    throw new Error(
      "Required: --file <workbook.xlsx>. Add --offline-preview, or --api <Render origin>",
    );
  const rows = readGarageWorkbook(file);
  const batchHash = createHash("sha256")
    .update(JSON.stringify(rows.map((r) => r.original)))
    .digest("hex");
  console.log(
    JSON.stringify(
      {
        sourceRows: rows.length,
        batchHash,
        project: "Testing Garage System",
        application: "Garage System",
        assignments: { "Alaa Eldin Mohsen": 30, "Hassan Ali": 21 },
        distinctPageNames: [...new Set(rows.map((r) => r.original.Module))],
        plannedSchedule: {
          timezone: "Africa/Cairo",
          first: "2026-11-05T09:00:00+02:00",
          last: "2026-11-05T11:25:00+02:00",
          label: "Planned, not historical",
        },
      },
      null,
      2,
    ),
  );
  if (process.argv.includes("--offline-preview")) {
    console.log(
      "OFFLINE ONLY: database IDs, existing records and permissions have not been verified.",
    );
    return;
  }
  const api = endpoint(argument("--api"));
  const email = process.env.GARAGE_IMPORT_EMAIL,
    password = process.env.GARAGE_IMPORT_PASSWORD;
  if (!email || !password)
    throw new Error(
      "Set GARAGE_IMPORT_EMAIL and GARAGE_IMPORT_PASSWORD privately in this process. Do not put credentials on the command line or in chat.",
    );
  async function call(origin, route, init = {}) {
    const response = await fetch(origin + route, {
      ...init,
      redirect: "error",
      signal: AbortSignal.timeout(120000),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(
        `API ${route} returned ${response.status}: ${typeof body.message === "string" ? body.message : "request rejected"}`,
      );
    return body;
  }
  const login = await call(api, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  delete process.env.GARAGE_IMPORT_PASSWORD;
  if (!login.access_token)
    throw new Error("Login did not return an access token");
  const headers = {
    Authorization: `Bearer ${login.access_token}`,
    "Content-Type": "application/json",
  };
  const me = await call(api, "/api/auth/me", { headers });
  if (me.role !== "admin")
    throw new Error("An existing administrator account is required");
  const commit = process.argv.includes("--commit");
  const previewHash = argument("--preview-hash");
  if (commit && !/^[a-f0-9]{64}$/.test(previewHash || ""))
    throw new Error(
      "--commit requires --preview-hash from a reviewed online dry run",
    );
  const result = await call(api, "/api/test-cases/bulk-import/garage", {
    method: "POST",
    headers,
    body: JSON.stringify({ dryRun: !commit, previewHash, rows }),
  });
  assert.equal(result.batchHash, batchHash);
  console.log(JSON.stringify(result, null, 2));
  if (!commit) return;
  const verification = await call(
    api,
    `/api/test-cases/bulk-import/garage/${batchHash}`,
    { headers },
  );
  assert.equal(verification.verified, true, "PostgreSQL verification failed");
  assert.equal(verification.total, 51);
  assert.deepEqual(
    verification.assignments.map((a) => a.count),
    [30, 21],
  );
  for (const [i, record] of verification.ids.entries()) {
    const tc = await call(api, `/api/test-cases/${record.id}`, { headers });
    const original = rows[i].original;
    assert.equal(tc.testId, original["Test Case ID"]);
    assert.equal(tc.projectId, result.project.id);
    assert.equal(tc.module, "Garage System");
    assert.equal(tc.pageName, original.Module);
    assert.equal(tc.testerId, result.assignments[i < 30 ? 0 : 1].id);
    assert.equal(tc.scenario, original["Test Scenario"]);
    assert.equal(tc.preConditions, original["Pre-Conditions"]);
    assert.deepEqual(tc.steps, [original["Test Steps"]]);
    assert.equal(tc.expectedResult, original["Expected Result"]);
    assert.equal(tc.actualResult, original["Actual Result"]);
    assert.equal(tc.status, original.Status === "Pass" ? "passed" : "failed");
    assert.deepEqual(tc.importMetadata.original, original);
  }
  const list = await call(
    api,
    `/api/test-cases?projectId=${result.project.id}&limit=1000`,
    { headers },
  );
  const ids = new Set(verification.ids.map((r) => r.id));
  assert.equal(
    list.data.filter((tc) => ids.has(tc.id)).length,
    51,
    "Existing list API does not show all imported records",
  );
  const frontend = argument("--frontend");
  if (frontend) {
    const refreshed = await call(
      endpoint(frontend),
      "/api/test-cases/import-cache",
      { method: "POST", headers, body: JSON.stringify({ batchHash }) },
    );
    assert.equal(refreshed.invalidated, true);
  }
  console.log(
    "VERIFIED: 51 persisted PostgreSQL records, 30/21 ownership, and all source fields through the existing API. Refresh the Test Cases page.",
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
