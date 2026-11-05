const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const filename = path.resolve(
  __dirname,
  "../src/app/api/test-cases/import-cache/route.ts",
);
const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

function setup(responses) {
  const exports = {},
    tags = [],
    paths = [],
    reads = [];
  vm.runInNewContext(compiled, {
    exports,
    Request,
    Response,
    AbortSignal,
    process: { env: { NEXT_PUBLIC_BASE_URL: "https://backend.example.test" } },
    require: () => ({
      revalidateTag: (...args) => tags.push(args),
      revalidatePath: (p) => paths.push(p),
    }),
    fetch: async (url, options) => {
      reads.push({ url, options });
      return Response.json(responses.shift());
    },
  });
  const post = (
    authorization = "Bearer local-test-placeholder",
    batchHash = "a".repeat(64),
  ) =>
    exports.POST(
      new Request("https://frontend.example.test/api/test-cases/import-cache", {
        method: "POST",
        headers: { authorization, "Content-Type": "application/json" },
        body: JSON.stringify({ batchHash }),
      }),
    );
  return { post, tags, paths, reads };
}
void test("cache invalidation requires backend-verified admin and a verified persisted import", async () => {
  const anonymous = setup([]);
  assert.equal((await anonymous.post("")).status, 401);
  assert.equal(anonymous.reads.length, 0);
  const tester = setup([{ role: "tester" }]);
  assert.equal((await tester.post()).status, 403);
  assert.equal(tester.tags.length, 0);
  const invalid = setup([{ role: "admin" }]);
  assert.equal((await invalid.post(undefined, "wrong")).status, 400);
  const unverified = setup([{ role: "admin" }, { verified: false }]);
  assert.equal((await unverified.post()).status, 409);
  assert.equal(unverified.tags.length, 0);
  const valid = setup([{ role: "admin" }, { verified: true }]);
  assert.equal((await valid.post()).status, 200);
  assert.deepEqual(
    valid.tags.map((t) => t[0]),
    ["test-cases", "dashboard-stats", "dashboard", "projects", "users"],
  );
  assert.equal(
    valid.tags.every((t) => t[1].expire === 0),
    true,
  );
  assert.deepEqual(valid.paths, [
    "/test-cases",
    "/dashboard",
    "/projects",
    "/users",
  ]);
  assert.equal(
    valid.reads.every((r) => r.options.cache === "no-store"),
    true,
  );
});
