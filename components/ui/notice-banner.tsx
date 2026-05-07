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
        <div
          className="mb-4 flex items-start gap-2 rounded-lg p-3 text-sm text-red-200"
          style={{
            background: "rgba(239,68,68,0.10)",
            border: "1px solid rgba(239,68,68,0.32)",
            boxShadow: "0 0 14px rgba(239,68,68,0.10)"
          }}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
          <div>
            <div className="font-medium text-red-200">操作失败</div>
            <div className="mt-0.5 text-red-200/85">{error}</div>
          </div>
        </div>
      ) : null}
      {notice ? (
        <div
          className="mb-4 flex items-center gap-2 rounded-lg p-3 text-sm text-emerald-300"
          style={{
            background: "rgba(16,185,129,0.10)",
            border: "1px solid rgba(16,185,129,0.32)",
            boxShadow: "0 0 14px rgba(16,185,129,0.10)"
          }}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{notice}</span>
        </div>
      ) : null}
    </>
  );
}
