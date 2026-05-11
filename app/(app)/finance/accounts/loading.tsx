/**
 * /finance/accounts 骨架屏 —— 让账户管理页面瞬间显示框架，
 * 不要让 HK/SZ 员工对着白屏等 Render→Supabase 往返。
 */
export default function FinanceAccountsLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="h-8 w-40 animate-pulse rounded-md bg-slate-200/70" />
        <div className="h-4 w-80 max-w-[70%] animate-pulse rounded-md bg-slate-200/50" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
