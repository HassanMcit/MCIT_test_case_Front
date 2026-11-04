const { test } = require("node:test");
const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const {
  helpers,
  time,
  fields,
  users,
  pickerMocks,
  utils,
  harness,
  elements,
} = require("./support/schedule-components.cjs");

test("user combobox never auto-selects and supports name/role search, Admin, Tester, and removal", () => {
  const { load } = require("./support/schedule-components.cjs");
  const component = load("src/components/ui/project-user-combobox.tsx", {
    react: { ...React, useMemo: (read) => read() },
  }).ProjectUserCombobox;
  const options = [
    { id: 1, name: "Administrator Fixture", role: "admin" },
    { id: 2, name: "Tester Fixture", role: "tester" },
  ];
  const changes = [];
  const tree = component({
    id: "assignment",
    value: "",
    users: options,
    isRTL: false,
    onChange: (next) => changes.push(next),
  });
  const root = elements(
    tree,
    (node) => typeof node.props?.onValueChange === "function",
  )[0];
  assert.equal(root.props.value.id, "");
  assert.equal(changes.length, 0);
  assert.ok(root.props.filter({ name: "Name", role: "admin" }, "admin"));
  assert.ok(
    root.props.filter({ name: "Tester Fixture", role: "tester" }, "fixture"),
  );
  assert.equal(
    root.props.filter({ name: "Name", role: "tester" }, "admin"),
    false,
  );
  root.props.onValueChange({ id: "1", name: options[0].name, role: "admin" });
  root.props.onValueChange({ id: "2", name: options[1].name, role: "tester" });
  root.props.onValueChange({ id: "", name: "Unassigned", role: null });
  assert.deepEqual(changes, ["1", "2", ""]);
});

test("calendar month/year boundaries, leap day, arrows, Home/End, and RTL keyboard navigation", () => {
  const february = helpers.calendarDays(2028, 1);
  assert.equal(february.filter((d) => !d.outside).length, 29);
  assert.equal(
    helpers.moveCalendarDate("2028-01-31", "PageDown", false),
    "2028-02-29",
  );
  assert.equal(
    helpers.moveCalendarDate("2028-02-29", "PageDown", false, true),
    "2029-02-28",
  );
  assert.equal(
    helpers.moveCalendarDate("2026-12-31", "ArrowRight", false),
    "2027-01-01",
  );
  assert.equal(
    helpers.moveCalendarDate("2026-12-31", "ArrowLeft", true),
    "2027-01-01",
  );
  assert.equal(
    helpers.moveCalendarDate("2026-11-04", "Home", false),
    "2026-11-01",
  );
  assert.equal(
    helpers.moveCalendarDate("2026-11-04", "End", false),
    "2026-11-07",
  );
  assert.equal(
    helpers.moveCalendarDate("2026-11-04", "ArrowDown", false),
    "2026-11-11",
  );
  assert.equal(helpers.moveCalendarDate("1900-01-01", "PageUp", false), null);
});

test("12-hour clock conversion preserves midnight/noon/minutes and Cairo DST rules", () => {
  assert.equal(helpers.clockParts("2026-11-04T00:05").period, "AM");
  assert.equal(helpers.clockParts("2026-11-04T00:05").hour, "12");
  assert.equal(helpers.clockParts("2026-11-04T12:05").period, "PM");
  assert.equal(
    helpers.combineClock("2026-11-04", "12", "05", "AM"),
    "2026-11-04T00:05",
  );
  assert.equal(
    helpers.combineClock("2026-11-04", "12", "05", "PM"),
    "2026-11-04T12:05",
  );
  assert.equal(
    helpers.combineClock("2026-11-04", "01", "59", "PM"),
    "2026-11-04T13:59",
  );
  assert.equal(
    time.cairoInputToUtc(helpers.combineClock("2026-04-24", "12", "30", "AM")),
    null,
  );
  assert.equal(
    time.cairoInputToUtc(helpers.combineClock("2026-10-29", "11", "30", "PM")),
    null,
  );
});

