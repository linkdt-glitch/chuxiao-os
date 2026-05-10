/** 老板驾驶舱骨架屏 —— 切到 /dashboard 立刻看到结构而不是空白 */
export default function DashboardLoading() {
  return (
    <div className="space-y-3">
      {/* Hero brief */}
      <div className="h-32 animate-pulse rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50/50" />
      {/* 3 hero metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
      {/* 6-month trend + 支出聚焦 */}
      <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
        <div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white" />
        <div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white" />
      </div>
      {/* 项目战力 */}
      <div className="grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
        ))}
      </div>
    </div>
  );
}
