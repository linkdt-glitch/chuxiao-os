/**
 * /finance 路由的骨架屏 —— Next.js 15 路由切换时的瞬时反馈，
 * 避免「点了菜单但屏幕停了 1 秒不动」的感觉。
 *
 * 占位结构匹配 finance/page.tsx 的真实布局：
 *   PageHeader + 4 个 KPI 卡 + 经营洞察板 + 底部按钮卡
 */
export default function FinanceLoading() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-56 animate-pulse rounded-md bg-slate-200/70" />
        <div className="h-4 w-96 max-w-[80%] animate-pulse rounded-md bg-slate-200/50" />
      </div>

      {/* 4 KPI 卡 */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>

      {/* 经营洞察 */}
      <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />

      {/* 底部入口卡 */}
      <div className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />
    </div>
  );
}
