"use client";

/**
 * AI 思考动画 v2 —— 脑电波 + 声纹 + 轨道粒子
 *
 * 视觉元素（在浅色卡片上）：
 *  - 中心 Sparkles 缓慢呼吸 + drop-shadow 暖光
 *  - 两道同心扩散光环（sonar），时差错开形成"脑电波"
 *  - 3 颗不同半径轨道粒子（速度/方向/大小都不同）
 *  - 底部 5 根音波条像 EQ 一样错位脉动
 *  - 文字短句循环切换，每次切换都有阶梯滑入动画
 *  - DotDot 加载省略号
 *
 * 用法：
 *   <AIThinking label="AI 正在光速思考" />              // 完整卡片
 *   <AIThinking variant="compact" />                   // 内联小尺寸
 *   <AIThinking variant="inline" />                    // 单行行内（仅文字）
 */

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

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
  label?: string;
  variant?: "card" | "compact" | "inline";
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
      <span className="inline-flex items-center gap-2 font-mono text-xs text-orange-600">
        <span className="relative inline-flex h-3 w-3">
          {/* 光晕 */}
          <span
            className="absolute inset-0 rounded-full bg-orange-400"
            style={{ animation: "ai-think-pulse 1.4s ease-in-out infinite" }}
          />
          <span
            className="absolute inset-0 rounded-full"
            style={{
              border: "1.5px solid rgba(249,115,22,0.55)",
              animation: "ai-think-ripple 1.6s ease-out infinite"
            }}
          />
        </span>
        <span
          key={phraseIndex}
          style={{ animation: "ai-think-text-in 320ms cubic-bezier(0.2,0.8,0.2,1) both" }}
        >
          {PHRASES[phraseIndex]}
        </span>
        <DotDot />
      </span>
    );
  }

  const isCompact = variant === "compact";
  const orbWrap = isCompact ? 88 : 112;
  const iconSize = isCompact ? 22 : 28;
  const containerPadding = isCompact ? "p-4" : "p-5";

  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl ${containerPadding}`}
      style={{
        background:
          "linear-gradient(180deg, rgba(254,247,237,0.95) 0%, rgba(255,255,255,0.92) 70%)",
        border: "1px solid rgba(249,115,22,0.22)",
        boxShadow:
          "0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -16px rgba(249,115,22,0.20)"
      }}
    >
      {/* 极淡背景光晕 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 35%, rgba(251,191,36,0.10) 0%, transparent 70%)"
        }}
      />

      {/* 中心 orbit + sparkles + sonar */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: orbWrap, height: orbWrap }}
      >
        {/* sonar 1 */}
        <span
          aria-hidden
          className="absolute rounded-full"
          style={{
            width: orbWrap * 0.7,
            height: orbWrap * 0.7,
            border: "1.5px solid rgba(249,115,22,0.30)",
            animation: "ai-think-ripple 2s ease-out infinite"
          }}
        />
        {/* sonar 2 (delay) */}
        <span
          aria-hidden
          className="absolute rounded-full"
          style={{
            width: orbWrap * 0.7,
            height: orbWrap * 0.7,
            border: "1.5px solid rgba(249,115,22,0.30)",
            animation: "ai-think-ripple 2s ease-out 0.9s infinite"
          }}
        />

        {/* 中心 Sparkles */}
        <div
          className="relative z-10 flex items-center justify-center rounded-full bg-orange-500"
          style={{
            width: iconSize + 16,
            height: iconSize + 16,
            boxShadow:
              "0 0 0 1px rgba(249,115,22,0.30), 0 4px 14px rgba(249,115,22,0.30)",
            animation: "ai-think-pulse 1.6s ease-in-out infinite"
          }}
        >
          <Sparkles
            className="text-white"
            style={{ width: iconSize, height: iconSize }}
          />
        </div>

        {/* 轨道粒子 — 3 颗，不同半径 / 方向 / 大小 */}
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 block rounded-full"
          style={{
            width: 6,
            height: 6,
            marginLeft: -3,
            marginTop: -3,
            background: "rgba(249,115,22,0.95)",
            boxShadow: "0 0 6px rgba(249,115,22,0.65)",
            animation: "ai-think-orbit-a 2.6s linear infinite"
          }}
        />
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 block rounded-full"
          style={{
            width: 4,
            height: 4,
            marginLeft: -2,
            marginTop: -2,
            background: "rgba(251,146,60,0.85)",
            boxShadow: "0 0 5px rgba(249,115,22,0.55)",
            animation: "ai-think-orbit-b 3.4s linear infinite reverse"
          }}
        />
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 block rounded-full"
          style={{
            width: 5,
            height: 5,
            marginLeft: -2.5,
            marginTop: -2.5,
            background: "rgba(251,191,36,0.85)",
            boxShadow: "0 0 6px rgba(251,191,36,0.55)",
            animation: "ai-think-orbit-c 4.2s linear infinite"
          }}
        />
      </div>

      {/* 标题 + 短句 */}
      <div className="relative z-10 flex flex-col items-center gap-1 text-center">
        <div className="text-[14px] font-semibold text-slate-900">
          {label ?? "AI 正在光速思考"}
        </div>
        <div
          key={phraseIndex}
          className="font-mono text-[12px] tracking-wide text-orange-600"
          style={{ animation: "ai-think-text-in 360ms cubic-bezier(0.2,0.8,0.2,1) both" }}
        >
          {PHRASES[phraseIndex]}
          <DotDot />
        </div>
      </div>

      {/* 音波 EQ 条 — 5 根错位反弹 */}
      <div className="relative z-10 flex h-5 items-end gap-1">
        <Bar delayMs={0} animName="ai-think-bar-1" duration="0.9s" />
        <Bar delayMs={120} animName="ai-think-bar-2" duration="1.1s" />
        <Bar delayMs={60} animName="ai-think-bar-3" duration="0.85s" />
        <Bar delayMs={180} animName="ai-think-bar-4" duration="1.0s" />
        <Bar delayMs={40} animName="ai-think-bar-5" duration="0.95s" />
      </div>

      {/* 已用 / 预计秒数（可选） */}
      {estimatedSeconds || elapsed > 0 ? (
        <div className="relative z-10 font-mono text-[11px] tabular-nums tracking-wider text-slate-500">
          已用 {elapsed}s
          {estimatedSeconds ? ` / 预计 ${estimatedSeconds}s` : ""}
        </div>
      ) : null}
    </div>
  );
}

function Bar({
  delayMs,
  animName,
  duration
}: {
  delayMs: number;
  animName: string;
  duration: string;
}) {
  return (
    <span
      className="block w-1 rounded-full"
      style={{
        height: 18,
        transformOrigin: "bottom",
        background: "linear-gradient(180deg, #fbbf24, #f97316)",
        animation: `${animName} ${duration} cubic-bezier(0.4, 0, 0.6, 1) ${delayMs}ms infinite`
      }}
    />
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
