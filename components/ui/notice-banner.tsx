import { AlertTriangle, CheckCircle2 } from "lucide-react";

/**
 * Inline notice banner — 列表页用来显示来自 server action 的
 * `?error=...` / `?notice=...` query param。
 *
 * - error: 红色，AlertTriangle 图标
 * - notice: 绿色，CheckCircle2 图标
 *
 * 用法：
 *   <NoticeBanner error={params.error} notice={params.notice} />
 */
export function NoticeBanner({
  error,
  notice
}: {
  error?: string;
  notice?: string;
}) {
  return (
    <>
      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <div>
            <div className="font-medium">操作失败</div>
            <div className="mt-0.5 text-rose-700/90">{error}</div>
          </div>
        </div>
      ) : null}
      {notice ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{notice}</span>
        </div>
      ) : null}
    </>
  );
}
