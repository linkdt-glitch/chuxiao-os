"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * 返回键 — 暗色 sci-fi 风格
 * - 圆角方形（跟 logo / 卡片视觉语言一致）
 * - 暗色玻璃背景 + 橙色细描边 + 微 glow
 * - hover：图标轻微左移 + 边框加亮（提示"返回"动作）
 * - 箭头改用更细的 ChevronLeft（视觉更轻、更现代）
 */
export function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label="返回上一页"
      title="返回上一页"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push("/dashboard");
        }
      }}
      className="group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200 hover:scale-105"
      style={{
        background:
          "linear-gradient(135deg, rgba(12,18,36,0.85) 0%, rgba(7,12,24,0.90) 100%)",
        border: "1px solid rgba(249,115,22,0.28)",
        boxShadow:
          "0 0 12px rgba(249,115,22,0.10), inset 0 0 12px rgba(249,115,22,0.04), 0 4px 14px rgba(0,0,0,0.35)"
      }}
    >
      {/* hover 时显示的橙色发光描边 */}
      <span
        className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          border: "1px solid rgba(249,115,22,0.65)",
          boxShadow:
            "0 0 18px rgba(249,115,22,0.25), inset 0 0 14px rgba(249,115,22,0.10)"
        }}
      />
      <ChevronLeft
        className="relative z-10 h-4 w-4 text-orange-300 transition-transform duration-200 group-hover:-translate-x-0.5"
        strokeWidth={2.25}
      />
    </button>
  );
}
