const { test } = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./support/schedule-components.cjs");

function action(
  responses,
  session = { id: 1, role: "admin", token: "isolated-test-token" },
) {
  const requests = [];
  const module = load(
    "src/app/(dashboard)/projects/eligible-users.action.ts",
    {
      "@/app/myUtil": { getCurrentUserSession: async () => session },
      "@/lib/app-fetch": {
        appFetch: async (url, options) => {
          requests.push({ url, options });
          const response = responses.shift();
          assert.ok(response, "Unexpected additional backend request");
          return response;
        },
      },
    },
    { process: { env: { NEXT_PUBLIC_BASE_URL: "https://backend.example/" } } },
  );
  return { read: module.getEligibleProjectUsers, requests };
}
const directory = () => [
  {
    id: 1,
    name: "Admin Fixture",
    role: "admin",
    email: "private@example.test",
  },
  { id: "2", name: "Tester Fixture", role: "tester", photo: "private-photo" },
  { id: 3, name: "Excluded Fixture", role: "user" },
];

test("modern directory is force-cached and returns only minimal Tester/Admin fields", async () => {
  const a = action([Response.json(directory())]);
  const users = await a.read();
  assert.deepEqual(JSON.parse(JSON.stringify(users)), [
    { id: 1, name: "Admin Fixture", role: "admin" },
    { id: 2, name: "Tester Fixture", role: "tester" },
  ]);
  assert.equal(a.requests.length, 1);
  assert.equal(
    a.requests[0].url,
    "https://backend.example/api/users/assignable",
  );
  assert.equal(a.requests[0].options.cache, "force-cache");
  assert.equal(a.requests[0].options.next.revalidate, 60);
  assert.equal(a.requests[0].options.next.tags[0], "users");
});

test("older backend 404 uses the existing users API with the same cache policy", async () => {
  const a = action([
    new Response("Not Found", { status: 404 }),
    Response.json(directory()),
  ]);
  assert.equal((await a.read()).length, 2);
  assert.equal(a.requests[1].url, "https://backend.example/api/users/all");
  for (const { options } of a.requests) {
    assert.equal(options.cache, "force-cache");
    assert.equal(options.next.tags[0], "users");
  }
});

test("older numeric user route 400 uses compatibility fallback", async () => {
  const a = action([
    Response.json(
      { message: "Validation failed (numeric string is expected)" },
      { status: 400 },
    ),
    Response.json(directory()),
  ]);
  assert.equal((await a.read()).length, 2);
  assert.equal(a.requests.length, 2);
});

test("401, 403, server errors and unrelated 400 never fall back to the public directory", async () => {
  for (const status of [400, 401, 403, 500, 503]) {
    const a = action([
      Response.json({ message: "Unrelated error" }, { status }),
    ]);
    await assert.rejects(a.read(), new RegExp(`HTTP ${status}`));
    assert.equal(a.requests.length, 1);
  }
});

test("missing/revoked or non-admin sessions cannot fetch any directory", async () => {
  for (const session of [
    null,
    { id: 2, role: "tester", token: "isolated-token" },
    { id: 1, role: "admin", token: null },
  ]) {
    const a = action([], session);
    await assert.rejects(
      a.read(),
      /Authentication required|Admin access required/,
    );
    assert.equal(a.requests.length, 0);
  }
});

test("malformed backend data fails safely; valid empty directories stay empty", async () => {
  for (const payload of [
    { error: "Not a directory" },
    [{ id: 1, name: "Missing role" }],
  ]) {
    await assert.rejects(
      action([Response.json(payload)]).read(),
      /Invalid user directory/,
    );
  }
  assert.equal((await action([Response.json([])]).read()).length, 0);
});
