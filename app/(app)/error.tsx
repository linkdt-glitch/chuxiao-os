"use client";

import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * (app) 路由的错误边界。
 *
 * 设计：
 *   - 之前只有「页面加载失败 + 重试」，员工碰到错误只能猜什么坏了
 *   - 现在：展示真实错误信息 + 提供 3 个明确出路（重试 / 回首页 / 联系老板）
 *   - 服务端错误带 digest（错误指纹），出问题时让员工把这串字符发给老板，
 *     可以在 Render Logs 里直接搜到对应错误堆栈
 */
export default function ErrorPage({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // 友好化常见错误信息
  const friendlyMessage = (() => {
    const msg = error.message || "";
    if (msg.includes("PGRST116") || msg.includes("0 rows")) {
      return "数据查询返回空结果 —— 可能是权限不足或记录已被删除。";
    }
    if (msg.includes("PGRST301") || msg.includes("policy")) {
      return "你没有权限访问这条数据。";
    }
    if (msg.includes("network") || msg.includes("fetch failed")) {
      return "网络连接异常 —— 检查一下网络后重试。";
    }
    if (msg.includes("timeout")) {
      return "请求超时 —— 可能后端在重启，等 10 秒再试。";
    }
    if (msg.length > 0 && msg.length < 200) {
      return msg;
    }
    return "页面遇到了一个错误，请刷新重试。";
  })();

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-rose-600" />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-rose-900">出错了</h2>
          <p className="mt-2 text-sm text-rose-800">{friendlyMessage}</p>
          {error.digest ? (
            <p className="mt-3 font-mono text-[11px] text-rose-700/70">
              错误编号：{error.digest}
              <span className="ml-2 text-rose-600/60">（把这串发给管理员可快速定位问题）</span>
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={reset}>
          <RefreshCw className="h-4 w-4" />
          重试
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <Home className="h-4 w-4" />
            回首页
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/finance">回财务中心</Link>
        </Button>
      </div>
    </div>
  );
}
