const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function loadAvatarModule() {
  const code = ts.transpileModule(fs.readFileSync("src/lib/avatar.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(code, { module: mod, exports: mod.exports });
  return mod.exports;
}

const SAMPLE_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC";
const DUMMY_1X1 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

test("avatar helper extracts safe raster data URLs and rejects SVG/1x1/default placeholders", () => {
  const avatar = loadAvatarModule();
  assert.equal(avatar.extractSafeDataUrl(DUMMY_1X1, null), null);
  assert.equal(
    avatar.extractSafeDataUrl("data:image/svg+xml;base64,PHN2Zy8+", null),
    null,
  );
  assert.equal(
    avatar.extractSafeDataUrl(
      "https://mcit-test-case-backend.onrender.com/api/users/1/photo?v=1",
      SAMPLE_PNG,
    ),
    SAMPLE_PNG,
  );
  const parsed = avatar.parseSafeDataUrl(SAMPLE_PNG);
  assert.equal(parsed.mimeType, "image/png");
  assert.equal(
    parsed.base64Body,
    "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC",
  );
});

test("resolveAvatarForDisplay and normalizeApiUserPhoto rewrite Render URLs to same-origin /api/avatar/:id", () => {
  const avatar = loadAvatarModule();
  assert.equal(
    avatar.resolveAvatarForDisplay(
      5,
      "https://mcit-test-case-backend.onrender.com/api/users/5/photo?v=999",
      SAMPLE_PNG,
      "2026-11-13T10:00:00.000Z",
      "/avatar.png",
    ),
    `/api/avatar/5?v=${Date.parse("2026-11-13T10:00:00.000Z")}`,
  );
  assert.equal(
    avatar.resolveAvatarForDisplay(
      5,
      "https://pub-3cba56bacf9f4965bbb0989e07dada12.r2.dev/linkedPosts/default-profile.png",
      null,
      null,
      "",
    ),
    "",
  );
  assert.equal(
    avatar.normalizeApiUserPhoto(
      7,
      "https://mcit-test-case-backend.onrender.com/api/users/7/photo?v=170000",
      undefined,
      undefined,
      "",
    ),
    "/api/avatar/7?v=170000",
  );
});
