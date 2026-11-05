const fs = require("node:fs");
const XLSX = require("xlsx");
const HEADERS = [
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

function readGarageWorkbook(filename) {
  const bytes = fs.readFileSync(filename);
  if (bytes.length > 5 * 1024 * 1024) throw new Error("Workbook exceeds 5 MB");
  const book = XLSX.read(bytes, { type: "buffer", cellDates: false });
  const sheet = book.Sheets["Test Cases"];
  if (!sheet) throw new Error("Test Cases worksheet is missing");
  const data = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: true,
  });
  if (JSON.stringify(data[0]) !== JSON.stringify(HEADERS))
    throw new Error("Expected the exact 11 Test Cases column headers");
  // Ignore only empty trailing formatting rows. Never filter/reorder the case rows.
  while (data.length > 1 && data.at(-1).every((v) => v === null)) data.pop();
  if (data.length !== 52)
    throw new Error(`Expected 51 test cases; found ${data.length - 1}`);
  return data.slice(1).map((cells, i) => {
    if (
      cells.length > HEADERS.length &&
      cells.slice(HEADERS.length).some((v) => v !== null)
    )
      throw new Error(`Unexpected extra data on Excel row ${i + 2}`);
    const original = Object.fromEntries(
      HEADERS.map((key, col) => {
        const value = cells[col] ?? null;
        const cell = sheet[XLSX.utils.encode_cell({ r: i + 1, c: col })];
        if (cell?.f)
          throw new Error(
            `Formula in source row ${i + 2}, ${key}: supply original text values`,
          );
        if (value !== null && typeof value !== "string")
          throw new Error(
            `Non-text source value on row ${i + 2}, ${key}; preserve and review its source representation`,
          );
        return [key, value];
      }),
    );
    if (original["Test Case ID"] !== `TC_${String(i + 1).padStart(3, "0")}`)
      throw new Error(`Incorrect source ID/order on Excel row ${i + 2}`);
    return { original };
  });
}
module.exports = { readGarageWorkbook, HEADERS };
