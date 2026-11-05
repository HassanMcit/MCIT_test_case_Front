import type { TestCaseItem } from "@/app/(dashboard)/test-cases/test-cases.interface";

export function ImportedTestCaseDetails({ item }: { item: TestCaseItem }) {
  const source = item.importMetadata;
  if (!source) return null;
  return (
    <details className="mt-2 max-w-lg whitespace-normal rounded-lg border border-slate-200 p-2 text-xs">
      <summary className="cursor-pointer font-medium">
        Imported Excel details
      </summary>
      <p className="my-2">
        Assigned owner: {item.tester?.name}. Imported{" "}
        {new Date(source.importedAt).toLocaleString("en-GB", {
          timeZone: "Africa/Cairo",
        })}{" "}
        (Africa/Cairo). Results and execution dates below are source-reported.
      </p>
      {source.plannedAt && (
        <p className="my-2">
          Planned schedule (Africa/Cairo):{" "}
          {new Date(source.plannedAt).toLocaleString("en-GB", {
            timeZone: "Africa/Cairo",
          })}
        </p>
      )}
      <dl className="space-y-2">
        {Object.entries(source.original).map(([label, value]) => (
          <div key={label}>
            <dt className="font-semibold">{label}</dt>
            <dd className="whitespace-pre-wrap break-words" dir="auto">
              {value ?? "—"}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
