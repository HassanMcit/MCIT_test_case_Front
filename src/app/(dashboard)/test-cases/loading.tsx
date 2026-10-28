export default function TestCasesLoading() {
  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded-xl bg-slate-200/90" />
          <div className="h-4 w-96 max-w-full rounded-lg bg-slate-200/60" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-36 rounded-xl bg-emerald-50 border border-emerald-100" />
          <div className="h-10 w-36 rounded-xl bg-[#00A2D2]/30" />
        </div>
      </div>

      {/* Summary Strip Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-4 border border-slate-200/70 space-y-2 shadow-2xs"
          >
            <div className="h-3.5 w-24 rounded bg-slate-200/80" />
            <div className="h-7 w-14 rounded-lg bg-slate-200" />
          </div>
        ))}
      </div>

      {/* Filters Card Skeleton */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/70 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 shadow-2xs">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 rounded-xl bg-[#f8f9ff] border border-slate-100" />
        ))}
      </div>

      {/* 10-Row Table Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden shadow-2xs">
        <div className="h-11 bg-[#eff4ff]/80 border-b border-slate-100" />
        <div className="divide-y divide-slate-100 p-4 space-y-3.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="pt-3.5 first:pt-0 flex items-center justify-between gap-4">
              <div className="h-4 w-20 rounded bg-slate-200" />
              <div className="h-4 w-28 rounded bg-slate-100" />
              <div className="h-4 flex-1 rounded bg-slate-100" />
              <div className="h-5 w-16 rounded-md bg-slate-100" />
              <div className="h-5 w-16 rounded-full bg-slate-100" />
              <div className="h-4 w-28 rounded bg-slate-100" />
              <div className="h-6 w-20 rounded bg-slate-100" />
            </div>
          ))}
        </div>
        <div className="h-12 bg-[#f8f9ff] border-t border-[#e5eeff] px-5 flex items-center justify-between">
          <div className="h-4 w-44 rounded bg-slate-200/70" />
          <div className="flex gap-1.5">
            <div className="h-8 w-16 rounded-lg bg-white border border-slate-200" />
            <div className="h-8 w-8 rounded-lg bg-[#00A2D2]/40" />
            <div className="h-8 w-16 rounded-lg bg-white border border-slate-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
