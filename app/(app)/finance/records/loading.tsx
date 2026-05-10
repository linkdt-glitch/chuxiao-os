/** 财务流水列表骨架屏 */
export default function RecordsLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="h-8 w-44 animate-pulse rounded-md bg-slate-200/70" />
        <div className="h-4 w-80 max-w-[80%] animate-pulse rounded-md bg-slate-200/50" />
      </div>
      {/* 筛选条 */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="h-12 animate-pulse rounded-lg border border-slate-200 bg-white" />
      {/* 表格 */}
      <div className="rounded-xl border border-slate-200 bg-white">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse border-b border-slate-100 last:border-b-0"
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
