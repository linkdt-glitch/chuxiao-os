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
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)"
      }}
    >
      {/* hover 时变橙色描边 */}
      <span
        className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          border: "1px solid rgba(249,115,22,0.50)",
          background: "rgba(249,115,22,0.06)"
        }}
      />
      <ChevronLeft
        className="relative z-10 h-4 w-4 text-slate-600 transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:text-orange-600"
        strokeWidth={2.25}
      />
    </button>
  );
}
