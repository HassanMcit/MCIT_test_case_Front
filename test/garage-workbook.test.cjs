const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  readGarageWorkbook,
  HEADERS,
} = require("../scripts/lib/garage-workbook.cjs");
// Optional read-only regression against the user's workbook. Never contacts a database.
void test(
  "real workbook preserves every source column, IDs, whitespace and the planned timeline",
  { skip: !process.env.GARAGE_WORKBOOK },
  () => {
    // The backend is intentionally absent from standalone frontend checkouts.
    // Load this optional regression dependency only when its workbook is supplied.
    const { garageRows } = require("../backend/dist/test-cases/garage-import.service");
    const rows = readGarageWorkbook(process.env.GARAGE_WORKBOOK);
    const mapped = garageRows({ dryRun: true, rows });
    assert.equal(mapped.length, 51);
    assert.deepEqual(Object.keys(mapped[0].original), HEADERS);
    assert.equal(
      mapped.filter((r) => r.ownerName === "Alaa Eldin Mohsen").length,
      30,
    );
    assert.equal(mapped.filter((r) => r.ownerName === "Hassan Ali").length, 21);
    assert.equal(mapped[0].plannedAt, "2026-11-05T07:00:00.000Z");
    assert.equal(mapped[29].plannedAt, "2026-11-05T09:25:00.000Z");
    assert.equal(mapped[30].plannedAt, null);
    assert.equal(new Set(mapped.map((r) => r.original.Module)).size, 13);
    for (const [i, row] of mapped.entries()) {
      assert.deepEqual(row.original, rows[i].original);
      assert.equal(row.sourceRow, i + 1);
    }
  },
);
