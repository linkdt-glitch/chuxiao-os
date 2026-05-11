/**
 * /finance/categories 骨架屏 —— 让类目管理页瞬间出现框架结构。
 */
export default function FinanceCategoriesLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="h-8 w-40 animate-pulse rounded-md bg-slate-200/70" />
        <div className="h-4 w-80 max-w-[70%] animate-pulse rounded-md bg-slate-200/50" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-lg border border-slate-200 bg-white"
            style={{ animationDelay: `${i * 40}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