test("picker callbacks keep edits as drafts until Apply; Cancel discards, Clear removes, DST invalid Apply stays open", () => {
  const h = harness(
    "src/components/ui/project-date-time-picker.tsx",
    pickerMocks,
  );
  const component = h.loaded.ProjectDateTimePicker;
  const changes = [];
  const props = {
    id: "start",
    label: "Start",
    value: "2026-11-04T09:00",
    onChange: (v) => changes.push(v),
    isRTL: false,
  };
  const render = () => h.render(component, props);
  const control = (tree, label) =>
    elements(
      tree,
      (n) =>
        n.props?.children === label && typeof n.props?.onClick === "function",
    )[0];
  let tree = render();
  tree.props.onOpenChange(true);
  tree = render();
  elements(
    tree,
    (n) => n.type === pickerMocks["./schedule-calendar"].ScheduleCalendar,
  )[0].props.onChange("2026-11-06");
  tree = render();
  control(tree, "PM").props.onClick();
  tree = render();
  elements(
    tree,
    (n) => n.type === "select" && n.props["aria-label"] === "Minute",
  )[0].props.onChange({ target: { value: "45" } });
  tree = render();
  assert.equal(changes.length, 0);
  control(tree, "Cancel").props.onClick();
  tree = render();
  assert.equal(tree.props.open, false);
  assert.equal(changes.length, 0);
  tree.props.onOpenChange(true);
  tree = render();
  control(tree, "Apply").props.onClick();
  assert.equal(changes[0], "2026-11-04T09:00");
  tree = render();
  tree.props.onOpenChange(true);
  tree = render();
  elements(
    tree,
    (n) => n.type === pickerMocks["./schedule-calendar"].ScheduleCalendar,
  )[0].props.onChange("2026-11-06");
  tree = render();
  control(tree, "PM").props.onClick();
  tree = render();
  control(tree, "Apply").props.onClick();
  assert.equal(changes[1], "2026-11-06T21:00");
  tree = render();
  tree.props.onOpenChange(true);
  tree = render();
  control(tree, "Clear").props.onClick();
  assert.equal(changes[2], "");
  const gapProps = { ...props, value: "2026-04-24T00:30" };
  tree = h.render(component, gapProps);
  tree.props.onOpenChange(true);
  tree = h.render(component, gapProps);
  control(tree, "Apply").props.onClick();
  tree = h.render(component, gapProps);
  assert.equal(tree.props.open, true);
  assert.ok(elements(tree, (n) => n.props?.role === "alert").length);
  assert.equal(changes.length, 3);
});

test("calendar event callbacks navigate months/years and focus days without implicitly changing selected value", () => {
  let focused = "";
  // useRef remains a real hook unless explicitly supplied by this test.
  const local = require("./support/schedule-components.cjs").load(
    "src/components/ui/schedule-calendar.tsx",
    {
      "@/lib/schedule-picker": helpers,
      "@/lib/utils": utils,
      react: {
        ...React,
        useId: () => "calendar",
        useState: (initial) => [initial, () => {}],
        useRef: () => ({
          current: {
            querySelector: (selector) => ({
              focus: () => {
                focused = selector;
              },
            }),
          },
        }),
      },
    },
    { requestAnimationFrame: (callback) => callback() },
  );
  const picked = [];
  const tree = local.ScheduleCalendar({
    value: "2026-11-04",
    today: "2026-11-04",
    onChange: (day) => picked.push(day),
    isRTL: true,
  });
  const selected = elements(
    tree,
    (n) => n.props?.["data-day"] === "2026-11-04",
  )[0];
  let prevented = false;
  selected.props.onKeyDown({
    key: "ArrowLeft",
    shiftKey: false,
    preventDefault() {
      prevented = true;
    },
  });
  assert.ok(prevented);
  assert.ok(focused.includes("2026-11-05"));
  assert.equal(picked.length, 0);
  selected.props.onClick();
  assert.equal(picked[0], "2026-11-04");
});

test("real components SSR-render bilingual responsive cards, Base UI controls, role badges, and empty optional assignment", () => {
  const options = [
    { id: 2, name: "Test Fixture", role: "tester" },
    { id: 1, name: "Admin Fixture", role: "admin" },
  ];
  for (const isRTL of [false, true]) {
    const html = renderToStaticMarkup(
      React.createElement(fields.default, {
        value: { startAt: "", endAt: "", assignedTesterId: "" },
        users: options,
        isRTL,
        onChange() {},
        errors: { endAt: "Validation message" },
      }),
    );
    assert.match(html, /sm:grid-cols-2/);
    assert.match(html, /grid-cols-1/);
    assert.match(html, /Africa\/Cairo/);
    assert.match(html, /role="alert"/);
    assert.doesNotMatch(html, /datetime-local/);
    assert.ok(html.includes(isRTL ? "بدون إسناد" : "Unassigned"));
    assert.ok(
      html.includes(
        isRTL ? "إسناد مستخدم (اختياري)" : "Assign User (Optional)",
      ),
    );
    assert.ok(html.includes(`dir="${isRTL ? "rtl" : "ltr"}"`));
    assert.ok(
      html.includes(
        isRTL
          ? "الجدول الزمني وإسناد المستخدم"
          : "Schedule and User Assignment",
      ),
    );
    const admin = renderToStaticMarkup(
      React.createElement(users.ProjectUserCombobox, {
        id: "assigned",
        value: "1",
        users: options,
        isRTL,
        onChange() {},
      }),
    );
    assert.ok(admin.includes("Admin Fixture"));
    assert.ok(admin.includes(isRTL ? "مدير" : "Admin"));
    const tester = renderToStaticMarkup(
      React.createElement(users.ProjectUserCombobox, {
        id: "assigned",
        value: "2",
        users: options,
        isRTL,
        onChange() {},
      }),
    );
    assert.ok(tester.includes("Test Fixture"));
    assert.ok(tester.includes(isRTL ? "مختبر" : "Tester"));
  }
});
