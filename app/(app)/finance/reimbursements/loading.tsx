/** 报销审批工作台骨架屏 */
export default function ReimbursementsLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="h-8 w-44 animate-pulse rounded-md bg-slate-200/70" />
        <div className="h-4 w-96 max-w-[80%] animate-pulse rounded-md bg-slate-200/50" />
      </div>
      {/* 4 KPI */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />
        ))}
      </div>
      {/* 工作台主体 */}
      <div className="h-[440px] animate-pulse rounded-xl border border-slate-200 bg-white" />
    </div>
  );
}
