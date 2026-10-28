export default function ProjectsLoading() {
  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-56 rounded-xl bg-slate-200/90" />
          <div className="h-4 w-80 max-w-full rounded-lg bg-slate-200/60" />
        </div>
        <div className="h-10 w-36 rounded-xl bg-[#00A2D2]/30" />
      </div>

      {/* KPI Strip Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-4 border border-slate-200/70 space-y-2.5 shadow-2xs"
          >
            <div className="h-3.5 w-24 rounded bg-slate-200/80" />
            <div className="h-7 w-16 rounded-lg bg-slate-200" />
          </div>
        ))}
      </div>

      {/* Filter Toolbar Skeleton */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/70 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="h-10 w-72 max-w-full rounded-xl bg-slate-100" />
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 rounded-xl bg-slate-100" />
          <div className="h-9 w-20 rounded-xl bg-slate-100" />
        </div>
      </div>

      {/* Project Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-5 border border-slate-200/70 space-y-4 shadow-2xs"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#eff4ff]" />
                <div className="space-y-1.5">
                  <div className="h-4 w-40 rounded bg-slate-200" />
                  <div className="h-3.5 w-24 rounded bg-indigo-50" />
                </div>
              </div>
              <div className="h-5 w-16 rounded-full bg-slate-100" />
            </div>
            <div className="h-3.5 w-full rounded bg-slate-100" />
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="h-12 rounded-xl bg-slate-50 border border-slate-100" />
              <div className="h-12 rounded-xl bg-emerald-50/50 border border-emerald-100/60" />
              <div className="h-12 rounded-xl bg-rose-50/50 border border-rose-100/60" />
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100" />
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="h-7 w-24 rounded-lg bg-slate-100" />
              <div className="h-8 w-28 rounded-xl bg-emerald-50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
