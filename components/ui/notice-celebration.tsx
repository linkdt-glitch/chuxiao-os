"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SuccessCelebration } from "@/components/ui/success-celebration";

/**
 * 全屏庆祝 overlay：当列表页 URL 带 ?notice=... 时显示 3 秒后自动消失。
 *
 * 跟 NoticeBanner 互补：
 *   - NoticeBanner: 顶部小横幅，持续显示
 *   - NoticeCelebration: 全屏大动画 + 烟花，仅触发一次 3 秒后消失
 *
 * 用法：
 *   <NoticeCelebration notice={params.notice} created={params.created} />
 */
export function NoticeCelebration({
  notice,
  created,
  title = "恭喜！",
  message
}: {
  /** URL ?notice=... 内容 */
  notice?: string;
  /** URL ?created=1 标记（旧 records page 用的） */
  created?: string;
  title?: string;
  message?: string;
}) {
  const router = useRouter();
  const trigger = Boolean(notice?.trim() || created);
  const [visible, setVisible] = useState(trigger);

  useEffect(() => {
    if (!trigger) return;
    const t = setTimeout(() => {
      setVisible(false);
      // 庆祝完之后清掉 query string（避免刷新又触发 + 让 banner 也消失）
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("notice");
        url.searchParams.delete("created");
        url.searchParams.delete("highlight");
        router.replace(url.pathname + (url.search || ""), { scroll: false });
      } catch {
        // ignore
      }
    }, 2400);
    return () => clearTimeout(t);
  }, [trigger, router]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      style={{
        background: "rgba(2,4,12,0.62)",
        backdropFilter: "blur(8px) saturate(1.1)"
      }}
      onClick={() => setVisible(false)}
    >
      <div className="w-full max-w-[420px]" onClick={(e) => e.stopPropagation()}>
        <SuccessCelebration
          title={title}
          message={message ?? notice ?? "已经保存成功了"}
        />
      </div>
    </div>
  );
}
