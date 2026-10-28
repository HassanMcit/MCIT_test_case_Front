export default function DashboardLoading() {
  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-1">
        <div className="space-y-2.5">
          <div className="h-5 w-48 rounded-md bg-[#bfe9ff]/50" />
          <div className="h-8 w-72 rounded-xl bg-slate-200/80" />
          <div className="h-4 w-96 max-w-full rounded-lg bg-slate-200/60" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-28 rounded-xl bg-white border border-slate-200/80" />
          <div className="h-9 w-36 rounded-xl bg-[#00A2D2]/30" />
        </div>
      </div>

      {/* 5 Primary KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-5 border border-slate-200/70 space-y-4 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-20 rounded bg-slate-200/80" />
              <div className="w-8 h-8 rounded-xl bg-slate-100" />
            </div>
            <div className="space-y-2.5">
              <div className="h-8 w-16 rounded-lg bg-slate-200" />
              <div className="h-2 w-full rounded-full bg-slate-100" />
            </div>
          </div>
        ))}
      </div>

      {/* Projects Breakdown Skeleton */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/70 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#eff4ff]" />
            <div className="space-y-1.5">
              <div className="h-4 w-52 rounded bg-slate-200" />
              <div className="h-3 w-72 max-w-full rounded bg-slate-100" />
            </div>
          </div>
          <div className="h-4 w-24 rounded bg-slate-100" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl p-4 bg-[#f8f9ff]/70 border border-slate-200/70 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-32 rounded bg-slate-200" />
                <div className="h-4 w-12 rounded bg-slate-200/70" />
              </div>
              <div className="grid grid-cols-4 gap-1.5 pt-2">
                {Array.from({ length: 4 }).map((__, j) => (
                  <div key={j} className="h-10 rounded-lg bg-white border border-slate-100" />
                ))}
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-200/70" />
            </div>
          ))}
        </div>
      </div>

      {/* Analytics 70/30 Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-slate-200/70 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="space-y-1.5">
              <div className="h-5 w-48 rounded bg-slate-200" />
              <div className="h-3 w-64 rounded bg-slate-100" />
            </div>
            <div className="flex gap-3">
              <div className="h-4 w-16 rounded bg-slate-100" />
              <div className="h-4 w-16 rounded bg-slate-100" />
            </div>
          </div>
          <div className="h-56 w-full rounded-xl bg-slate-50 border border-slate-100" />
        </div>
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-200/70 space-y-3.5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="h-5 w-36 rounded bg-slate-200" />
            <div className="h-5 w-16 rounded-full bg-rose-50" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex justify-between">
                <div className="h-3.5 w-20 rounded bg-slate-200" />
                <div className="h-3.5 w-12 rounded bg-slate-200" />
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200/70" />
            </div>
          ))}
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="h-9 w-72 rounded-xl bg-slate-100" />
          <div className="h-5 w-24 rounded bg-slate-100" />
        </div>
        <div className="divide-y divide-slate-100 p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="pt-3 first:pt-0 flex items-center justify-between gap-4">
              <div className="h-4 w-20 rounded bg-slate-200" />
              <div className="h-4 w-32 rounded bg-slate-100" />
              <div className="h-4 flex-1 rounded bg-slate-100" />
              <div className="h-5 w-16 rounded-full bg-slate-100" />
              <div className="h-4 w-24 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
