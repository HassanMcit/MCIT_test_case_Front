const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const sourcePath = path.join(__dirname, "../src/lib/authenticated-event-source.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleObject = { exports: {} };
new Function("exports", "require", "module", compiled)(moduleObject.exports, require, moduleObject);
const { AuthenticatedEventSource } = moduleObject.exports;

test("notification SSE sends JWT in Authorization and keeps it out of the URL", async () => {
  const originalFetch = global.fetch;
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return new Response(new ReadableStream({ start(controller) { controller.close(); } }), { status: 200 });
  };

  try {
    const stream = new AuthenticatedEventSource("/api/users/notifications/stream", "synthetic-test-token");
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(request.url, "/api/users/notifications/stream");
    assert.equal(request.url.includes("token="), false);
    assert.equal(request.options.headers.Authorization, "Bearer synthetic-test-token");
    stream.close();
  } finally {
    global.fetch = originalFetch;
  }
});
