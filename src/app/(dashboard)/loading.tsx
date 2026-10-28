export default function GenericDashboardRouteLoading() {
  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6 animate-pulse">
      <div className="space-y-2.5">
        <div className="h-8 w-60 rounded-xl bg-slate-200/90" />
        <div className="h-4 w-88 max-w-full rounded-lg bg-slate-200/60" />
      </div>
      <div className="bg-white rounded-2xl p-6 border border-slate-200/70 space-y-4 shadow-2xs">
        <div className="h-10 w-full rounded-xl bg-slate-100" />
        <div className="h-48 w-full rounded-xl bg-slate-50 border border-slate-100" />
        <div className="h-10 w-40 rounded-xl bg-[#00A2D2]/30" />
      </div>
    </div>
  );
}
