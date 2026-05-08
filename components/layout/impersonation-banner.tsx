import { Eye, LogOut } from "lucide-react";
import { exitImpersonationAction } from "@/app/(app)/actions";

/**
 * 顶部"查看模式"提示条 —— 只有创始人切换为成员身份时才显示。
 *
 * server component。父组件需要先调 getImpersonationState() 拿到状态，
 * 再决定要不要渲染这个 banner。
 */
export function ImpersonationBanner({
  realName,
  realEmail,
  currentName,
  currentRoleLabel
}: {
  realName: string;
  realEmail: string;
  currentName: string;
  currentRoleLabel: string;
}) {
  return (
    <div
      className="sticky top-14 z-[15] flex flex-col gap-2 px-3 py-2 text-xs text-amber-50 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:top-16"
      style={{
        background: "linear-gradient(90deg, rgba(180,83,9,0.92), rgba(120,53,15,0.92))",
        borderBottom: "1px solid rgba(252,211,77,0.45)",
        boxShadow: "0 2px 14px rgba(180,83,9,0.30)"
      }}
    >
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 shrink-0 text-amber-200" />
        <span className="leading-tight">
          <span className="font-semibold">查看模式</span>
          <span className="ml-2 text-amber-100/85">
            正在以 <span className="font-medium text-white">{currentName}</span>
            （{currentRoleLabel}）身份浏览，操作会被记录到该账号
          </span>
          <span className="ml-2 hidden font-mono text-[10px] text-amber-200/65 sm:inline">
            创始人：{realName} · {realEmail}
          </span>
        </span>
      </div>
      <form action={exitImpersonationAction} className="shrink-0">
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-md bg-amber-50/95 px-3 py-1.5 text-[11px] font-semibold text-amber-900 transition-colors hover:bg-white"
        >
          <LogOut className="h-3.5 w-3.5" />
          退出查看模式
        </button>
      </form>
    </div>
  );
}
