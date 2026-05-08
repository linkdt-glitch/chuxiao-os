"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

/**
 * AI 思考中等待动画 — 平面简约风格。
 *
 * 视觉元素（极简）：
 *  - 中央 Sparkles 图标 + 柔和呼吸光晕
 *  - 文字循环切换"光速思考中" → "调用全部脑细胞" → ...
 *  - 一根 shimmer 进度条
 *
 * 用法：
 *   {loading ? <AIThinking label="AI 解析中" /> : null}
 *   {loading ? <AIThinking variant="compact" /> : null}  // 内联小尺寸
 *   {loading ? <AIThinking variant="inline" /> : null}   // 单行行内
 */

const PHRASES = [
  "光速思考中",
  "调用全部脑细胞",
  "组合最佳答案",
  "拼成最准的回复"
];

export function AIThinking({
  label,
  variant = "card",
  estimatedSeconds
}: {
  /** 顶部主标题，比如"AI 解析记账中" / "AI 思考中"。默认"AI 思考中"。 */
  label?: string;
  /** card：完整卡片（默认）；compact：内联小尺寸；inline：单行 */
  variant?: "card" | "compact" | "inline";
  /** 预估秒数显示（如 6 / 12 / 20） */
  estimatedSeconds?: number;
}) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const phraseTimer = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % PHRASES.length);
    }, 1800);
    const elapsedTimer = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);
    return () => {
      clearInterval(phraseTimer);
      clearInterval(elapsedTimer);
    };
  }, []);

  if (variant === "inline") {
    return (
      <span className="inline-flex items-center gap-2 font-mono text-xs text-orange-500">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{
            background: "rgba(249,115,22,0.85)",
            animation: "wo-logo-glow 1.4s ease-in-out infinite"
          }}
        />
        {PHRASES[phraseIndex]}
        <DotDot />
      </span>
    );
  }

  const iconSize = variant === "compact" ? 28 : 36;
  const containerPadding = variant === "compact" ? "p-4" : "p-6";

  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-3 rounded-xl ${containerPadding}`}
      style={{
        background: "rgba(249,115,22,0.04)",
        border: "1px solid rgba(249,115,22,0.18)"
      }}
    >
      {/* 中央图标 + 柔和呼吸光晕 */}
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: iconSize + 16,
          height: iconSize + 16,
          background: "rgba(249,115,22,0.10)",
          animation: "wo-logo-glow 1.8s ease-in-out infinite"
        }}
      >
        <Sparkles
          className="text-orange-500"
          style={{ width: iconSize, height: iconSize }}
        />
      </div>

      {/* 标题 + 循环短句 */}
      <div className="flex flex-col items-center gap-1 text-center">
        <div className="text-sm font-semibold text-slate-700">
          {label ?? "AI 思考中"}
        </div>
        <div
          key={phraseIndex}
          className="text-xs text-orange-600/85"
          style={{ animation: "wo-text-in 350ms cubic-bezier(0.2,0.8,0.2,1) both" }}
        >
          {PHRASES[phraseIndex]}
          <DotDot />
        </div>
        {estimatedSeconds || elapsed > 0 ? (
          <div className="mt-0.5 font-mono text-[10px] tracking-wider text-slate-400">
            已用 {elapsed}s
            {estimatedSeconds ? ` / 预计 ${estimatedSeconds}s` : ""}
          </div>
        ) : null}
      </div>

      {/* 进度 shimmer 条 */}
      <div
        className="relative h-1 w-32 overflow-hidden rounded-full"
        style={{ background: "rgba(249,115,22,0.10)" }}
      >
        <div
          className="absolute h-full"
          style={{
            width: "40%",
            background:
              "linear-gradient(90deg, transparent, rgba(249,115,22,0.85), transparent)",
            animation: "wo-shimmer 1.4s cubic-bezier(0.4,0,0.2,1) infinite"
          }}
        />
      </div>
    </div>
  );
}

function DotDot() {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const t = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 350);
    return () => clearInterval(t);
  }, []);
  return <span className="inline-block w-3">{dots}</span>;
}
