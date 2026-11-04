const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");

function load(file, mocks = {}, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(
    code,
    {
      module,
      exports: module.exports,
      require: (key) => (key in mocks ? mocks[key] : require(key)),
      console,
      ...globals,
    },
    { filename: file },
  );
  return module.exports;
}
const time = load("src/lib/project-time.ts");
const helpers = load("src/lib/schedule-picker.ts");
const utils = require("cn");
const button = load("src/components/ui/button.tsx");
const popover = load("src/components/ui/popover.tsx");
const calendar = load("src/components/ui/schedule-calendar.tsx", {
  "@/lib/schedule-picker": helpers,
  "@/lib/utils": utils,
});
const pickerMocks = {
  "@/lib/project-time": time,
  "@/lib/schedule-picker": helpers,
  "@/lib/utils": utils,
  "./button": button,
  "./popover": popover,
  "./schedule-calendar": calendar,
};
const picker = load(
  "src/components/ui/project-date-time-picker.tsx",
  pickerMocks,
);
const users = load("src/components/ui/project-user-combobox.tsx");
const fields = load("src/app/(dashboard)/projects/ProjectScheduleFields.tsx", {
  "@/components/ui/label": load("src/components/ui/label.tsx"),
  "@/components/ui/project-date-time-picker": picker,
  "@/components/ui/project-user-combobox": users,
});

// Unit-test React event callbacks with deterministic hook state. This is not a
// browser mock: actual Base UI integration is additionally SSR-rendered/built.
function harness(file, mocks, globals = {}) {
  const slots = [];
  let index = 0;
  const react = {
    ...React,
    useId: () => "unit-id",
    useState: (initial) => {
      const at = index++;
      if (!(at in slots))
        slots[at] = typeof initial === "function" ? initial() : initial;
      return [
        slots[at],
        (value) => {
          slots[at] = typeof value === "function" ? value(slots[at]) : value;
        },
      ];
    },
  };
  const loaded = load(file, { ...mocks, react }, globals);
  return {
    loaded,
    render: (component, props) => {
      index = 0;
      return component(props);
    },
  };
}
function elements(tree, predicate) {
  const result = [];
  function visit(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (predicate(node)) result.push(node);
    visit(node.props?.children);
  }
  visit(tree);
  return result;
}
module.exports = {
  load,
  time,
  helpers,
  utils,
  pickerMocks,
  picker,
  calendar,
  fields,
  users,
  harness,
  elements,
};
